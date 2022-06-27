pragma solidity ^0.8.13;

import "openzeppelin-contracts/contracts/token/ERC721/ERC721.sol";

contract BreadCollection is ERC721 {
    constructor () ERC721("Bread", "B") {}

    function mint(uint256 tokenId) public {
        _mint(msg.sender, tokenId);
    }

    function burn(uint256 tokenId) public {
        _burn(tokenId);
    }
}