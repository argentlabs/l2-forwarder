// SPDX-License-Identifier: MIT OR Apache-2.0

pragma solidity ^0.7.0;

import "./Forwarder.sol";
import "./IZkSync.sol";

contract ForwarderFactory {

    address public implementation;
    bytes public initCode;

    constructor(IZkSync _zkSync) {
        implementation = address(new Forwarder(_zkSync));
        initCode = _getInitCode(implementation);
    }

    /**
     * @notice Returns the address of a forwarder contract.
     * @param _wallet the wallet controlling the zkSync assets deposited by the forwarder
     */
    function getForwarder(address _wallet) public view returns (address payable forwarder) {
        bytes32 salt = keccak256(abi.encodePacked(_wallet));
        bytes32 hash = keccak256(abi.encodePacked(bytes1(0xff), address(this), salt, keccak256(abi.encodePacked(initCode))));
        forwarder = address(uint160(uint256(hash)));
    }

    /**
     * @notice Deploy a forwarder and transfer its token balance to zkSync
     * @param _wallet the wallet controlling the zkSync assets deposited by the forwarder
     * @param _token the token to transfer
     */
    function deployAndForward(address payable _wallet, address _token) external {
        Forwarder forwarder = _deployForwarder(_wallet);
        forwarder.forward(_wallet, _token);
    }

    /**
     * @notice Transfer the token balance of an already deployed forwarder to zkSync
     * @param _wallet the wallet controlling the zkSync assets deposited by the forwarder
     * @param _token the token to transfer
     */
    function forward(address payable _wallet, address _token) external {
        Forwarder forwarder = Forwarder(getForwarder(_wallet));
        forwarder.forward(_wallet, _token);
    }

    /**
     * @notice Deploy a forwarder, transfer its token balance to zkSync and destruct the forwarder contract
     * @param _wallet the wallet controlling the zkSync assets deposited by the forwarder
     * @param _token the token to transfer
     */
    function deployForwardAndDestruct(address payable _wallet, address _token) external {
        Forwarder forwarder = _deployForwarder(_wallet);
        forwarder.forwardAndDestruct(_wallet, _token);
    }

    /**
     * @notice Transfer the token balance held by the forwarder to the wallet. The transfer is only performed 
     * if the transfer to zkSync reverts (e.g. because the token is unsupported by zkSync)
     * @param _wallet the wallet controlling the zkSync assets deposited by the forwarder
     * @param _token the token to transfer
     */
    function recoverToken(address payable _wallet, address _token) external {
        Forwarder forwarder = Forwarder(getForwarder(_wallet));
        if(!isContract(address(forwarder))) {
            forwarder = _deployForwarder(_wallet);
        }
        // attempt forwarding
        (bool success,) = address(forwarder).call(abi.encodeWithSelector(forwarder.forward.selector, _wallet, _token));
        // only recover token to wallet if forwarding failed (e.g. unsupported token; token deposit paused; transfer failed)
        if(!success) {
            forwarder.recoverToken(_wallet, _token);
        }
    }

    function _deployForwarder(address _wallet) internal returns (Forwarder forwarder) {
        // load the init code to memory
        bytes memory mInitCode = initCode;

        // compute the salt from the destination
        bytes32 salt = keccak256(abi.encodePacked(_wallet));

        assembly {
            forwarder := create2(0, add(mInitCode, 0x20), mload(mInitCode), salt)
            if iszero(extcodesize(forwarder)) { revert(0, 0) }
        }
    }

    function _getInitCode(address _implementation) internal pure returns (bytes memory code) {
        bytes20 targetBytes = bytes20(_implementation);
        code = new bytes(55);
        assembly {
            mstore(add(code, 0x20), 0x3d602d80600a3d3981f3363d3d373d3d3d363d73000000000000000000000000)
            mstore(add(code, add(0x20,0x14)), targetBytes)
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