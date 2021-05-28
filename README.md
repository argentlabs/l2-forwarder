# l2-forwarder

This project enables ETH and ERC20 deposits from a centralized exchange to a L2 wallet on Zk-Sync without the need to have an L1 wallet.

Deposits work in 2 steps:
- First the tokens are transfered from the CEX to a (counterfactually) created `Forwarder` contract unique to the receiving L2 wallet.
The address of the forwarder for a given wallet can be obtained from the `ForwarderFactory` contract and it can only transfer tokens to the target L2 wallet.
- Second the `ForwarderFactory` contract is called to forward the tokens to the Zk-Sync bridge and deposit them to the target L2 wallet.
If it is the first deposit for the wallet, the forwarder is first deployed.

Contracts are optimised for gas and each forwarder is an EIP-1167 minimal proxy to a `Forwarder` implementation. 
