// SPDX-License-Identifier: MIT OR Apache-2.0

pragma solidity ^0.7.0;

import "./IZkSync.sol";
import "@openzeppelin/contracts/token/ERC20/SafeERC20.sol";

contract Forwarder {
    using SafeERC20 for IERC20;

    IZkSync immutable internal zkSync;
    address immutable internal forwarderFactory;
    address constant internal ETH_TOKEN = 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE;

    constructor(IZkSync _zkSync) {
        zkSync = _zkSync;
        forwarderFactory = msg.sender;
    }

    modifier onlyFactory() {
        require(msg.sender == forwarderFactory, "sender should be factory");
        _;
    }

    function forwardAndDestruct(address payable _wallet, address _token) external {
        forward(_wallet, _token);
        selfdestruct(_wallet);
    }

    function forward(address payable _wallet, address _token) public onlyFactory {
        if (_token == ETH_TOKEN) {
            uint256 balance = address(this).balance;
            zkSync.depositETH{value: balance}(_wallet);
        } else {
            IERC20 tokenContract = IERC20(_token);
            uint256 balance = tokenContract.balanceOf(address(this));
            tokenContract.approve(address(zkSync), balance); // note: approve() saves ~4k gas vs safeApprove()
            zkSync.depositERC20(tokenContract, uint104(balance), _wallet);
        }
    }

    function recoverToken(address _wallet, address _token) external onlyFactory {
        IERC20 tokenContract = IERC20(_token);
        uint256 balance = tokenContract.balanceOf(address(this));
        tokenContract.safeTransfer(_wallet, balance);
    }

    receive() external payable {}
}