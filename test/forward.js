const ForwarderFactory = artifacts.require("ForwarderFactory");
const Forwarder = artifacts.require("Forwarder");
const ZkSync = artifacts.require("ZkSyncMock");
const ZkGov = artifacts.require("GovernanceMock");
const ERC20 = artifacts.require("TestERC20");

const truffleAssert = require("truffle-assertions");
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
  let wallet;
  let zkGov;

  before(async () => {
    zk = await ZkSync.new();
    factory = await ForwarderFactory.new(zk.address);
    erc20 = await ERC20.new();
    const govParams = web3.eth.abi.encodeParameter("address", accounts[0]);
    zkGov = await ZkGov.new();
    await zkGov.initialize(govParams);
    await zkGov.addToken(erc20.address);
    const zkParams = web3.eth.abi.encodeParameters(
      ["address", "address", "bytes32"],
      [zkGov.address, accounts[0], "0x"]
    );
    await zk.initialize(zkParams);
  });

  function getRandomAddress() {
    return (
      "0x" +
      [...Array(40)]
        .map(() => Math.floor(Math.random() * 16).toString(16))
        .join("")
    );
  }

  beforeEach(() => {
    wallet = getRandomAddress();
  });

  async function forwardEth({ destroy = false } = {}) {
    const fwd = await factory.getForwarder(wallet);
    const code = await web3.eth.getCode(fwd);
    const value = web3.utils.toWei("0.1");
    await web3.eth.sendTransaction({ to: fwd, value, from: accounts[0] });
    const zkBalanceBefore = new BN(await web3.eth.getBalance(zk.address));
    const fwdBalanceBefore = new BN(await web3.eth.getBalance(fwd));
    let method;
    if (destroy) method = "deployForwardAndDestruct";
    else if (code.length > 2) method = "forward";
    else method = "deployAndForward";
    const txR = await factory[method](wallet, ETH_TOKEN);
    const zkBalanceAfter = new BN(await web3.eth.getBalance(zk.address));
    const fwdBalanceAfter = new BN(await web3.eth.getBalance(fwd));
    console.log(`        ${method} gas:`, txR.receipt.gasUsed);
    expect(zkBalanceAfter.sub(zkBalanceBefore)).to.be.eq.BN(value);
    expect(fwdBalanceBefore.sub(fwdBalanceAfter)).to.be.eq.BN(value);
  }

  async function forwardErc20({ destroy = false, recover = false } = {}) {
    const fwd = await factory.getForwarder(wallet);
    const code = await web3.eth.getCode(fwd);
    const amount = web3.utils.toWei("100");
    await erc20.mint(fwd, amount);
    const fwdBalanceBefore = await erc20.balanceOf(fwd);
    const zkBalanceBefore = await erc20.balanceOf(zk.address);
    const walletBalanceBefore = await erc20.balanceOf(wallet);
    let method;
    if (recover) method = "recoverToken";
    else if (destroy) method = "deployForwardAndDestruct";
    else if (code.length > 2) method = "forward";
    else method = "deployAndForward";
    const params = [wallet, erc20.address].concat(recover ? [destroy] : []);
    const txR = await factory[method](...params);
    const fwdBalanceAfter = await erc20.balanceOf(fwd);
    const zkBalanceAfter = await erc20.balanceOf(zk.address);
    const walletBalanceAfter = await erc20.balanceOf(wallet);
    console.log(`        ${method} gas:`, txR.receipt.gasUsed);
    const tokenIsPaused = await zkGov.pausedTokens(1);
    if (!tokenIsPaused) {
      expect(zkBalanceAfter.sub(zkBalanceBefore)).to.be.eq.BN(amount);
    } else if (recover) {
      expect(walletBalanceAfter.sub(walletBalanceBefore)).to.be.eq.BN(amount);
    }
    expect(fwdBalanceBefore.sub(fwdBalanceAfter)).to.be.eq.BN(amount);
  }

  describe("deposit ETH", () => {
    it("deposits ETH (fwd)", async () => {
      // deploy new forwarder and forward ETH
      await forwardEth();
      // forward ETH from the existing forwarder
      await forwardEth();
    });

    it("deposits ETH (fwd+destroy)", async () => {
      await forwardEth({ destroy: true });
      // make sure we can recreate the forwader after its destruction
      await forwardEth({ destroy: true });
    });
  });

  describe("deposit ERC20", () => {
    it("deposits ERC20 (fwd)", async () => {
      // first ever call to depositERC20
      await forwardErc20();
      // the second call to depositERC20 is cheaper
      wallet = getRandomAddress();
      await forwardErc20();
      await forwardErc20();
    });

    it("deposits ERC20 (fwd+destroy)", async () => {
      await forwardErc20({ destroy: true });
    });
  });

  describe("recovers ERC20", () => {
    it("recovers ERC20 (successful forwarding; no destruction)", async () => {
      await forwardErc20({ recover: true });
    });

    it("recovers ERC20 (successful forwarding; destruction)", async () => {
      await forwardErc20({ destroy: true, recover: true });
    });

    it("recovers ERC20 (failed forwarding; no destruction)", async () => {
      await zkGov.setTokenPaused(erc20.address, true);
      await forwardErc20({ recover: true });
      await zkGov.setTokenPaused(erc20.address, false);
    });

    it("recovers ERC20 (failed forwarding; no destruction; existing forwarder)", async () => {
      await forwardEth(); // deploy and keep forwarder
      await zkGov.setTokenPaused(erc20.address, true);
      await forwardErc20({ recover: true });
      await zkGov.setTokenPaused(erc20.address, false);
    });

    it("recovers ERC20 (failed forwarding; destruction)", async () => {
      await zkGov.setTokenPaused(erc20.address, true);
      await forwardErc20({ recover: true, destroy: true });
      await zkGov.setTokenPaused(erc20.address, false);
    });
  });

  describe("Reverts", () => {
    let fwd;
    beforeEach(async () => {
      await forwardEth(); // deploy and keep forwarder
      fwd = await Forwarder.at(await factory.getForwarder(wallet));
    });

    it("cannot call the forwarder directly", async () => {
      await Promise.all(
        ["forward", "forwardAndDestruct", "recoverToken"].map((method) =>
          truffleAssert.reverts(
            fwd[method](wallet, erc20.address),
            "sender should be factory"
          )
        )
      );
    });

    it("cannot destroy existing forwarder", async () => {
      await truffleAssert.reverts(
        forwardErc20({ recover: true, destroy: true }),
        "cannot destruct existing forwarder"
      );
    });
  });
});
