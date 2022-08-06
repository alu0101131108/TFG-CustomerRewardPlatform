// 8:50

// imports
const { ethers } = require('hardhat');

// async main
async function main() {
  const contractFactory = await ethers.getContractFactory('RewardCenter');
  console.log('Deploying contract...');
  const contract = await contractFactory.deploy();
  await contract.deployed();
  console.log(`Deployed contract to ${contract.address}`);

  // Deployment verification.

  // Use the contract instance to call a function.

}

async function verify(contractAddress, args) {

}

// main
main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });