// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.7.0;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";

contract TestERC721 is ERC721("CoolNft", "COOLNFT") {
    function mint(address account, uint tokenId) external {
        _mint(account, tokenId);
    }
}