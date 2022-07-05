// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import "openzeppelin-contracts/contracts/utils/introspection/IERC165.sol";
import "openzeppelin-contracts/contracts/token/ERC721/extensions/IERC721Metadata.sol";
import "./Messenger.sol";

import "forge-std/console.sol";

struct Champion {
    uint256 championHash;
    address owner;
    string uri;
    uint32 attack;
    uint32 defense;
    uint32 speed;
    uint32 crit_rate;
    uint32 level;
    uint32 xp;
    uint32 upgradePoints;
    uint64 vaaSeq;
    uint32 round;
}

struct BattleOutcome {
    uint256 championHashA;
    uint256 championHashB;
    uint256 winner;
    uint32 winnerXP;
    uint32 loserXP;
    // timestamp
}

contract CoreGame {
    // current max turns allowed: 15
    uint256 constant TURNS = 10;
    // round length is 5 minutes
    uint256 constant ROUND_LENGTH = 60;
    uint256 nonce = 0;
    // mapping from champion hash to champion
    mapping(uint256 => Champion) public champions;
    mapping(uint256 => mapping(bytes32 => bool)) championsClaimedXP;
    Messenger public messenger;
    uint32 public curRound;
    uint256 public roundStart;
    address owner;

    event battleEvent(uint256 damageByHash, uint256 damage);
    event battleOutcome(uint256 winnerHash, uint256 loserHash);
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
        champion.attack = byteToUint32(myChampionHash[31] & 0x0F) / 2 + 5;
        champion.defense =
            byteToUint32((myChampionHash[31] >> 4) & 0x0F) /
            5 +
            1;
        champion.speed = byteToUint32(myChampionHash[30] & 0x0F) + 1;
        champion.crit_rate =
            byteToUint32((myChampionHash[30] >> 4) & 0x0F) +
            10;
        champion.level = 1;
        champion.upgradePoints = 1;
        champion.round = curRound;

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
        if (a.round + 1 < curRound || b.round + 1 < curRound) {
            // trying to fight an outdated champion
            revert("Not allowed to fight an outdated champion");
        }
        if (
            (a.level > b.level && a.level - b.level > 3) ||
            (b.level > a.level && b.level - a.level > 3)
        ) {
            revert(
                "Not allowed to battle champion with greater than 3 level difference."
            );
        }

        uint256 damageByA;
        uint256 damageByB;

        // idea: use 1 byte (0-255) as random. determine the threshold for event to trigger
        uint32 a_threshold_to_hit = (a.speed * 0xff) / (a.speed + b.speed);

        uint32 a_threshold_to_crit = (a.speed * 0xff) / 100;
        uint32 b_threshold_to_crit = (b.speed * 0xff) / 100;

        for (uint256 i = 0; i < TURNS; i++) {
            if (byteToUint32(random[i]) < a_threshold_to_hit) {
                // a successful hit
                uint256 damage;

                // damage multiplier is a random number between 257 and 512
                uint32 damageMultiplier = byteToUint32(rand(msg.sender)[31]) +
                    257;
                if (byteToUint32(random[31 - i]) < a_threshold_to_crit) {
                    damage =
                        (a.attack * 2 * damageMultiplier) /
                        b.defense /
                        512;
                } else {
                    damage = (a.attack * damageMultiplier) / b.defense / 512;
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
                        (b.attack * 2 * damageMultiplier) /
                        a.defense /
                        512;
                } else {
                    damage = (b.attack * damageMultiplier) / a.defense / 512;
                }

                emit battleEvent(b.championHash, damage);
                damageByB += damage;
            }
        }

        BattleOutcome memory outcome;
        outcome.championHashA = a.championHash;
        outcome.championHashB = b.championHash;
        outcome.winnerXP = uint32(
            (damageByA * 50) /
                (damageByA + damageByB) +
                25 +
                4 *
                (b.level - a.level)
        );
        if (damageByA > damageByB) {
            outcome.winner = a.championHash;
            emit battleOutcome(a.championHash, b.championHash);
        } else {
            outcome.winner = b.championHash;
            emit battleOutcome(b.championHash, a.championHash);
        }
        outcome.loserXP = 100 - outcome.winnerXP;
        outcome.winnerXP += 25; // bonus for winning

        bytes memory encodedOutcome = abi.encode(outcome);
        messenger.sendMsg(encodedOutcome);
    }

    function claimXP(uint256 myChampionHash, bytes memory encodedMsg)
        public
        checkRounds(ActionType.UPGRADE)
    {
        (string memory payload, bytes32 vm_hash) = messenger
            .receiveEncodedMsgOnce(encodedMsg);

        BattleOutcome memory b = abi.decode(bytes(payload), (BattleOutcome));

        if (
            !(b.championHashA == myChampionHash ||
                b.championHashB == myChampionHash)
        ) {
            revert(
                "The champion you entered is not impacted from this battle."
            );
        }

        if (championsClaimedXP[myChampionHash][vm_hash]) {
            revert("This champion has already claimed the XP for the battle.");
        }

        championsClaimedXP[myChampionHash][vm_hash] = true;
        Champion storage myChampion = champions[myChampionHash];
        if (myChampionHash == b.winner) {
            myChampion.xp += b.winnerXP;
        } else {
            myChampion.xp += b.loserXP;
        }

        while (myChampion.xp >= requiredXPtoLevelUp(myChampion.level)) {
            myChampion.xp -= requiredXPtoLevelUp(myChampion.level);
            myChampion.level += 1;
            myChampion.upgradePoints += 1;
        }
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

        if (myChampion.upgradePoints == 0) {
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

        if (choice == 1) {
            myChampion.attack += 5;
        } else if (choice == 2) {
            myChampion.defense += 2;
        } else if (choice == 3) {
            myChampion.speed += 5;
        } else {
            myChampion.crit_rate += 8;
        }

        myChampion.upgradePoints -= 1;
    }

    function getUpgrades(uint256 myChampionHash) public view returns (uint8) {
        Champion memory myChampion = champions[myChampionHash];

        uint32 curUpgradeLocation = myChampion.level - myChampion.upgradePoints;

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
        Champion memory me = champions[myChampionHash];
        return (me.attack, me.defense, me.speed, me.crit_rate);
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
