require("@nomicfoundation/hardhat-toolbox");

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: "0.8.9",
  networks: {
    // 08:01:44 Adding Networks & 8:51:15 Deploy Verification
    localhost: {
      url: "http://127.0.0.1:8545/",
      chainId: 31337,
    }
  },
  defaultNetwork: "hardhat",
};
