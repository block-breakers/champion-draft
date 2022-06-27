// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import "openzeppelin-contracts/contracts/token/ERC721/IERC721.sol";

struct Image {
    string url;
    string metadata;
}

struct Champion {
    uint256 nft;
	Image image;
	string name;
    uint attack;
    uint defense;
    uint speed;
    uint crit_rate;
    uint level;
}

contract CoreGame {
    mapping (uint256 => Champion) public champions;

    function registerNFT(address _erc721Contract, uint256 _nft) public {
        // assert ownership
        assert(IERC721(_erc721Contract).ownerOf(_nft) == msg.sender);

        Champion memory champion;
        champion.nft = _nft;
        champions[_nft] = champion;
    }
}
