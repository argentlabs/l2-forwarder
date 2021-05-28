// SPDX-License-Identifier: MIT OR Apache-2.0

pragma solidity ^0.7.0;

import "./Forwarder.sol";
import "./IZkSync.sol";

contract ForwarderFactory {

    address public immutable implementation;
    bytes32 public immutable initCodeHash;

    constructor(IZkSync _zkSync) {
        address impl = address(new Forwarder(_zkSync));
        implementation = impl;
        initCodeHash = keccak256(abi.encodePacked(_initCode(bytes20(impl))));
    }

    /**
     * @notice Returns the address of a forwarder contract.
     * @param _wallet the wallet controlling the zkSync assets deposited by the forwarder
     */
    function getForwarder(address _wallet) public view returns (address payable forwarder) {
        bytes32 salt = keccak256(abi.encodePacked(_wallet));
        bytes32 hash = keccak256(abi.encodePacked(bytes1(0xff), address(this), salt, initCodeHash));
        forwarder = address(uint160(uint256(hash)));
    }

    /**
     * @notice Transfers the token balance of a forwarder to zkSync.
     * The forwarder is deployed if needed.
     * @param _wallet the wallet controlling the zkSync assets deposited by the forwarder.
     * @param _token the token to transfer
     */
    function safeForward(address payable _wallet, address _token) external {
        Forwarder forwarder = _deployForwarder(_wallet);
        forwarder.forward(_wallet, _token);
    }

    /**
     * @notice Transfers the token balance of an already deployed forwarder to zkSync.
     * The method fails if the forwarder is not deployed.
     * @param _wallet the wallet controlling the zkSync assets deposited by the forwarder.
     * @param _token the token to transfer
     */
    function forward(address payable _wallet, address _token) external {
        Forwarder forwarder = Forwarder(getForwarder(_wallet));
        forwarder.forward(_wallet, _token);
    }

    /**
     * @notice Transfer the ERC20 token balance held by the forwarder to the wallet.
     * Must be called by the wallet itself. The forwarder is deployed if needed.
     * @param _token the ERC20 token to transfer
     */
    function recoverERC20Token(address _token) external {
        address wallet = msg.sender;
        Forwarder forwarder = _deployForwarder(wallet);
        forwarder.recoverERC20Token(wallet, _token);
    }

    /**
     * @notice Transfer an ERC721 token held by the forwarder to the wallet.
     * Must be called by the wallet itself. The forwarder is deployed if needed.
     * @param _token the ERC721 token contract
     * @param _id the ERC721 token to transfer
     */
    function recoverERC721Token(address _token, uint256 _id) external {
        address wallet = msg.sender;
        Forwarder forwarder = _deployForwarder(wallet);
        forwarder.recoverERC721Token(wallet, _token, _id);
    }

    /**
     * @notice Deploys the forwarder of a wallet if needed.
     * @param _wallet the wallet associated to the forwarder.
     */
    function _deployForwarder(address _wallet) internal returns (Forwarder forwarder) {
        forwarder = Forwarder(getForwarder(_wallet));
        if(!isContract(address(forwarder))) {
            // load the init code to memory
            bytes memory mInitCode = _initCode(bytes20(implementation));
            // compute the salt from the destination
            bytes32 salt = keccak256(abi.encodePacked(_wallet));
            // deploy
            assembly {
                forwarder := create2(0, add(mInitCode, 0x20), mload(mInitCode), salt)
                if iszero(extcodesize(forwarder)) { revert(0, 0) }
            }
        }
    }

    function _initCode(bytes20 _target) internal view returns (bytes memory code) {
        code = new bytes(55);
        assembly {
            mstore(add(code, 0x20), 0x3d602d80600a3d3981f3363d3d373d3d3d363d73000000000000000000000000)
            mstore(add(code, add(0x20,0x14)), _target)
            mstore(add(code, add(0x20,0x28)), 0x5af43d82803e903d91602b57fd5bf30000000000000000000000000000000000)
        }
    }

    function isContract(address _addr) internal view returns (bool) {
        uint32 size;
        // solhint-disable-next-line no-inline-assembly
        assembly {
            size := extcodesize(_addr)
        }
        return (size > 0);
    }
}