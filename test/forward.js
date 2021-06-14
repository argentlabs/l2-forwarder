const ForwarderFactory = artifacts.require("ForwarderFactory");
const Forwarder = artifacts.require("Forwarder");
const ZkSync = artifacts.require("ZkSyncMock");
const ZkGov = artifacts.require("GovernanceMock");
const ERC20 = artifacts.require("TestERC20");
const ERC721 = artifacts.require("TestERC721");

const truffleAssert = require("truffle-assertions");
const chai = require("chai");
const BN = require("bn.js");
const bnChai = require("bn-chai");
const { assert, expect } = require("chai");
chai.use(bnChai(BN));

const ETH_TOKEN = "0x0000000000000000000000000000000000000000";

contract("ForwarderFactory", (accounts) => {
  let zk;
  let erc20;
  let erc721;
  let factory;
  let wallet;
  let zkGov;

  before(async () => {
    zk = await ZkSync.new();
    factory = await ForwarderFactory.new(zk.address);
    erc20 = await ERC20.new();
    erc721 = await ERC721.new();
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

  async function forwardEth({ safe = false, gas = true } = {}) {
    const fwd = await factory.getForwarder(wallet);
    const value = web3.utils.toWei("0.1");
    const { logs } = await web3.eth.sendTransaction({
      to: fwd,
      value,
      from: accounts[0],
    });
    if ((await web3.eth.getCode(fwd)) !== "0x") {
      assert.equal(logs[0].topics[0], web3.utils.sha3("Received(uint256)"));
    }

    const zkBalanceBefore = new BN(await web3.eth.getBalance(zk.address));
    const fwdBalanceBefore = new BN(await web3.eth.getBalance(fwd));
    let method;
    if (safe) method = "safeForward";
    else method = "forward";
    const txR = await factory[method](wallet, ETH_TOKEN);
    const zkBalanceAfter = new BN(await web3.eth.getBalance(zk.address));
    const fwdBalanceAfter = new BN(await web3.eth.getBalance(fwd));
    if (gas) console.log(`        ${method} gas:`, txR.receipt.gasUsed);
    expect(zkBalanceAfter.sub(zkBalanceBefore)).to.be.eq.BN(value);
    expect(fwdBalanceBefore.sub(fwdBalanceAfter)).to.be.eq.BN(value);
  }

  async function forwardErc20({ safe = false, gas = true } = {}) {
    const fwd = await factory.getForwarder(wallet);
    const amount = web3.utils.toWei("100");
    await erc20.mint(fwd, amount);
    const fwdBalanceBefore = await erc20.balanceOf(fwd);
    const zkBalanceBefore = await erc20.balanceOf(zk.address);
    let method;
    if (safe) method = "safeForward";
    else method = "forward";
    const txR = await factory[method](wallet, erc20.address);
    const fwdBalanceAfter = await erc20.balanceOf(fwd);
    const zkBalanceAfter = await erc20.balanceOf(zk.address);
    if (gas) console.log(`        ${method} gas:`, txR.receipt.gasUsed);
    expect(zkBalanceAfter.sub(zkBalanceBefore)).to.be.eq.BN(amount);
    expect(fwdBalanceBefore.sub(fwdBalanceAfter)).to.be.eq.BN(amount);
  }

  async function recoverErc20() {
    const w = accounts[1];
    const fwd = await factory.getForwarder(w);
    const amount = web3.utils.toWei("100");
    await erc20.mint(fwd, amount);
    const fwdBalanceBefore = await erc20.balanceOf(fwd);
    const walletBalanceBefore = await erc20.balanceOf(w);
    const txR = await factory["recoverERC20Token"](erc20.address, { from: w });
    const fwdBalanceAfter = await erc20.balanceOf(fwd);
    const walletBalanceAfter = await erc20.balanceOf(w);
    console.log(`        recoverERC20Token gas:`, txR.receipt.gasUsed);
    expect(walletBalanceAfter.sub(walletBalanceBefore)).to.be.eq.BN(amount);
    expect(fwdBalanceBefore.sub(fwdBalanceAfter)).to.be.eq.BN(amount);
  }

  async function recoverErc721() {
    const w = accounts[1];
    const fwd = await factory.getForwarder(w);
    const id = 7;
    await erc721.mint(fwd, id);
    const ownerBefore = await erc721.ownerOf(id);
    assert.equal(ownerBefore, fwd);
    const txR = await factory["recoverERC721Token"](erc721.address, id, {
      from: w,
    });
    const ownerAfter = await erc721.ownerOf(id);
    assert.equal(ownerAfter, w);
    console.log(`        recoverERC721Token gas:`, txR.receipt.gasUsed);
  }

  describe("Forward ETH", () => {
    it("should forward ETH", async () => {
      // deploy new forwarder and forward ETH
      await forwardEth({ safe: true });
      // forward ETH from the existing forwarder
      await forwardEth();
      // forward ETH from the existing forwarder with safeForward
      await forwardEth({ safe: true });
    });
  });

  describe("forward ERC20", () => {
    it("should forward ERC20", async () => {
      // inits the ERC20 contract
      await forwardErc20({ safe: true, gas: false });
      // calling after init is cheaper
      wallet = getRandomAddress();
      // deploy new forwarder and forward token
      await forwardErc20({ safe: true });
      // forward ETH from the existing forwarder
      await forwardErc20();
      // forward ETH from the existing forwarder with safeForward
      await forwardErc20({ safe: true });
    });
  });

  describe("Recover tokens", () => {
    it("should recover an ERC20", async () => {
      await recoverErc20();
    });

    it("should recover an ERC721", async () => {
      await recoverErc721();
    });
  });

  describe("Reverts", () => {
    let fwd;
    beforeEach(async () => {
      await forwardEth({ safe: true, gas: false }); // deploy and keep forwarder
      fwd = await Forwarder.at(await factory.getForwarder(wallet));
    });

    it("cannot call the forwarder directly", async () => {
      truffleAssert.reverts(
        fwd["forward"](wallet, erc20.address),
        "sender should be factory"
      );
      truffleAssert.reverts(
        fwd["recoverERC20Token"](wallet, erc20.address),
        "sender should be factory"
      );
      truffleAssert.reverts(
        fwd["recoverERC721Token"](wallet, erc721.address, 5),
        "sender should be factory"
      );
    });
  });
});
