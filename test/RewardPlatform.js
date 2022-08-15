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

const env = {
  EntityA: {}
};

describe('Expected flow of usage', function () {

  // it('', async function () {
  // });
  const creatorContribution = 1000;  // milliethers.
  const signPeriodDaysLimit = 1;
  const createPlanTxValue = ethers.utils.parseEther('1');

  describe('The Reward Center is deployed', function () {

    it('Should deploy correctly', async function () {
      const RewardCenter = await ethers.getContractFactory('RewardCenter');
      env.rewardCenter = await RewardCenter.deploy();
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
      const createPlanTx = await env.rewardCenter.createRewardPlan(creatorContribution, signPeriodDaysLimit, { value: createPlanTxValue });
      const [newPlanAddress] = await getEventArguments(createPlanTx, 'RewardPlanCreated');
      env.rewardPlan = await ethers.getContractAt("RewardPlan", newPlanAddress);

      expect(env.rewardPlan).not.to.equal(undefined);

      env.EntityA.address = createPlanTx.from;
      // const createPlanTxBlock = await ethers.getDefaultProvider().getBlock(createPlanTx.blockNumber);
      env.planDeployTimestamp = await time.latest(); // createPlanTxBlock.timestamp;
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

      expect(initialBalance.toString()).to.equal(createPlanTxValue.toString()); // Should be creatorContribution.
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
      const limit = await env.rewardPlan.signPeriodTimeLimit();
      const expectedLimit = time.duration.days(signPeriodDaysLimit);
      expect(limit.toString()).to.equal(expectedLimit.toString());
    });

    it('Should have a correct deploy timestamp', async function () {
      const deployDate = await env.rewardPlan.deployDate();
      const expectedDeployDate = env.planDeployTimestamp;
      expect(deployDate.toString()).to.equal(expectedDeployDate.toString());
    });

  });

  describe('Entity A adds Entity B as a founder', function () {

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
