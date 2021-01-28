const ForwarderFactory = artifacts.require("ForwarderFactory");
const Forwarder = artifacts.require("Forwarder");
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
  const wallet = accounts[0];
  const wallet2 = accounts[1];
  const wallet3 = accounts[2];
  const wallet4 = accounts[3];
  const wallet5 = accounts[4];

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

  async function createAndForwardEth({ destroy, wallet }) {
    const fwd = await factory.getForwarder(wallet);
    const value = web3.utils.toWei("0.1");
    await web3.eth.sendTransaction({ to: fwd, value, from: accounts[0] });
    const zkBalanceBefore = new BN(await web3.eth.getBalance(zk.address));
    const fwdBalanceBefore = new BN(await web3.eth.getBalance(fwd));
    const txR = await factory[destroy ? "forwardAndDestruct" : "forward"](
      wallet,
      ETH_TOKEN
    );
    const zkBalanceAfter = new BN(await web3.eth.getBalance(zk.address));
    const fwdBalanceAfter = new BN(await web3.eth.getBalance(fwd));
    console.log(
      `deposits ETH (create + fwd${destroy ? " + destruct" : ""}) gasUsed: ${
        txR.receipt.gasUsed
      }`
    );
    expect(zkBalanceAfter.sub(zkBalanceBefore)).to.be.eq.BN(value);
    expect(fwdBalanceBefore.sub(fwdBalanceAfter)).to.be.eq.BN(value);
  }

  async function forwardEth({ wallet }) {
    const value = web3.utils.toWei("0.1");
    const fwd = await factory.getForwarder(wallet);
    await web3.eth.sendTransaction({ to: fwd, value, from: accounts[1] });
    const zkBalanceBefore = new BN(await web3.eth.getBalance(zk.address));
    const fwdBalanceBefore = new BN(await web3.eth.getBalance(fwd));
    const txR = await (await Forwarder.at(fwd)).forward(wallet, ETH_TOKEN);
    const zkBalanceAfter = new BN(await web3.eth.getBalance(zk.address));
    const fwdBalanceAfter = new BN(await web3.eth.getBalance(fwd));
    expect(zkBalanceAfter.sub(zkBalanceBefore)).to.be.eq.BN(value);
    expect(fwdBalanceBefore.sub(fwdBalanceAfter)).to.be.eq.BN(value);
    console.log(`deposits ETH (fwd) gasUsed: ${txR.receipt.gasUsed}`);
  }

  it("deposits ETH (fwd)", async () => {
    await createAndForwardEth({ destroy: false, wallet });
    await forwardEth({ wallet });
  });

  it("deposits ETH (fwd+destroy)", async () => {
    await createAndForwardEth({ destroy: true, wallet: wallet2 });
  });

  async function createAndForwardErc20({ destroy, wallet }) {
    const fwd = await factory.getForwarder(wallet);
    const amount = web3.utils.toWei("100");
    await erc20.mint(fwd, amount);
    const fwdBalanceBefore = await erc20.balanceOf(fwd);
    const zkBalanceBefore = await erc20.balanceOf(zk.address);
    const txR = await factory[destroy ? "forwardAndDestruct" : "forward"](
      wallet,
      erc20.address
    );
    const fwdBalanceAfter = await erc20.balanceOf(fwd);
    const zkBalanceAfter = await erc20.balanceOf(zk.address);
    console.log(
      `deposits ERC20 (create + fwd${destroy ? " + destruct" : ""}) gasUsed: ${
        txR.receipt.gasUsed
      }`
    );
    expect(zkBalanceAfter.sub(zkBalanceBefore)).to.be.eq.BN(amount);
    expect(fwdBalanceBefore.sub(fwdBalanceAfter)).to.be.eq.BN(amount);
  }

  async function forwardErc20({ wallet }) {
    const fwd = await factory.getForwarder(wallet);
    const amount = web3.utils.toWei("100");
    await erc20.mint(fwd, amount);
    const fwdBalanceBefore = await erc20.balanceOf(fwd);
    const zkBalanceBefore = await erc20.balanceOf(zk.address);
    const txR = await (await Forwarder.at(fwd)).forward(wallet, erc20.address);
    const fwdBalanceAfter = await erc20.balanceOf(fwd);
    const zkBalanceAfter = await erc20.balanceOf(zk.address);
    expect(zkBalanceAfter.sub(zkBalanceBefore)).to.be.eq.BN(amount);
    expect(fwdBalanceBefore.sub(fwdBalanceAfter)).to.be.eq.BN(amount);
    console.log(`deposits ERC20 (fwd) gasUsed: ${txR.receipt.gasUsed}`);
  }

  it("deposits ERC20 (fwd)", async () => {
    await createAndForwardErc20({ destroy: false, wallet: wallet3 });
    await forwardErc20({ wallet: wallet3 });
    await createAndForwardErc20({ destroy: false, wallet: wallet4 });
  });

  it("deposits ERC20 (fwd+destroy)", async () => {
    await createAndForwardErc20({ destroy: true, wallet: wallet5 });
  });
});
