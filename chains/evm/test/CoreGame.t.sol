// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import "forge-std/Test.sol";

import "openzeppelin-contracts/contracts/token/ERC721/presets/ERC721PresetMinterPauserAutoId.sol";
import "src/CoreGame.sol";

contract CoreGameTest is Test {
    CoreGame game;
    ERC721PresetMinterPauserAutoId nftCollection;
    address admin;
    address user1;
    address user2;

    function setUp() public {
        game = new CoreGame(address(0xC89Ce4735882C9F0f0FE26686c53074E09B0D550));
        nftCollection = new ERC721PresetMinterPauserAutoId("bread", "B", "https://cloudflare-ipfs.com/ipfs/QmeSjSinHpPnmXmspMjwiXyN6zS4E9zccariGR3jxcaWtq/");
        admin = address(this);
        user1 = address(0x100);
        user2 = address(0x200);
    }

    function testRegister() public {
        // user 1
        nftCollection.mint(user1);

        vm.prank(user1);
        game.registerNFT(address(nftCollection), 0, "", "first");

        ( , , string memory name, , , , , ) = game.champions(address(nftCollection), 0);

        assertEq(name, "first");
    }

    function testFailRegister() public {
        // user 1
        nftCollection.mint(user1);

        vm.prank(user1);
        game.registerNFT(address(nftCollection), 1, "", "first");
    }
}
