const RewardCenterJSON = require('../../Hardhat-Contracts/artifacts/contracts/RewardCenter.sol/RewardCenter.json');
const RewardPlanJSON = require('../../Hardhat-Contracts/artifacts/contracts/RewardPlan.sol/RewardPlan.json');
const RewardCenterABI = RewardCenterJSON.abi;
const RewardPlanABI = RewardPlanJSON.abi;
const RewardCenterAddress = '0x5fbdb2315678afecb367f032d93f642f64180aa3';

module.exports = { RewardCenterAddress, RewardCenterABI, RewardPlanABI };