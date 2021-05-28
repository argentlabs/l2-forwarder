// SPDX-License-Identifier: MIT OR Apache-2.0

pragma solidity ^0.7.0;

import "./IZkSync.sol";
import "@openzeppelin/contracts/token/ERC20/SafeERC20.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";

contract Forwarder {
    using SafeERC20 for IERC20;

    IZkSync immutable internal zkSync;
    address immutable internal forwarderFactory;
    address constant internal ETH_TOKEN = address(0);

    constructor(IZkSync _zkSync) {
        zkSync = _zkSync;
        forwarderFactory = msg.sender;
    }

    modifier onlyFactory() {
        require(msg.sender == forwarderFactory, "sender should be factory");
        _;
    }

    /**
     * @notice Transfer the token balance to zkSync
     * @param _wallet the wallet controlling the zkSync assets deposited by the forwarder
     * @param _token the token to transfer
     */
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

    /**
     * @notice Transfer the ERC20 token balance held by the forwarder to the wallet.
     * @param _wallet the wallet associated to the forwarder
     * @param _token the ERC20 token to transfer
     */
    function recoverERC20Token(address _wallet, address _token) external onlyFactory {
        IERC20 tokenContract = IERC20(_token);
        uint256 balance = tokenContract.balanceOf(address(this));
        tokenContract.safeTransfer(_wallet, balance);
    }

    /**
     * @notice Transfer an ERC721 token held by the forwarder to the wallet.
     * @param _wallet the wallet associated to the forwarder
     * @param _token the ERC721 token contract
     * @param _id the ERC721 token to transfer
     */
    function recoverERC721Token(address _wallet, address _token, uint256 _id) external onlyFactory {
        IERC721 tokenContract = IERC721(_token);
        tokenContract.transferFrom(address(this), _wallet, _id);
    }

    receive() external payable {}
}