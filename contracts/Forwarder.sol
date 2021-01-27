// SPDX-License-Identifier: MIT OR Apache-2.0

pragma solidity ^0.7.0;

import "./IZkSync.sol";

contract Forwarder {
    IZkSync immutable internal zkSync;
    address constant internal ETH_TOKEN = 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE;

    constructor(IZkSync _zkSync) {
        zkSync = _zkSync;
    }

    function forwardAndDestruct(address payable _wallet, address _token) external {
        if (_token == ETH_TOKEN) {
            uint256 balance = address(this).balance;
            zkSync.depositETH{value: balance}(_wallet);
        } else {
            IERC20 tokenContract = IERC20(_token);
            uint256 balance = tokenContract.balanceOf(address(this));
            tokenContract.approve(address(zkSync), balance);
            zkSync.depositERC20(tokenContract, uint104(balance), _wallet);
        }
        selfdestruct(_wallet);
    }
}