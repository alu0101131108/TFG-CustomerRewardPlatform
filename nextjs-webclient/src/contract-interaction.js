import { ethers } from 'ethers';
import { RewardCenterAddress, RewardCenterABI, RewardPlanABI } from '../src/contract-data.js';

// Data fetching functions.
async function getRelatedContractAddresses(provider) {
  const signer = await provider.getSigner();
  const RewardCenter = new ethers.Contract(RewardCenterAddress, RewardCenterABI, signer);
  const addresses = await RewardCenter.getSelfRelatedPlans();

  return addresses;
}

async function getContractName(provider, target) {
  const signer = await provider.getSigner();
  const RewardCenter = new ethers.Contract(RewardCenterAddress, RewardCenterABI, signer);
  const planProfile = await RewardCenter.planRegistry(target);
  return planProfile.name;
}

// async function getContractHeaderData(provider, target) {
//   const signer = await provider.getSigner();
//   const RewardCenter = new ethers.Contract(RewardCenterAddress, RewardCenterABI, signer);
//   const planProfile = await RewardCenter.planRegistry(target);

//   return planProfile.name;
// }


function getContractAddress() {
  const contract_address = "0x000000000000000000000000000000000000000";
  return contract_address;
}
function getContractStage() {
  const contract_stage = 0;
  return contract_stage;
}
function getContractBalance() {
  const contract_balance = "1000000000000000000";
  return contract_balance;
}
function getContractTotalRewarded() {
  const contract_totalRewarded = '258123';
  return contract_totalRewarded;
}
function getContractRules() {
  const contract_rules = [
    {
      points: '1000',
      reward: '10000'
    },
    {
      points: '2000',
      reward: '20000'
    },
    {
      points: '3000',
      reward: '30000'
    }
  ];
  return contract_rules;
}
function getClientTotalRewards() {
  const totalRewards = '15000';
  return totalRewards;
}
function getClientScoredPoints() {
  const scoredPoints = '200';
  return scoredPoints;
}

module.exports = {
  getRelatedContractAddresses,
  getContractName,
  getContractAddress,
  getContractStage,
  getContractBalance,
  getContractTotalRewarded,
  getContractRules,
  getClientTotalRewards,
  getClientScoredPoints
};