const Forwarder = artifacts.require("Forwarder");
const ForwarderFactory = artifacts.require("ForwarderFactory");
const ZkSync = artifacts.require("ZkSyncMock");
const ZkGov = artifacts.require("GovernanceMock");
const ERC20 = artifacts.require("TestERC20");

const ETH_TOKEN = "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE";

contract("Batcher", (accounts) => {
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
    const txR = await factory.forward(fwd, ETH_TOKEN);
    console.log({ gasUsed: txR.receipt.gasUsed });
  });

  it("deposits ERC20", async () => {
    const wallet = accounts[0];
    const fwd = await factory.getForwarder(wallet);
    const amount = web3.utils.toWei("100");
    await erc20.mint(wallet, amount);
    const txR = await factory.forward(fwd, erc20.address);
    console.log({ gasUsed: txR.receipt.gasUsed });
  });
});
