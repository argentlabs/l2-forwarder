require("dotenv").config();
const HDWalletProvider = require("@truffle/hdwallet-provider");

module.exports = {
  networks: {
    development: {
      host: "127.0.0.1", // Localhost (default: none)
      port: 8545, // Standard Ethereum port (default: none)
      network_id: "*", // Any network (default: none)
    },

    rinkeby: {
      provider: () =>
        new HDWalletProvider({
          mnemonic: {
            phrase: process.env.DEPLOYER_MNEMONIC,
          },
          providerOrUrl: `wss://rinkeby.infura.io/ws/v3/${process.env.INFURA_KEY}`,
          addressIndex: 0,
          numberOfAddresses: 4,
        }),
      network_id: 4,
      gas: 8000000, // Gas limit
      gasPrice: 1000000000, // 1 GWei
      skipDryRun: true,
    },

    ropsten: {
      provider: () =>
        new HDWalletProvider({
          mnemonic: {
            phrase: process.env.DEPLOYER_MNEMONIC,
          },
          providerOrUrl: `wss://ropsten.infura.io/ws/v3/${process.env.INFURA_KEY}`,
          addressIndex: 0,
          numberOfAddresses: 4,
        }),
      network_id: 3,
      gas: 8000000, // Gas limit
      gasPrice: 1000000000, // 1 GWei
      skipDryRun: true,
    },

    kovan: {
      provider: () =>
        new HDWalletProvider({
          mnemonic: {
            phrase: process.env.DEPLOYER_MNEMONIC,
          },
          providerOrUrl: `wss://kovan.infura.io/ws/v3/${process.env.INFURA_KEY}`,
          addressIndex: 0,
          numberOfAddresses: 4,
        }),
      network_id: 42,
      gas: 8000000, // Gas limit
      gasPrice: 1000000000, // 1 GWei
      skipDryRun: true,
    },
  },

  // Set default mocha options here, use special reporters etc.
  mocha: {
    // timeout: 100000
  },

  // Configure your compilers
  compilers: {
    solc: {
      version: "0.7.0", // Fetch exact version from solc-bin (default: truffle's version)
      // docker: true,        // Use "0.5.1" you've installed locally with docker (default: false)
      // settings: {          // See the solidity docs for advice about optimization and evmVersion
      //  optimizer: {
      //    enabled: false,
      //    runs: 200
      //  },
      //  evmVersion: "byzantium"
      // }
    },
  },

  plugins: ["solidity-coverage", "truffle-source-verify"],

  api_keys: {
    etherscan: process.env.ETHERSCAN_KEY,
  },
};
