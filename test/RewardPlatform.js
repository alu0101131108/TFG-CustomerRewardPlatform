const { ethers } = require('hardhat');
const { assert, expect } = require('chai');
const { time, loadFixture } = require('@nomicfoundation/hardhat-network-helpers');
const { anyValue } = require('@nomicfoundation/hardhat-chai-matchers/withArgs');
const { Contract } = require('ethers');

async function getEventArguments(transaction, expectedEvent) {
  const rc = await transaction.wait();
  const event = rc.events.find(event => event.event = expectedEvent);
  return event.args;
}

const Stages = {
  CONSTRUCTION: 0,
  SIGNING: 1,
  ACTIVE: 2,
  DEPRECATED: 3
}

const env = {};

describe('Expected flow of usage', function () {

  // it('', async function () {
  // });
  const creatorContribution = ethers.utils.parseEther('1');
  const entityBCollaborationAmount = ethers.utils.parseEther('1');
  const signStageNonRefundableDays = 30;

  describe('The Reward Center is deployed', function () {

    it('Accounts setting (async requirement)', async function () {
      [env.CenterAdmin, env.EntityA, env.EntityB, env.ClientA, env.ClientB, env.ClientC] = await ethers.getSigners();
    });

    it('Should deploy correctly', async function () {
      const RewardCenter = await ethers.getContractFactory('RewardCenter');
      env.rewardCenter = await RewardCenter.connect(env.CenterAdmin).deploy();
      // env.rewardCenter = await rewardCenter.connect(env.CenterAdmin);
      await env.rewardCenter.deployed();  // Waits untill the deploy transaction is mined.

      expect(env.rewardCenter).not.to.equal(undefined); // Could use a better expect sentence.
    });

    it('Should be able to call getContractBalance()', async function () {
      const balance = await env.rewardCenter.getContractBalance();

      expect(balance.toString()).to.equal("0");
    });

    it('Should be able to call getSelfRelatedPlans()', async function () {
      const selfRelatedPlans = await env.rewardCenter.getSelfRelatedPlans();

      expect(Array.isArray(selfRelatedPlans)).to.equal(true);
      expect(selfRelatedPlans.length).to.equal(0);
    });

  });

  // Construction
  describe('Entity A deploys a Reward Plan', function () {

    it('Should deploy correctly', async function () {
      // Could include chain verification with api
      env.signStageExpireTimestamp = await time.latest() + time.duration.days(signStageNonRefundableDays);
      env.rewardCenter = await env.rewardCenter.connect(env.EntityA);
      const createPlanTx = await env.rewardCenter.createRewardPlan(env.signStageExpireTimestamp, { value: creatorContribution });
      const [newPlanAddress] = await getEventArguments(createPlanTx, 'RewardPlanCreated');
      env.rewardPlan = await ethers.getContractAt("RewardPlan", newPlanAddress);
      env.rewardPlan = await env.rewardPlan.connect(env.EntityA);

      // const createPlanTxBlock = await ethers.getDefaultProvider().getBlock(createPlanTx.blockNumber); 
      env.planDeployTimestamp = await time.latest(); // createPlanTxBlock.timestamp;

      expect(env.rewardPlan).not.to.equal(undefined);
    });

    it('Should have the creator\'s founder struct', async function () {
      const creator = await env.rewardPlan.getCreator();

      expect(creator.addr).to.equal(env.EntityA.address);
    });

    it('Should have the founder\'s address', async function () {
      const founderAddresses = await env.rewardPlan.getFounderAddresses();

      expect(founderAddresses[0]).to.equal(env.EntityA.address);
    });

    it('Should have the creator contribution as initial balance', async function () {
      const initialBalance = await env.rewardPlan.getContractBalance();

      expect(initialBalance.toString()).to.equal(creatorContribution.toString());
    });

    it('Should be in the construction stage', async function () {
      const stage = await env.rewardPlan.stage();

      expect(stage).to.equal(Stages.CONSTRUCTION);
    });

    it('Should have the correct Reward Center address', async function () {
      const rewardCenterAddress = await env.rewardPlan.rewardCenter();

      expect(rewardCenterAddress).to.equal(env.rewardCenter.address);
    });

    it('Should have the specified time limit for the signing stage', async function () {
      const limit = await env.rewardPlan.signStageExpireTimestamp();
      const expectedLimit = env.signStageExpireTimestamp;
      expect(limit.toString()).to.equal(expectedLimit.toString());
    });

    it('Should have a correct deploy timestamp', async function () {
      const deployDate = await env.rewardPlan.deployDate();
      const expectedDeployDate = env.planDeployTimestamp;
      expect(deployDate.toString()).to.equal(expectedDeployDate.toString());
    });

    it('Should exist an Entity A profile at the Reward Center entity registry', async function () {
      const entityAProfile = await env.rewardCenter.entityRegistry(env.EntityA.address);

      expect(entityAProfile.active).to.equal(true);
      expect(entityAProfile.addr).to.equal(env.EntityA.address);
      expect(entityAProfile.runningPlans).to.equal(1);
    });

    it('Should have the plan address at Reward Center related plans registry', async function () {
      const selfRelatedPlans = await env.rewardCenter.getSelfRelatedPlans();

      expect(selfRelatedPlans.length).to.equal(1);
      expect(selfRelatedPlans[0]).to.equal(env.rewardPlan.address);
    });

    it('Should be able to access the plan\'s profile in Reward Center plan registry', async function () {
      const planProfile = await env.rewardCenter.planRegistry(env.rewardPlan.address);

      expect(planProfile.active).to.equal(true);
      expect(planProfile.creatorAddr).to.equal(env.EntityA.address);
      expect(planProfile.balance.toString()).to.equal(creatorContribution.toString());
    });

  });

  describe('Entity A adds Entity B as a founder', function () {

    it('Should emit an event when Entity B is added as founder', async function () {
      const addFounderTx = await env.rewardPlan.addFounder(env.EntityB.address, entityBCollaborationAmount);
      const [founderAddress, collaborationAmount] = await getEventArguments(addFounderTx, 'FounderAdded');

      expect(founderAddress).to.equal(env.EntityB.address);
      expect(collaborationAmount.toString()).to.equal(entityBCollaborationAmount.toString());
    });

    it('Should contain Entity B information in the founders array', async function () {
      const founderB = await env.rewardPlan.founders(1);

      expect(founderB.addr).to.equal(env.EntityB.address);
      expect(founderB.collaborationAmount.toString()).to.equal(entityBCollaborationAmount.toString());
      expect(founderB.signed).to.equal(false);
    });

    it('Should exist an Entity B profile at the Reward Center entity registry', async function () {
      const entityBProfile = await env.rewardCenter.entityRegistry(env.EntityB.address);

      expect(entityBProfile.active).to.equal(true);
      expect(entityBProfile.addr).to.equal(env.EntityB.address);
      expect(entityBProfile.runningPlans).to.equal(1);
    });

    it('Should have the plan address at Reward Center related plans registry', async function () {
      const selfRelatedPlans = await env.rewardCenter.connect(env.EntityB).getSelfRelatedPlans();

      expect(selfRelatedPlans.length).to.equal(1);
      expect(selfRelatedPlans[0]).to.equal(env.rewardPlan.address);
    });

  });

  describe('Entity A adds some spend rules', function () {

  });

  describe('Both founders add their notifier addresses', function () {

  });

  // Active
  describe('Both founders sign the plan, making it active', function () {

  });

  describe('Customers A, B and C perform rewardable actions', function () {

  });

  // Deprecated
  describe('The plan gets deprecated', function () {

  });
});