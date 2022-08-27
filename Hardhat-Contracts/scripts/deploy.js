const { ethers } = require('hardhat');

async function main() {
  const contractFactory = await ethers.getContractFactory('RewardCenter');
  console.log('Deploying contract...');
  const contract = await contractFactory.deploy();
  await contract.deployed();
  console.log(`Deployed contract to ${contract.address}`);
}

// Could add some deploy verification through chain explorer API.

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });