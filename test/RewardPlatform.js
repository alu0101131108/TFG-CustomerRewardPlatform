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

const creatorContribution = ethers.utils.parseEther('1');
const entityBCollaborationAmount = ethers.utils.parseEther('1');
const signStageNonRefundableDays = 30;
const spendRules = {
  A: {
    spend: ethers.BigNumber.from('100'),
    reward: ethers.BigNumber.from('1000')
  },
  B: {
    spend: ethers.BigNumber.from('10000'),
    reward: ethers.BigNumber.from('150000')
  },
  C: {
    spend: ethers.BigNumber.from('1000'),
    reward: ethers.BigNumber.from('15000')
  },
  D: {
    spend: ethers.BigNumber.from('1000000'),
    reward: ethers.BigNumber.from('1000000000000000000')
  }
}

const env = {};


describe('Expected flow of usage', function () {

  it('Accounts setting (async requirement)', async function () {
    [env.CenterAdmin, env.EntityA, env.EntityB, env.ClientA, env.ClientB, env.NotifierA, env.NotifierB] = await ethers.getSigners();
    env.ClientA.id = ethers.BigNumber.from('11111111');
    env.ClientB.id = ethers.BigNumber.from('99999999');
  });

  describe('The Reward Center is deployed', function () {

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

  describe('Entities A and B add some spend rules', function () {
    it('Should emit an event when Entity A adds a spend rule', async function () {
      env.rewardPlan = await env.rewardPlan.connect(env.EntityA);
      const addSpendRuleTx = await env.rewardPlan.addSpendRule(spendRules.A.spend, spendRules.A.reward);
      const [founder, spend, reward] = await getEventArguments(addSpendRuleTx, 'SpendRuleAdded');

      expect(founder).to.equal(env.EntityA.address);
      expect(spend.toString()).to.equal(spendRules.A.spend.toString());
      expect(reward.toString()).to.equal(spendRules.A.reward.toString());
    });

    it('Should emit an event when Entity B adds a spend rule', async function () {
      env.rewardPlan = await env.rewardPlan.connect(env.EntityB);
      const addSpendRuleTx = await env.rewardPlan.addSpendRule(spendRules.B.spend, spendRules.B.reward);
      const [founder, spend, reward] = await getEventArguments(addSpendRuleTx, 'SpendRuleAdded');

      expect(founder).to.equal(env.EntityB.address);
      expect(spend.toString()).to.equal(spendRules.B.spend.toString());
      expect(reward.toString()).to.equal(spendRules.B.reward.toString());
    });

    it('Should mantain spend rules array sorted from low to high spends', async function () {
      const addSpendRuleCTx = await env.rewardPlan.addSpendRule(spendRules.C.spend, spendRules.C.reward);
      const addSpendRuleDTx = await env.rewardPlan.addSpendRule(spendRules.D.spend, spendRules.D.reward);

      const CSpendRule = await env.rewardPlan.spendRules(1);
      const DSpendRule = await env.rewardPlan.spendRules(3);

      expect(CSpendRule.spends.toString()).to.equal(spendRules.C.spend.toString());
      expect(CSpendRule.reward.toString()).to.equal(spendRules.C.reward.toString());
      expect(DSpendRule.spends.toString()).to.equal(spendRules.D.spend.toString());
      expect(DSpendRule.reward.toString()).to.equal(spendRules.D.reward.toString());
    });

  });

  describe('Both founders add their notifier addresses', function () {
    it('Should add entity A\'s notifier', async function () {
      env.rewardPlan = await env.rewardPlan.connect(env.EntityA);
      const addNotifierTx = await env.rewardPlan.addNotifier(env.NotifierA.address);
      const [notifierAddress] = await getEventArguments(addNotifierTx, 'NotifierAdded');

      expect(notifierAddress).to.equal(env.NotifierA.address);

      const notifier = await env.rewardPlan.notifiers(env.NotifierA.address);

      expect(notifier.addedBy).to.equal(env.EntityA.address);
      expect(notifier.active).to.equal(true);
    });

    it('Should add entity B\'s notifier', async function () {
      env.rewardPlan = await env.rewardPlan.connect(env.EntityB);
      const addNotifierTx = await env.rewardPlan.addNotifier(env.NotifierB.address);
      const [notifierAddress] = await getEventArguments(addNotifierTx, 'NotifierAdded');

      expect(notifierAddress).to.equal(env.NotifierB.address);

      const notifier = await env.rewardPlan.notifiers(env.NotifierB.address);

      expect(notifier.addedBy).to.equal(env.EntityB.address);
      expect(notifier.active).to.equal(true);
    });
  });

  // Active
  describe('Both founders sign the plan, making it active', function () {
    it('Should emit an event when Entity A signs the plan', async function () {
      env.rewardPlan = await env.rewardPlan.connect(env.EntityA);
      const signTx = await env.rewardPlan.sign();
      const [signer, allSigned] = await getEventArguments(signTx, 'FounderSigned');

      expect(signer).to.equal(env.EntityA.address);
      expect(allSigned).to.equal(false);
    });

    it('Should have a SIGNING stage', async function () {
      const stage = await env.rewardPlan.stage();

      expect(stage).to.equal(Stages.SIGNING);
    });

    it('Should emit an event when Entity B signs the plan', async function () {
      env.rewardPlan = await env.rewardPlan.connect(env.EntityB);
      const signTx = await env.rewardPlan.sign({ value: entityBCollaborationAmount });
      const [signer, allSigned] = await getEventArguments(signTx, 'FounderSigned');

      expect(signer).to.equal(env.EntityB.address);
      expect(allSigned).to.equal(true);
    });

    it('Should be in the active stage now', async function () {
      const stage = await env.rewardPlan.stage();

      expect(stage).to.equal(Stages.ACTIVE);
    });

    it('Should update the plan\'s balance in the Reward Center plan registry', async function () {
      const planProfile = await env.rewardCenter.planRegistry(env.rewardPlan.address);
      const expectedBalance = creatorContribution.add(entityBCollaborationAmount);

      expect(planProfile.balance.toString()).to.equal(expectedBalance.toString());
    });
  });

  describe('Clients A and B get signed up to the platform', function () {
    it('Should emit an event when client A is signed up by Notifier A', async function () {
      env.rewardPlan = env.rewardPlan.connect(env.NotifierA);
      const signUpTx = await env.rewardPlan.signUpClient(env.ClientA.id, env.ClientA.address);
      const [clientId, clientAddress] = await getEventArguments(signUpTx, 'ClientSignedUp');

      expect(clientId.toString()).to.equal(env.ClientA.id.toString());
      expect(clientAddress).to.equal(env.ClientA.address);
    });

    it('Should emit an event when client B is signed up by Notifier B', async function () {
      env.rewardPlan = env.rewardPlan.connect(env.NotifierB);
      const signUpTx = await env.rewardPlan.signUpClient(env.ClientB.id, env.ClientB.address);
      const [clientId, clientAddress] = await getEventArguments(signUpTx, 'ClientSignedUp');

      expect(clientId.toString()).to.equal(env.ClientB.id.toString());
      expect(clientAddress).to.equal(env.ClientB.address);
    });

    it('Client A and B should appear in the Reward Center clients registry', async function () {
      const profileA = await env.rewardCenter.clientRegistry(env.ClientA.id);
      const profileB = await env.rewardCenter.clientRegistry(env.ClientB.id);

      expect(profileA.active).to.equal(true);
      expect(profileA.addr).to.equal(env.ClientA.address);
      expect(profileA.balance.toString()).to.equal('0');

      expect(profileB.active).to.equal(true);
      expect(profileB.addr).to.equal(env.ClientB.address);
      expect(profileB.balance.toString()).to.equal('0');
    });
  });

  describe('Client A spends 50€ two consecutive times', function () {
    it('Should emit an event when the spends are notified', async function () {
      env.rewardPlan = env.rewardPlan.connect(env.NotifierA);
      const notifyAmountSpentTx = await env.rewardPlan.notifyAmountSpent(env.ClientA.id, '50');
      const [clientId, amountSpent, totalRewarded] = await getEventArguments(notifyAmountSpentTx, 'AmountSpent');

      expect(clientId.toString()).to.equal(env.ClientA.id.toString());
      expect(amountSpent.toString()).to.equal('50');
      expect(totalRewarded.toString()).to.equal('0');
    });

    it('Should be accumulating spends in the plans spend registry', async function () {
      const clientSpends = await env.rewardPlan.clientSpendsRegistry(env.ClientA.id);

      expect(clientSpends.active).to.equal(true);
      expect(clientSpends.spends.toString()).to.equal('50');
    });

    it('Should reward ClientA, since its spends meet a reward', async function () {
      env.rewardPlan = env.rewardPlan.connect(env.NotifierA);
      const notifyAmountSpentTx = await env.rewardPlan.notifyAmountSpent(env.ClientA.id, '50');
      const [clientId, amountSpent, totalRewarded] = await getEventArguments(notifyAmountSpentTx, 'AmountSpent');

      expect(totalRewarded.toString()).to.equal(spendRules.A.reward.toString());
    });

    it('Should subtract the rewarded spends from the plans spends registry', async function () {
      const clientSpends = await env.rewardPlan.clientSpendsRegistry(env.ClientA.id);

      expect(clientSpends.active).to.equal(true);
      expect(clientSpends.spends.toString()).to.equal('0');
    });

    it('Should update the clients balance in the Reward Center client registry', async function () {
      const clientProfile = await env.rewardCenter.clientRegistry(env.ClientA.id);

      expect(clientProfile.balance.toString()).to.equal(spendRules.A.reward.toString());
    });

    it('Should reduce the plans balance by the amount of the rewards given', async function () {
      const planProfile = await env.rewardCenter.planRegistry(env.rewardPlan.address);

      expect(planProfile.balance.toString()).to.equal(
        creatorContribution.add(entityBCollaborationAmount).sub(spendRules.A.reward).toString()
      );
    });
  });

  describe('Client B Spends 11250 at once meeting multiple rewards', function () {
    it('Should emit an event when the spends are notified', async function () {
      env.rewardPlan = env.rewardPlan.connect(env.NotifierB);
      const notifyAmountSpentTx = await env.rewardPlan.notifyAmountSpent(env.ClientB.id, '11250');
      const [clientId, amountSpent, totalRewarded] = await getEventArguments(notifyAmountSpentTx, 'AmountSpent');

      expect(clientId.toString()).to.equal(env.ClientB.id.toString());
      expect(amountSpent.toString()).to.equal('11250');
      expect(totalRewarded.toString()).to.equal('167000');  // 150000 + 1500 + 1000 + 1000.
    });

    it('Should subtract the rewarded spends from the plans spends registry', async function () {
      const clientSpends = await env.rewardPlan.clientSpendsRegistry(env.ClientB.id);

      expect(clientSpends.active).to.equal(true);
      expect(clientSpends.spends.toString()).to.equal('50');  // What is left.
    });

    it('Should update the clients balance in the Reward Center client registry', async function () {
      const clientProfile = await env.rewardCenter.clientRegistry(env.ClientB.id);

      expect(clientProfile.balance.toString()).to.equal('167000');
    });

    it('Should reduce the plans balance by the amount of the rewards given', async function () {
      const planProfile = await env.rewardCenter.planRegistry(env.rewardPlan.address);

      expect(planProfile.balance.toString()).to.equal(
        creatorContribution.add(entityBCollaborationAmount).sub(spendRules.A.reward.add('167000')).toString()
      );
    });
  });

  // Deprecated
  describe('The plan runs out of rewarding balance', function () {
    it('Should reward as much as the plans balance allowes', async function () {
      const planProfile = await env.rewardCenter.planRegistry(env.rewardPlan.address);
      const planBalancePreRewarding = planProfile.balance;

      // Limited reward, because it would exceed the plan balance.
      env.rewardPlan = env.rewardPlan.connect(env.NotifierA);
      const notifyAmountSpentTx = await env.rewardPlan.notifyAmountSpent(env.ClientA.id, '5000000');
      const [clientId, amountSpent, totalRewarded] = await getEventArguments(notifyAmountSpentTx, 'AmountSpent');

      expect(amountSpent.toString()).to.equal('5000000');
      expect(totalRewarded.toString()).to.equal(planBalancePreRewarding.toString());
    });

    it('Should deprecate the plan', async function () {
      const stage = await env.rewardPlan.stage();

      expect(stage).to.equal(Stages.DEPRECATED);
    });

    it('Should be reflected in the Reward Center plans registry', async function () {
      const planProfile = await env.rewardCenter.planRegistry(env.rewardPlan.address);

      expect(planProfile.active).to.equal(false);
      expect(planProfile.balance.toString()).to.equal('0');
    });

    it('Should also sign out both entities from Reward Center registry', async function () {
      const entityAProfile = await env.rewardCenter.clientRegistry(env.EntityA.address);
      const entityBProfile = await env.rewardCenter.clientRegistry(env.EntityB.address);

      expect(entityAProfile.active).to.equal(false);
      expect(entityBProfile.active).to.equal(false);
    });
  });

  describe('Test', function () {
    it('Test', async function () {
      const rpEthBalance = await env.rewardPlan.getContractBalance();
      console.log("RP: ", rpEthBalance.toString());
    });
  });
});