// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import "openzeppelin-contracts/contracts/token/ERC721/IERC721.sol";
import "./Messenger.sol";

struct Champion {
    uint256 nft;
	string image;
	string name;
    uint attack;
    uint defense;
    uint speed;
    uint crit_rate;
    uint level;
}


contract CoreGame {
    // mapping from nft collection to nft unique id to champion
    mapping (address => mapping(uint256 => Champion)) public champions;
    Messenger private _messenger;

    constructor (address _wormhole_core_bridge_address) {
        _messenger = new Messenger(_wormhole_core_bridge_address);
    }

    function registerNFT(address _erc721Contract, uint256 _nft, string calldata _image, string calldata _name) public {
        // assert ownership
        assert(IERC721(_erc721Contract).ownerOf(_nft) == msg.sender);

        Champion memory champion;
        champion.nft = _nft;
        champion.image = _image;
        champion.name = _name;
        champions[_erc721Contract][_nft] = champion;

        // TODO: submit ID VAA
    }

    function mintIdVAA() internal view returns (bytes memory) {
        // use seriality to seralize struct to bytes

        return 0;
    }

    
}
