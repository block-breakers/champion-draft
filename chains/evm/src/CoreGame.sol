// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import "openzeppelin-contracts/contracts/token/ERC721/IERC721.sol";
import "./Messenger.sol";

struct Champion {
    uint championHash;
	string image;
	string name;
    uint32 attack;
    uint32 defense;
    uint32 speed;
    uint32 crit_rate;
    uint32 level;
    uint64 vaaSeq;
}

contract CoreGame {
    // mapping from champion hash to champion
    uint constant ROUNDS = 10;
    uint nonce = 0;
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
    
    Returns address: the champion hash
     */
    function registerNFT(
        address _erc721Contract,
         uint256 _nft, 
         string calldata _image, 
         string calldata _name) public returns (uint) {
        // assert ownership
        require(IERC721(_erc721Contract).ownerOf(_nft) == msg.sender, "You do not own this NFT");


        // check bounds for image and name length
        require(bytes(_image).length < 1000, "Given image url too long, please make it less than 1000 characters.");
        require(bytes(_name).length < 100, "Given name too long, please make it less than 100 characters.");

        bytes32 myChampionHash = getChampionHash(_erc721Contract, _nft);
        // assert that the nft has not been registered yet
        require(champions[uint(myChampionHash)].championHash != uint(myChampionHash), "NFT is already registered");

        Champion memory champion;
        champion.championHash = uint(myChampionHash);
        champion.image = _image;
        champion.name = _name;
        champion.attack = byteToUint32(myChampionHash[31] & 0x0F) + 1;
        champion.defense = byteToUint32((myChampionHash[31] >> 4) & 0x0F)/6 + 1;
        champion.speed = byteToUint32(myChampionHash[30] & 0x0F) + 1;
        champion.crit_rate = byteToUint32(myChampionHash[30] >> 4 & 0x0F) + 1;
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
        nonce += 1;

        battle(me, opponent, random);
    }

    function nativeChainBattle(uint myChampionHash, uint opponentChampionHash) public {
        Champion memory me = champions[myChampionHash];
        Champion memory opponent = champions[opponentChampionHash];
        
        bytes32 random = rand(msg.sender);
        nonce += 1;
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
                if (byteToUint32(random[31-i]) < a_threshold_to_crit) {
                    damage = a.attack * 2 / b.defense;
                } else {
                    damage = a.attack / b.defense;
                }

                emit battleEvent(a.championHash, damage);
                damageByA += damage;
            } else {
                // b successful hit
                uint damage;
                if (byteToUint32(random[31-i]) < b_threshold_to_crit) {
                    damage = b.attack * 2 / a.defense;
                } else {
                    damage = b.attack / a.defense;
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
    function rand(address msg_sender) private view returns(bytes32) {
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
