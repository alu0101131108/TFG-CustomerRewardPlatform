const { ethers } = require('hardhat');
const { assert } = require('chai');
const { time, loadFixture } = require('@nomicfoundation/hardhat-network-helpers');
const { anyValue } = require('@nomicfoundation/hardhat-chai-matchers/withArgs');
const fs = require('fs');

// Get contract ABIs. Can also be taken from <ContractFactory>.interface.
const REWARD_CENTER_ABI = JSON.parse(fs.readFileSync('artifacts/contracts/RewardCenter.sol/RewardCenter.json', 'utf8')).abi;
const REWARD_PLAN_ABI = JSON.parse(fs.readFileSync('artifacts/contracts/RewardPlan.sol/RewardPlan.json', 'utf8')).abi;

async function getEventArguments(transaction, expectedEvent) {
  const rc = await transaction.wait();
  const event = rc.events.find(event => event.event = expectedEvent);
  return event.args;
}

async function rewardCenterDeployed() {
  const RewardCenter = await ethers.getContractFactory('RewardCenter');
  const rewardCenter = await RewardCenter.deploy();

  return { rewardCenter };
}

async function rewardPlanConstructionStage(creatorContribution = 1000, signPeriodDaysLimit = 1, transactionValue = ethers.utils.parseEther('1')) {
  const { rewardCenter } = await rewardCenterDeployed();

  const transaction = await rewardCenter.createRewardPlan(creatorContribution, signPeriodDaysLimit, { value: transactionValue });
  const [newPlanAddress] = await getEventArguments(transaction, 'RewardPlanCreated');

  const rewardPlan = await ethers.getContractAt("RewardPlan", newPlanAddress);

  return { rewardCenter, rewardPlan };
}

async function rewardPlanSigningStage() {
  const { rewardCenter, rewardPlan } = await rewardPlanConstructionStage();
  const transaction = await rewardPlan.sign();

  return { rewardCenter, rewardPlan, transaction };
}

async function rewardPlanActiveStage() {
}

async function rewardPlanDeprecatedStage() {
}

describe('Reward Platform', function () {


  describe('Standard flow of use', function () {

    it('Should deploy RewardCenter and initialize its attributes', async function () {
      const { rewardCenter } = await loadFixture(rewardCenterDeployed);
      assert(rewardCenter.address !== undefined);
      assert(await rewardCenter.clientRegistry !== undefined);
      assert(await rewardCenter.entityRegistry !== undefined);
      assert(await rewardCenter.planRegistry !== undefined);
      assert(await rewardCenter.entityRelatedPlans !== undefined);
    });

    it('Should deploy RewardPlan with an initial 0 stage', async function () {
      const { rewardCenter, rewardPlan } = await loadFixture(rewardPlanConstructionStage);
      assert(rewardPlan.address === '0xCafac3dD18aC6c6e92c921884f9E4176737C052c');

      const stage = await rewardPlan.stage();
      assert(stage === 0);
    });

    it('Should change RewardPlans stage to 2', async function () {
      const { rewardCenter, rewardPlan, transaction } = await loadFixture(rewardPlanSigningStage);
      const stage = await rewardPlan.stage();
      assert(stage === 2);
    });

  });

});
