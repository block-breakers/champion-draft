// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import "openzeppelin-contracts/contracts/utils/introspection/IERC165.sol";
import "openzeppelin-contracts/contracts/token/ERC721/extensions/IERC721Metadata.sol";
import "./Messenger.sol";

import "forge-std/console.sol";

struct ChampionStats {
    uint32 attack;
    uint32 defense;
    uint32 speed;
    uint32 crit_rate;
    uint32 level;
    uint32 xp;
    uint32 upgradePoints;
}

struct AudienceVotes {
    uint32 attack;
    uint32 defense;
    uint32 speed;
    uint32 crit_rate;
}

struct Champion {
    uint256 championHash;
    address owner;
    string uri;
    uint64 vaaSeq;
    uint32 round;
    ChampionStats stats;
    AudienceVotes votes;
}

struct BattleOutcome {
    uint256 winnerHash;
    uint256 loserHash;
    uint32 winnerXP;
    uint32 loserXP;
    uint timestamp;
}

contract CoreGame {
    // current max turns allowed: 15
    uint256 constant TURNS = 10;
    // round length is 5 minutes
    uint256 constant ROUND_LENGTH = 300;
    uint256 nonce = 0;
    // mapping from champion hash to champion
    mapping(uint256 => Champion) public champions;
    mapping(uint256 => mapping(bytes32 => bool)) championsClaimedXP;
    Messenger public messenger;
    uint32 public curRound;
    uint256 public roundStart;
    address owner;

    event battleEvent(uint256 damageByHash, uint256 damage);
    event battleOutcome(uint256 winnerHash, uint256 loserHash, uint64 vaa);
    event championRegistered(uint256 championHash);
    event randomNum(bytes32 rand);

    enum ActionType {
        BATTLE,
        UPGRADE,
        REGISTER
    }

    modifier onlyOwner() {
        require(
            msg.sender == owner,
            "You must be the owner of the contract to modify rounds!"
        );
        _;
    }

    modifier checkRounds(ActionType r) {
        if (block.timestamp < roundStart) {
            revert(
                "You are not allowed to perform actions outside the play time."
            );
        }
        uint256 timePassed = block.timestamp - roundStart;
        if (timePassed > ROUND_LENGTH) {
            curRound += uint32(timePassed / ROUND_LENGTH);
            roundStart = block.timestamp;
        }
        if (r == ActionType.REGISTER) {
            _;
        } else {
            // even round means battling round
            if (curRound % 2 == 0 && r != ActionType.BATTLE) {
                // upgrade round, not allowed to battle
                revert(
                    "You are not allowed to upgrade champions during battle round."
                );
            }
            // odd round means upgrade round
            if (curRound % 2 == 1 && r != ActionType.UPGRADE) {
                // upgrade round, not allowed to battle
                revert(
                    "You are not allowed to battle champions during upgrade round."
                );
            }
            _;
        }
    }

    constructor(address _wormhole_core_bridge_address) {
        messenger = new Messenger(_wormhole_core_bridge_address);
        curRound = 0;
        roundStart = block.timestamp;
        owner = msg.sender;
    }

    function setRoundStart(uint256 newStart) public onlyOwner {
        require(
            block.timestamp < newStart,
            "The round must start after the current time."
        );
        roundStart = newStart;
        curRound = 0;
    }

    function setRound(uint32 round) public onlyOwner {
        curRound = round;
        roundStart = block.timestamp;
    }

    function getMessengerAddr() public view returns (address) {
        return address(messenger);
    }

    /**
    
    Returns uint: the champion hash
     */
    function registerNFT(address _erc721Contract, uint256 _nft)
        public
        checkRounds(ActionType.REGISTER)
        returns (uint256)
    {
        // require nft collection to support metadata IERC721 metadata extension
        require(
            IERC165(_erc721Contract).supportsInterface(0x5b5e139f),
            "NFT collection does not support metadata."
        );

        // assert ownership
        IERC721Metadata nftCollection = IERC721Metadata(_erc721Contract);
        require(
            nftCollection.ownerOf(_nft) == msg.sender,
            "You do not own this NFT"
        );

        string memory _uri = nftCollection.tokenURI(_nft);

        bytes32 myChampionHash = getChampionHash(_erc721Contract, _nft);
        // assert that the nft has not been registered yet
        require(
            champions[uint256(myChampionHash)].championHash !=
                uint256(myChampionHash),
            "NFT is already registered"
        );

        Champion memory champion;
        champion.championHash = uint256(myChampionHash);
        champion.owner = msg.sender;
        champion.uri = _uri;
        champion.round = curRound;

        ChampionStats memory championStats;
        championStats.attack = byteToUint32(myChampionHash[31] & 0x0F) / 2 + 5;
        championStats.defense =
            byteToUint32((myChampionHash[31] >> 4) & 0x0F) /
            5 +
            1;
        championStats.speed = byteToUint32(myChampionHash[30] & 0x0F) + 1;
        championStats.crit_rate =
            byteToUint32((myChampionHash[30] >> 4) & 0x0F) +
            10;
        championStats.level = 1;
        championStats.upgradePoints = 1;

        champion.stats = championStats;

        bytes memory b = mintIdVaa(champion);
        // emit IdVAA(b);
        uint64 seq = messenger.sendMsg(b);
        champion.vaaSeq = seq;
        champions[champion.championHash] = champion;

        emit championRegistered(champion.championHash);
        return champion.championHash;
    }

    function crossChainBattle(uint256 myChampionHash, bytes memory encodedMsg)
        public
        checkRounds(ActionType.BATTLE)
    {
        string memory payload;
        try messenger.receiveEncodedMsg(encodedMsg) returns (string memory p) {
            payload = p;
        } catch {
            revert("Unable to receive encoded message vaa.");
        }

        Champion memory me = champions[myChampionHash];
        Champion memory opponent = decodeIdVaa(bytes(payload));

        bytes32 random = rand(msg.sender);

        battle(me, opponent, random);
    }

    function nativeChainBattle(
        uint256 myChampionHash,
        uint256 opponentChampionHash
    ) public checkRounds(ActionType.BATTLE) {
        Champion memory me = champions[myChampionHash];
        Champion memory opponent = champions[opponentChampionHash];

        bytes32 random = rand(msg.sender);
        emit randomNum(random);
        battle(me, opponent, random);
    }

    function battle(
        Champion memory a,
        Champion memory b,
        bytes32 random
    ) private {
        ChampionStats memory aStats = a.stats;
        ChampionStats memory bStats = b.stats;
        if (a.round + 1 < curRound || b.round + 1 < curRound) {
            // trying to fight an outdated champion
            revert("Not allowed to fight an outdated champion");
        }
        if (
            (aStats.level > bStats.level && aStats.level - bStats.level > 3) ||
            (bStats.level > aStats.level && bStats.level - aStats.level > 3)
        ) {
            revert(
                "Not allowed to battle champion with greater than 3 level difference."
            );
        }

        uint256 damageByA;
        uint256 damageByB;

        // idea: use 1 byte (0-255) as random. determine the threshold for event to trigger
        uint32 a_threshold_to_hit = (aStats.speed * 0xff) / (aStats.speed + bStats.speed);

        uint32 a_threshold_to_crit = (aStats.speed * 0xff) / 100;
        uint32 b_threshold_to_crit = (bStats.speed * 0xff) / 100;

        for (uint256 i = 0; i < TURNS; i++) {
            if (byteToUint32(random[i]) < a_threshold_to_hit) {
                // a successful hit
                uint256 damage;

                // damage multiplier is a random number between 257 and 512
                uint32 damageMultiplier = byteToUint32(rand(msg.sender)[31]) +
                    257;
                if (byteToUint32(random[31 - i]) < a_threshold_to_crit) {
                    damage =
                        (aStats.attack * 2 * damageMultiplier) /
                        bStats.defense /
                        512;
                } else {
                    damage = (aStats.attack * damageMultiplier) / bStats.defense / 512;
                }

                emit battleEvent(a.championHash, damage);
                damageByA += damage;
            } else {
                // b successful hit
                uint256 damage;
                uint32 damageMultiplier = byteToUint32(rand(msg.sender)[31]) +
                    257;

                if (byteToUint32(random[31 - i]) < b_threshold_to_crit) {
                    damage =
                        (bStats.attack * 2 * damageMultiplier) /
                        aStats.defense /
                        512;
                } else {
                    damage = (bStats.attack * damageMultiplier) / aStats.defense / 512;
                }

                emit battleEvent(b.championHash, damage);
                damageByB += damage;
            }
        }

        BattleOutcome memory outcome;
        if (damageByA > damageByB) {
            outcome.winnerHash = a.championHash;
            outcome.loserHash = b.championHash;

            outcome.winnerXP = uint32(
                (damageByA * 50) /
                    (damageByA + damageByB)
            );
        } else {
            outcome.winnerHash = b.championHash;
            outcome.loserHash = a.championHash;
            outcome.winnerXP = uint32(
                (damageByB * 50) /
                    (damageByA + damageByB)
            );

        }
        
        outcome.loserXP = 100 - outcome.winnerXP;
        outcome.winnerXP += 25; // bonus for winning
        outcome.timestamp = block.timestamp;

        bytes memory encodedOutcome = abi.encode(outcome);
        uint64 seq = messenger.sendMsg(encodedOutcome);

        emit battleOutcome(outcome.winnerHash, outcome.loserHash, seq);
    }

    function claimXP(uint256 myChampionHash, bytes memory encodedMsg)
        public
        checkRounds(ActionType.REGISTER)
    {
        (string memory payload, bytes32 vm_hash) = messenger
            .receiveEncodedMsgOnce(encodedMsg);

        BattleOutcome memory b = abi.decode(bytes(payload), (BattleOutcome));

        if (
            !(b.winnerHash == myChampionHash ||
                b.loserHash == myChampionHash)
        ) {
            revert(
                "The champion you entered is not impacted from this battle."
            );
        }

        if (championsClaimedXP[myChampionHash][vm_hash]) {
            revert("This champion has already claimed the XP for the battle.");
        }

        championsClaimedXP[myChampionHash][vm_hash] = true;
        ChampionStats storage myChampionStats = champions[myChampionHash].stats;
        if (myChampionHash == b.winnerHash) {
            myChampionStats.xp += b.winnerXP;
        } else {
            myChampionStats.xp += b.loserXP;
        }

        while (myChampionStats.xp >= requiredXPtoLevelUp(myChampionStats.level)) {
            myChampionStats.xp -= requiredXPtoLevelUp(myChampionStats.level);
            myChampionStats.level += 1;
            myChampionStats.upgradePoints += 1;
        }
    }

    struct AudienceMember {
        uint currentDraft;
        uint timestamp;
        uint points;
    }

    mapping (address => AudienceMember) audience;
    mapping (address => mapping(bytes32 => bool)) audienceClaimedPoints;

    function registerAudienceMember(uint _currentDraft) public {
        AudienceMember memory newMember;
        newMember.currentDraft = _currentDraft;
        newMember.timestamp = block.timestamp;
        audience[msg.sender] = newMember;
    }

    function changeAudienceDraft(uint _newDraft) public {
        AudienceMember storage me = audience[msg.sender];
        me.currentDraft = _newDraft;
        me.timestamp = block.timestamp;

        // TODO: Points are reset to zero. Future feature, user retains points from previous champions drafted.
        me.points = 0;
    }

    function audienceClaimPoints(bytes memory vaa) public {
        (string memory payload, bytes32 vm_hash) = messenger
            .receiveEncodedMsgOnce(vaa);

        if (audienceClaimedPoints[msg.sender][vm_hash]) {
            revert("You have already claimed the points for the battle.");
        }

        BattleOutcome memory b = abi.decode(bytes(payload), (BattleOutcome));

        AudienceMember storage me = audience[msg.sender];

        if (
            !(b.winnerHash == me.currentDraft ||
                b.loserHash == me.currentDraft)
        ) {
            revert(
                "You are not impacted from this battle."
            );
        }

        if (me.timestamp > b.timestamp) {
            // if I drafted the champion after the battle happened
            revert("You drafted the champion after the battle happened.");
        }

        audienceClaimedPoints[msg.sender][vm_hash] = true;
        me.points += 1;
    }

    function audienceSubmitVote(uint8 choice) public {
        AudienceMember storage me = audience[msg.sender];

        uint myDraftHash = me.currentDraft;

        if (me.points == 0) {
            revert("You don't have enough points to perform this action.");
        }
        if (choice > 4) {
            revert("Invalid choice.");
        }
        if ((getUpgrades(myDraftHash) >> (4 - choice)) & 0x01 == 0) {
            revert(
                "You are not allowed to vote for that stat. See getUpgrades for available upgrades."
            );
        }

        AudienceVotes storage votes = champions[myDraftHash].votes;

        if (choice == 1) {
            votes.attack += 5;
        } else if (choice == 2) {
            votes.defense += 2;
        } else if (choice == 3) {
            votes.speed += 5;
        } else {
            votes.crit_rate += 8;
        }

        me.points -= 1;
    }

    /**
    choice will be either 1,2,3,4 representing attack, defense, speed, crit rate respectfully
     */
    function upgrade(uint256 myChampionHash, uint8 choice)
        public
        checkRounds(ActionType.UPGRADE)
    {
        Champion storage myChampion = champions[myChampionHash];
        require(myChampion.owner == msg.sender);

        if (myChampion.stats.upgradePoints == 0) {
            revert("Your champion does not have any upgrade points.");
        }
        if (choice > 4) {
            revert("Invalid choice.");
        }
        if ((getUpgrades(myChampionHash) >> (4 - choice)) & 0x01 == 0) {
            revert(
                "You are not allowed to upgrade that stat. See getUpgrades for available upgrades."
            );
        }

        ChampionStats storage stats = myChampion.stats;

        if (choice == 1) {
            stats.attack += 5;
        } else if (choice == 2) {
            stats.defense += 2;
        } else if (choice == 3) {
            stats.speed += 5;
        } else {
            stats.crit_rate += 8;
        }

        stats.upgradePoints -= 1;
    }

    function optIn(uint256 myChampionHash) public checkRounds(ActionType.REGISTER) {
        Champion storage myChampion = champions[myChampionHash];
        require(myChampion.owner == msg.sender);

        myChampion.round = curRound+1;
        bytes memory b = mintIdVaa(myChampion);
        uint64 seq = messenger.sendMsg(b);
        myChampion.vaaSeq = seq;
    }

    function getUpgrades(uint256 myChampionHash) public view returns (uint8) {
        Champion memory myChampion = champions[myChampionHash];

        if (myChampion.owner == address(0)) {
            return 0;
        }

        uint32 curUpgradeLocation = myChampion.stats.level - myChampion.stats.upgradePoints;

        bytes memory hashBytes = abi.encodePacked(myChampionHash);
        if (curUpgradeLocation % 2 == 0) {
            return uint8(hashBytes[curUpgradeLocation / 2] >> 4) & 0xf;
        } else {
            return uint8(hashBytes[curUpgradeLocation / 2]) & 0xf;
        }
    }

    function requiredXPtoLevelUp(uint32 level) private pure returns (uint32) {
        if (level == 63) return 100000000;
        return level * 100;
    }

    function getStats(uint256 myChampionHash)
        public
        view
        returns (
            uint32,
            uint32,
            uint32,
            uint32
        )
    {
        ChampionStats memory me = champions[myChampionHash].stats;
        return (me.attack, me.defense, me.speed, me.crit_rate);
    }

    function getTimeLeftInRound() public view returns (uint32) {
        uint timePassed = block.timestamp - roundStart;
        if (timePassed >= ROUND_LENGTH) {
            return 0;
        }
        return uint32(ROUND_LENGTH - timePassed);
    }

    /**
    Generates a random number from [0, n-1]. Security attack: another contract can implement this method and call 
    this method at the same time they submit a battle to determine the random number. 
     */
    function rand(address msg_sender) private returns (bytes32) {
        nonce += 1;
        return
            keccak256(
                abi.encodePacked(
                    block.timestamp +
                        block.difficulty +
                        ((
                            uint256(keccak256(abi.encodePacked(block.coinbase)))
                        ) / (block.timestamp)) +
                        block.gaslimit +
                        ((uint256(keccak256(abi.encodePacked(msg_sender)))) /
                            (block.timestamp)) +
                        block.number +
                        nonce
                )
            );
    }

    function getChampionHash(address _erc721Contract, uint256 _nft)
        public
        pure
        returns (bytes32)
    {
        return championHash(abi.encodePacked(_erc721Contract, _nft));
    }

    function championHash(bytes memory c) private pure returns (bytes32) {
        return sha256(c);
    }

    // TODO: make function private after testing
    function mintIdVaa(Champion memory c) private pure returns (bytes memory) {
        return abi.encode(c);
    }

    function decodeIdVaa(bytes memory b)
        private
        pure
        returns (Champion memory c)
    {
        c = abi.decode(b, (Champion));
    }

    function byteToUint32(bytes1 b) private pure returns (uint32) {
        return uint32(uint8(b));
    }
}
