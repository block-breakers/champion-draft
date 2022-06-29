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
        // avalanche fuji testnet
        // run test with forge test -vvvv --fork-url https://api.avax-test.network/ext/bc/C/rpc
        game = new CoreGame(address(0x7bbcE28e64B3F8b84d876Ab298393c38ad7aac4C));
        nftCollection = new ERC721PresetMinterPauserAutoId("bread", "B", "https://cloudflare-ipfs.com/ipfs/QmeSjSinHpPnmXmspMjwiXyN6zS4E9zccariGR3jxcaWtq/");
        admin = address(this);
        user1 = address(0x100);
        user2 = address(0x200);

        nftCollection.mint(user1);
        nftCollection.mint(user1);
        nftCollection.mint(user2);
        nftCollection.mint(user2);
    }

    // function testRegister() public {
    //     // user 1
    //     vm.prank(user1);
    //     address c1 = game.registerNFT(address(nftCollection), 0, "", "first");

    //     ( , , string memory name, , , , , , ) = game.champions(c1);

    //     assertEq(name, "first");
    // }

    // function testFailRegister() public {
    //     // user 1
    //     vm.prank(user1);
    //     game.registerNFT(address(nftCollection), 2, "", "first");
    // }
    // function testFailDoubleRegister() public {
    //     // user 1
    //     vm.prank(user1);
    //     game.registerNFT(address(nftCollection), 0, "", "first");
    //     vm.prank(user1);
    //     game.registerNFT(address(nftCollection), 0, "", "first");
    // }

    // function testFailVaa() public {
    //     bytes memory bad = "aoihgasfasghafdhadf";

    //     game.crossChainBattle(0, bad);
    // }

    function testBattle() public {
        // user 1
        vm.prank(user1);
        uint c1 = game.registerNFT(address(nftCollection), 1);

        vm.prank(user2);
        uint c2 = game.registerNFT(address(nftCollection), 3);

        vm.prank(user1);
        game.nativeChainBattle(c1, c2);
    }
}