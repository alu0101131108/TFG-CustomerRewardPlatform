// const { config } = require("dotenv");

require("@nomicfoundation/hardhat-toolbox");
require("solidity-coverage");
require("dotenv").config();

const COINMARKETCAP_API_KEY = process.env.COINMARKETCAP_API_KEY;

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.9",
    settings: {
      optimizer: {
        enabled: true,
        runs: 600,
      }
    }
  },
  networks: {
    localhost: {
      url: "http://127.0.0.1:8545/",
      chainId: 31337,
      allowUnlimitedContractSize: true
    }
  },
  defaultNetwork: "hardhat",
  gasReporter: {
    enabled: true,
    outputFile: "gas-reporter.txt",
    noColors: true,
    currency: "EUR",
    coinmarketcap: COINMARKETCAP_API_KEY
  }
};
