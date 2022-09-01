import { ethers } from 'ethers';

const RewardCenterABI = require('../../Hardhat-Contracts/artifacts/contracts/RewardCenter.sol/RewardCenter.json').abi;
const RewardPlanABI = require('../../Hardhat-Contracts/artifacts/contracts/RewardPlan.sol/RewardPlan.json').abi;
const RewardCenterAddress = '0x5fbdb2315678afecb367f032d93f642f64180aa3';

async function getRewardCenterData(provider) {
  const signer = await provider.getSigner();
  const signerAddress = await signer.getAddress();
  const RewardCenter = new ethers.Contract(RewardCenterAddress, RewardCenterABI, signer);

  const clientID = await RewardCenter.clientAddressToId(signerAddress);
  const [isClient, _, totalRewardsRecieved] = await RewardCenter.clientRegistry(clientID);
  const [isEntity, __, runningPlans] = await RewardCenter.entityRegistry(signerAddress);

  return {
    isClient,
    clientID: clientID.toString(),
    totalRewardsRecieved: totalRewardsRecieved.toString(),
    isEntity,
    runningPlans: runningPlans.toString()
  };
}

async function getRelatedPlansBasics(provider) {
  const signer = await provider.getSigner();
  const RewardCenter = new ethers.Contract(RewardCenterAddress, RewardCenterABI, signer);
  const addresses = await RewardCenter.getSelfRelatedPlans();

  const result = await Promise.all(addresses.map(async (address, index) => {
    const planProfile = await RewardCenter.planRegistry(address);
    return {
      address: address,
      name: planProfile.name
    };
  }));

  return result;
}

async function getPlanHeaderData(provider, target) {
  const signer = await provider.getSigner();
  const RewardCenter = new ethers.Contract(RewardCenterAddress, RewardCenterABI, signer);
  const planProfile = await RewardCenter.planRegistry(target);
  return {
    address: target,
    balance: await provider.getBalance(target),
    totalRewarded: planProfile.totalRewarded,
    stage: await RewardCenter.getPlanStage(target)
  };
}

async function getRolesInPlan(provider, target) {
  const signer = await provider.getSigner();
  const RewardCenter = new ethers.Contract(RewardCenterAddress, RewardCenterABI, signer);
  const [isClient, isFounder, isNotifier] = await RewardCenter.checkRolesInPlan(target);
  return {
    isClient,
    isFounder,
    isNotifier,
  };
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
function getClientScoredPoints() {
  const scoredPoints = '200';
  return scoredPoints;
}

module.exports = {
  getRewardCenterData,
  getRelatedPlansBasics,
  getPlanHeaderData,
  getRolesInPlan,
  getContractRules,
  getClientScoredPoints
};