// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import "openzeppelin-contracts/contracts/token/ERC721/IERC721.sol";
import "./Messenger.sol";

struct Champion {
    uint nft;
	string image;
	string name;
    uint attack;
    uint defense;
    uint speed;
    uint crit_rate;
    uint level;
    uint64 vaaSeq;
}


contract CoreGame {
    // mapping from nft collection to nft unique id to champion
    mapping (address => mapping(uint256 => Champion)) public champions;
    Messenger public messenger;

    event findVAA(address emitterAddr, uint64 seq);

    constructor (address _wormhole_core_bridge_address) {
        messenger = new Messenger(_wormhole_core_bridge_address);
    }

    /**
    
    Returns uint64: a sequence to find the emitted vaa from http
     */
    function registerNFT(address _erc721Contract, uint256 _nft, string calldata _image, string calldata _name) public returns (uint64) {
        // assert ownership
        assert(IERC721(_erc721Contract).ownerOf(_nft) == msg.sender);

        // check bounds for image and name length
        assert(bytes(_image).length < 1000);
        assert(bytes(_name).length < 100);

        Champion memory champion;
        champion.nft = _nft;
        champion.image = _image;
        champion.name = _name;

        bytes memory b = mintIdVaa(champion);
        // emit IdVAA(b);
        uint64 seq = messenger.sendMsg(b);
        emit findVAA(address(messenger), seq);
        champion.vaaSeq = seq;

        champions[_erc721Contract][_nft] = champion;
        return seq;
    }

    // TODO: Switch to private after testing
    function mintIdVaa(Champion memory c) private pure returns (bytes memory) {
        // include 20 bytes of padding
        uint numBytes = 32 * 6 + bytes(c.image).length + bytes(c.name).length;
        bytes memory buffer = new bytes(numBytes);
        uint offset = 0;

        bytesToBuffer(offset, abi.encodePacked(c.nft), buffer);
        offset += 32;

        bytesToBuffer(offset, bytes(c.image), buffer);
        offset += bytes(c.image).length;

        bytesToBuffer(offset, bytes(c.name), buffer);
        offset += bytes(c.name).length;

        bytesToBuffer(offset, abi.encodePacked(c.attack), buffer);
        offset += 32;

        bytesToBuffer(offset, abi.encodePacked(c.defense), buffer);
        offset += 32;

        bytesToBuffer(offset, abi.encodePacked(c.speed), buffer);
        offset += 32;

        bytesToBuffer(offset, abi.encodePacked(c.crit_rate), buffer);
        offset += 32;

        bytesToBuffer(offset, abi.encodePacked(c.level), buffer);
        offset += 32;

        // vaa seq is not stored in payload since not necessary to determine outcome of battle

        return buffer;
    }

    function bytesToBuffer(uint _offset, bytes memory b, bytes memory buffer) private pure {
        for (uint i = 0; i < b.length; i++) {
            // bitshift 8 bits, bitmask to retain a single byte
            buffer[_offset + i] = b[i];
        }
    }
}
