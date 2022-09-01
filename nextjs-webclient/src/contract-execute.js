import { ethers } from 'ethers';

const RewardCenterABI = require('../../Hardhat-Contracts/artifacts/contracts/RewardCenter.sol/RewardCenter.json').abi;
const RewardPlanABI = require('../../Hardhat-Contracts/artifacts/contracts/RewardPlan.sol/RewardPlan.json').abi;
const RewardCenterAddress = '0x5fbdb2315678afecb367f032d93f642f64180aa3';

async function createRewardPlan(provider, name, nonRefundableDays) {
  const signer = await provider.getSigner();
  const RewardCenter = new ethers.Contract(RewardCenterAddress, RewardCenterABI, signer);
  const createRewardPlanTx = await RewardCenter.createRewardPlan(nonRefundableDays, name);
  const receipt = await createRewardPlanTx.wait();
}

module.exports = {
  createRewardPlan
};