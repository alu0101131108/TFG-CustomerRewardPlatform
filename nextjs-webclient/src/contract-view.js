import { ethers } from 'ethers';

const RewardCenterABI = require('../../Hardhat-Contracts/artifacts/contracts/RewardCenter.sol/RewardCenter.json').abi;  // require('./RewardCenter.json').abi;
const RewardPlanABI = require('../../Hardhat-Contracts/artifacts/contracts/RewardPlan.sol/RewardPlan.json').abi;        // require('./RewardPlan.json').abi;
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

async function getClientScoredPoints(provider, target) {
  const signer = await provider.getSigner();
  const signerAddress = await signer.getAddress();
  const RewardCenter = new ethers.Contract(RewardCenterAddress, RewardCenterABI, signer);
  const RewardPlan = new ethers.Contract(target, RewardPlanABI, signer);

  const clientID = await RewardCenter.clientAddressToId(signerAddress);
  const [active, points] = await RewardPlan.rewardPointsRegistry(clientID);

  return points.toString();
}

async function getContractRules(provider, target) {
  const signer = await provider.getSigner();
  const RewardPlan = new ethers.Contract(target, RewardPlanABI, signer);
  const rules = await RewardPlan.getRewardRules();

  return rules.map(rule => {
    return {
      points: rule[0].toString(),
      reward: rule[1].toString()
    };
  });
}

async function getFounderRelatedData(provider, target) {
  const signer = await provider.getSigner();
  const RewardPlan = new ethers.Contract(target, RewardPlanABI, signer);
  const isRefundable = await RewardPlan.isRefundable();
  const creator = await RewardPlan.creator();
  const stage = await RewardPlan.stage();
  const founders = await RewardPlan.getFounders();
  const notifiers = await RewardPlan.getNotifierAddresses();
  const canLeavePlan = creator !== await signer.getAddress();

  return {
    isRefundable,
    stage,
    founders: founders.map(founder => {
      return {
        address: founder[0],
        collaborationAmount: founder[1].toString(),
        signed: founder[2],
        isCreator: founder[0] === creator
      };
    }),
    notifiers,
    canLeavePlan
  };
}

async function getPlanStage(provider, target) {
  const signer = await provider.getSigner();
  const RewardPlan = new ethers.Contract(target, RewardPlanABI, signer);
  return await RewardPlan.stage();
}

module.exports = {
  getRewardCenterData,
  getRelatedPlansBasics,
  getPlanHeaderData,
  getRolesInPlan,
  getContractRules,
  getClientScoredPoints,
  getFounderRelatedData,
  getPlanStage
};