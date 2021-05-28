require("dotenv").config();
const HDWalletProvider = require("@truffle/hdwallet-provider");
const AWSWalletProvider = require("./utils/aws-wallet-provider.js");

const _gasPrice = process.env.DEPLOYER_GAS_PRICE || 20000000000;
const _gasLimit = 8000000;

module.exports = {
  networks: {
    development: {
      host: "127.0.0.1", // Localhost (default: none)
      port: 8545, // Standard Ethereum port (default: none)
      network_id: "*", // Any network (default: none)
    },

    test: {
      provider: () => new AWSWalletProvider(
        `https://ropsten.infura.io/v3/${process.env.INFURA_KEY}`,
        "argent-smartcontracts-test",
        "backend/deploy.key"
      ),
      network_id: 3,
      gas: _gasLimit,
      gasPrice: _gasPrice,
      skipDryRun: true,
    },

    staging: {
      provider: () => new AWSWalletProvider(
        `https://mainnet.infura.io/v3/${process.env.INFURA_KEY}`,
        "argent-smartcontracts-staging",
        "backend/deploy.key"
      ),
      network_id: 1,
      gas: _gasLimit,
      gasPrice: _gasPrice,
      skipDryRun: true,
    },

    prod: {
      provider: () => new AWSWalletProvider(
        `https://mainnet.infura.io/v3/${process.env.INFURA_KEY}`,
        "argent-smartcontracts-prod",
        "backend/deploy.key"
      ),
      network_id: 1,
      gas: _gasLimit,
      gasPrice: _gasPrice,
      skipDryRun: true,
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
      gas: _gasLimit,
      gasPrice: _gasPrice,
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
      gas: _gasLimit,
      gasPrice: _gasPrice,
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

  plugins: ["solidity-coverage", "truffle-plugin-verify"],

  api_keys: {
    etherscan: process.env.ETHERSCAN_KEY,
  },
};
