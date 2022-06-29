// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import "openzeppelin-contracts/contracts/utils/introspection/IERC165.sol";
import "openzeppelin-contracts/contracts/token/ERC721/extensions/IERC721Metadata.sol";
import "./Messenger.sol";

struct Champion {
    uint championHash;
	string uri;
    uint32 attack;
    uint32 defense;
    uint32 speed;
    uint32 crit_rate;
    uint32 level;
    uint64 vaaSeq;
}

contract CoreGame {
    // current max rounds allowed: 15
    uint constant ROUNDS = 10;
    uint nonce = 0;
    // mapping from champion hash to champion
    mapping (uint => Champion) public champions;
    Messenger public messenger;

    event findVAA(address emitterAddr, uint64 seq);
    event battleEvent(uint damageByHash, uint damage);
    event battleOutcome(uint winnerHash, uint loserHash);
    event championRegistered(uint32 attack, uint32 defense, uint32 speed, uint32 crit_rate);
    event randomNum(bytes32 rand);

    constructor (address _wormhole_core_bridge_address) {
        messenger = new Messenger(_wormhole_core_bridge_address);
    }

    /**
    
    Returns uint: the champion hash
     */
    function registerNFT(address _erc721Contract, uint256 _nft) public returns (uint) {
        // require nft collection to support metadata IERC721 metadata extension
        require(IERC165(_erc721Contract).supportsInterface(0x5b5e139f), "NFT collection does not support metadata.");
        
        // assert ownership
        IERC721Metadata nftCollection = IERC721Metadata(_erc721Contract);
        require(nftCollection.ownerOf(_nft) == msg.sender, "You do not own this NFT");

        string memory _uri = nftCollection.tokenURI(_nft);

        bytes32 myChampionHash = getChampionHash(_erc721Contract, _nft);
        // assert that the nft has not been registered yet
        require(champions[uint(myChampionHash)].championHash != uint(myChampionHash), "NFT is already registered");

        Champion memory champion;
        champion.championHash = uint(myChampionHash);
        champion.uri = _uri;
        champion.attack = byteToUint32(myChampionHash[31] & 0x0F)/2 + 5;
        champion.defense = byteToUint32((myChampionHash[31] >> 4) & 0x0F)/5 + 1;
        champion.speed = byteToUint32(myChampionHash[30] & 0x0F) + 1;
        champion.crit_rate = byteToUint32(myChampionHash[30] >> 4 & 0x0F) + 10;
        champion.level = 1;

        bytes memory b = mintIdVaa(champion);
        // emit IdVAA(b);
        uint64 seq = messenger.sendMsg(b);
        emit findVAA(address(messenger), seq);
        champion.vaaSeq = seq;

        champions[champion.championHash] = champion;

        emit championRegistered(champion.attack, champion.defense, champion.speed, champion.crit_rate);
        return champion.championHash;
    }

    function byteToUint32(bytes1 b) private pure returns (uint32) {
        return uint32(uint8(b));
    }

    function crossChainBattle(uint myChampionHash, bytes memory encodedMsg) public {
        string memory payload;
        try  messenger.receiveEncodedMsg(encodedMsg) returns (string memory p) {
            payload = p;
        } catch {
            revert("Unable to receive encoded message vaa.");
        }

        Champion memory me = champions[myChampionHash];
        Champion memory opponent = decodeIdVaa(bytes(payload));
        
        bytes32 random = rand(msg.sender);

        battle(me, opponent, random);
    }

    function nativeChainBattle(uint myChampionHash, uint opponentChampionHash) public {
        Champion memory me = champions[myChampionHash];
        Champion memory opponent = champions[opponentChampionHash];
        
        bytes32 random = rand(msg.sender);
        emit randomNum(random);
        battle(me, opponent, random);
    }

    function battle(Champion memory a, Champion memory b, bytes32 random) public {
        uint damageByA; uint damageByB;

         // idea: use 1 byte (0-255) as random. determine the threshold for event to trigger
        uint32 a_threshold_to_hit = a.speed * 0xff / (a.speed + b.speed);

        uint32 a_threshold_to_crit = a.speed * 0xff / 100;
        uint32 b_threshold_to_crit = b.speed * 0xff / 100;
        
        for (uint i = 0; i < ROUNDS; i++) {
            if (byteToUint32(random[i]) < a_threshold_to_hit) {
                // a successful hit
                uint damage;
                
                // damage multiplier is a random number between 257 and 512
                uint32 damageMultiplier = byteToUint32(rand(msg.sender)[31]) + 257;
                if (byteToUint32(random[31-i]) < a_threshold_to_crit) {
                    damage = a.attack * 2 * damageMultiplier / b.defense / 512;
                } else {
                    damage = a.attack * damageMultiplier / b.defense / 512;
                }

                emit battleEvent(a.championHash, damage);
                damageByA += damage;
            } else {
                // b successful hit
                uint damage;
                uint32 damageMultiplier = byteToUint32(rand(msg.sender)[31]) + 257;

                if (byteToUint32(random[31-i]) < b_threshold_to_crit) {
                    damage = b.attack * 2 * damageMultiplier / a.defense / 512;
                } else {
                    damage = b.attack * damageMultiplier / a.defense / 512;
                }

                emit battleEvent(b.championHash, damage);
                damageByB += damage;
            }
        }

        if (damageByA > damageByB) {
            emit battleOutcome(a.championHash, b.championHash);
        } else {
            emit battleOutcome(b.championHash, a.championHash);
        }
    }

    /**
    Generates a random number from [0, n-1]. Security attack: another contract can implement this method and call 
    this method at the same time they submit a battle to determine the random number. 
     */
    function rand(address msg_sender) private returns(bytes32) {
        nonce += 1;
        return keccak256(abi.encodePacked(
            block.timestamp + block.difficulty +
            ((uint(keccak256(abi.encodePacked(block.coinbase)))) / (block.timestamp)) +
            block.gaslimit + 
            ((uint(keccak256(abi.encodePacked(msg_sender)))) / (block.timestamp)) +
            block.number + 
            nonce
        ));
    }
    
    function getChampionHash(address _erc721Contract, uint256 _nft) public pure returns (bytes32) {
        return championHash(abi.encodePacked(_erc721Contract, _nft));
    }

    function championHash(bytes memory c) private pure returns (bytes32) {
        return sha256(c);
    }

    // TODO: make function private after testing
    function mintIdVaa(Champion memory c) private pure returns (bytes memory) {
        return abi.encode(c);
    }

    function decodeIdVaa(bytes memory b) private pure returns (Champion memory c) {
        c = abi.decode(b, (Champion));
    }
}
