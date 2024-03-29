const ForwarderFactory = artifacts.require("ForwarderFactory");
const config = require("./config.json");

module.exports = function (deployer, network) {
  return deployer.then(async () => {
    if (["development", "soliditycoverage"].includes(network)) return;
    // for up-to-date contract addresses, see https://zksync.io/dev/contracts.html
    const networkContracts = config.contracts[network];
    if (!networkContracts || !networkContracts.zkSync) {
      throw new Error(`Missing zkSync address for ${network}`);
    }
    await deployer.deploy(ForwarderFactory, networkContracts.zkSync);
  });
};
