// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.7.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract TestERC20 is ERC20("Coolcoin", "COOL") {
    function mint(address account, uint amount) external {
        _mint(account, amount);
    }
}