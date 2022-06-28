// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import "openzeppelin-contracts/contracts/token/ERC721/IERC721.sol";
import "./Messenger.sol";

struct Champion {
    uint nft;
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

    function startBattle(bytes memory encodedMsg) public {
        string memory payload = messenger.receiveEncodedMsg(encodedMsg);

        Champion memory c = decodeIdVaa(payload);

        return c.name;
    }

    // TODO: make function private after testing
    function mintIdVaa(Champion memory c) private pure returns (bytes memory) {
        return abi.encode(c);
    }

    function decodeIdVaa(bytes memory b) private pure returns (Champion memory c) {
        c = abi.decode(b, (Champion));
    }
}
