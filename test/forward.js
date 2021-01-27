const ForwarderFactory = artifacts.require("ForwarderFactory");
const ZkSync = artifacts.require("ZkSyncMock");
const ZkGov = artifacts.require("GovernanceMock");
const ERC20 = artifacts.require("TestERC20");

const chai = require("chai");
const BN = require("bn.js");
const bnChai = require("bn-chai");
const { expect } = chai;
chai.use(bnChai(BN));

const ETH_TOKEN = "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE";

contract("ForwarderFactory", (accounts) => {
  let zk;
  let erc20;
  let factory;

  before(async () => {
    zk = await ZkSync.new();
    factory = await ForwarderFactory.new(zk.address);
    erc20 = await ERC20.new();
    const govParams = web3.eth.abi.encodeParameter("address", accounts[0]);
    const zkGov = await ZkGov.new();
    await zkGov.initialize(govParams);
    await zkGov.addToken(erc20.address);
    const zkParams = web3.eth.abi.encodeParameters(
      ["address", "address", "bytes32"],
      [zkGov.address, accounts[0], "0x"]
    );
    await zk.initialize(zkParams);
  });

  it("deposits ETH", async () => {
    const wallet = accounts[0];
    const fwd = await factory.getForwarder(wallet);
    const value = web3.utils.toWei("0.1");
    await web3.eth.sendTransaction({ to: fwd, value, from: wallet });

    const zkBalanceBefore = new BN(await web3.eth.getBalance(zk.address));
    const fwdBalanceBefore = new BN(await web3.eth.getBalance(fwd));
    const txR = await factory.forward(wallet, ETH_TOKEN);
    const zkBalanceAfter = new BN(await web3.eth.getBalance(zk.address));
    const fwdBalanceAfter = new BN(await web3.eth.getBalance(fwd));

    expect(zkBalanceAfter.sub(zkBalanceBefore)).to.be.eq.BN(value);
    expect(fwdBalanceBefore.sub(fwdBalanceAfter)).to.be.eq.BN(value);

    console.log({ gasUsed: txR.receipt.gasUsed });
  });

  it("deposits ERC20", async () => {
    const wallet = accounts[0];
    const fwd = await factory.getForwarder(wallet);
    const amount = web3.utils.toWei("100");
    await erc20.mint(fwd, amount);

    const fwdBalanceBefore = await erc20.balanceOf(fwd);
    const zkBalanceBefore = await erc20.balanceOf(zk.address);
    const txR = await factory.forward(wallet, erc20.address);
    const fwdBalanceAfter = await erc20.balanceOf(fwd);
    const zkBalanceAfter = await erc20.balanceOf(zk.address);

    expect(zkBalanceAfter.sub(zkBalanceBefore)).to.be.eq.BN(amount);
    expect(fwdBalanceBefore.sub(fwdBalanceAfter)).to.be.eq.BN(amount);

    console.log({ gasUsed: txR.receipt.gasUsed });
  });
});
