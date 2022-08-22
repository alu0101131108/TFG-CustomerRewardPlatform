const { ethers } = require('hardhat');
const { expect } = require('chai');
const { time, loadFixture } = require('@nomicfoundation/hardhat-network-helpers');
const { getEventArguments, Stages } = require('../scripts/common');


const env = {
  CenterAdmin: undefined,
  Entity: {
    setup: {
      collaborationA: ethers.utils.parseEther('1'),
      collaborationB: ethers.utils.parseEther('1')
    }
  },
  Notifier: {},
  Client: {
    setup: {
      idA: ethers.BigNumber.from('11111111'),
      idB: ethers.BigNumber.from('99999999')
    }
  },
  nonRefundableDuration: time.duration.days(30),
  planRules: {
    A: {
      points: ethers.BigNumber.from('100'),
      reward: ethers.BigNumber.from('10000000000000') // wei -> 0.01 eur.
    },
    B: {
      points: ethers.BigNumber.from('10000'),
      reward: ethers.BigNumber.from('6000000000000000') // wei -> 10 eur.
    },
    C: {
      points: ethers.BigNumber.from('1000'),
      reward: ethers.BigNumber.from('35000000000000') // wei -> 0.5 eur.
    },
    D: {
      points: ethers.BigNumber.from('1000000'),
      reward: ethers.BigNumber.from('1000000000000000000')  // 1 eth -> 1618 eur.
    }
  }
};

describe('Tests for Reward Platform', function () {
  it('Async tests setup', async function () {
    [env.CenterAdmin, env.Entity.A, env.Entity.B, env.Client.A, env.Client.B, env.Notifier.A, env.Notifier.B] = await ethers.getSigners();
    env.Client.A.id = env.Client.setup.idA;
    env.Client.B.id = env.Client.setup.idB;
    env.Entity.A.collaboration = env.Entity.setup.collaborationA;
    env.Entity.B.collaboration = env.Entity.setup.collaborationB;
  });

  describe('Expected flow of usage', function () {

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
        env.rewardCenter = await env.rewardCenter.connect(env.Entity.A);
        const createPlanTx = await env.rewardCenter.createRewardPlan(env.nonRefundableDuration);
        const [newPlanAddress] = await getEventArguments(createPlanTx, 'RewardPlanCreated');
        env.rewardPlan = await ethers.getContractAt("RewardPlan", newPlanAddress);
        env.rewardPlan = await env.rewardPlan.connect(env.Entity.A);

        // const createPlanTxBlock = await ethers.getDefaultProvider().getBlock(createPlanTx.blockNumber); 
        env.planDeployTimestamp = await time.latest(); // createPlanTxBlock.timestamp;

        expect(env.rewardPlan).not.to.equal(undefined);
      });

      it('Should have the creator\'s address', async function () {
        const creator = await env.rewardPlan.creator();

        expect(creator).to.equal(env.Entity.A.address);
      });

      it('Should not have any founders', async function () {
        const founderAddresses = await env.rewardPlan.getFounderAddresses();

        expect(Array.isArray(founderAddresses) && founderAddresses.length === 0).to.equal(true);
      });

      it('Should have zero wei as initial balance', async function () {
        const initialBalance = await env.rewardPlan.getContractBalance();

        expect(initialBalance.toString()).to.equal('0');
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
        const limit = await env.rewardPlan.nonRefundableDuration();
        const expectedLimit = env.nonRefundableDuration;
        expect(limit.toString()).to.equal(expectedLimit.toString());
      });

      it('Should have a correct deploy timestamp', async function () {
        const allowRefundTimestamp = await env.rewardPlan.allowRefundTimestamp();
        const expectedAllowRefundTimestamp = env.planDeployTimestamp + env.nonRefundableDuration;
        expect(allowRefundTimestamp.toString()).to.equal(expectedAllowRefundTimestamp.toString());
      });

      it('Should exist an Entity A profile at the Reward Center entity registry', async function () {
        const entityAProfile = await env.rewardCenter.entityRegistry(env.Entity.A.address);

        expect(entityAProfile.active).to.equal(true);
        expect(entityAProfile.addr).to.equal(env.Entity.A.address);
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
        expect(planProfile.creatorAddr).to.equal(env.Entity.A.address);
        expect(planProfile.totalRewarded.toString()).to.equal('0');
      });

    });

    describe('Entity A adds itself as a founder', function () {

      it('Should emit an event when Entity A is added as founder', async function () {
        const addFounderTx = await env.rewardPlan.addFounder(env.Entity.A.address, env.Entity.A.collaboration);
        const [founderAddress, collaborationAmount] = await getEventArguments(addFounderTx, 'FounderAdded');

        expect(founderAddress).to.equal(env.Entity.A.address);
        expect(collaborationAmount.toString()).to.equal(env.Entity.A.collaboration.toString());
      });

      it('Should contain Entity A information in the founders array', async function () {
        const founderA = await env.rewardPlan.founders(0);

        expect(founderA.addr).to.equal(env.Entity.A.address);
        expect(founderA.collaborationAmount.toString()).to.equal(env.Entity.A.collaboration.toString());
        expect(founderA.signed).to.equal(false);
      });

      it('Should have the plan address at Reward Center related plans registry', async function () {
        const selfRelatedPlans = await env.rewardCenter.connect(env.Entity.A).getSelfRelatedPlans();

        expect(selfRelatedPlans.length).to.equal(1);
        expect(selfRelatedPlans[0]).to.equal(env.rewardPlan.address);
      });

    });

    describe('Entity A adds Entity B as a founder', function () {

      it('Should emit an event when Entity B is added as founder', async function () {
        const addFounderTx = await env.rewardPlan.addFounder(env.Entity.B.address, env.Entity.B.collaboration);
        const [founderAddress, collaborationAmount] = await getEventArguments(addFounderTx, 'FounderAdded');

        expect(founderAddress).to.equal(env.Entity.B.address);
        expect(collaborationAmount.toString()).to.equal(env.Entity.B.collaboration.toString());
      });

      it('Should contain Entity B information in the founders array', async function () {
        const founderB = await env.rewardPlan.founders(1);

        expect(founderB.addr).to.equal(env.Entity.B.address);
        expect(founderB.collaborationAmount.toString()).to.equal(env.Entity.B.collaboration.toString());
        expect(founderB.signed).to.equal(false);
      });

      it('Should exist an Entity B profile at the Reward Center entity registry', async function () {
        const entityBProfile = await env.rewardCenter.entityRegistry(env.Entity.B.address);

        expect(entityBProfile.active).to.equal(true);
        expect(entityBProfile.addr).to.equal(env.Entity.B.address);
        expect(entityBProfile.runningPlans).to.equal(1);
      });

      it('Should have the plan address at Reward Center related plans registry', async function () {
        const selfRelatedPlans = await env.rewardCenter.connect(env.Entity.B).getSelfRelatedPlans();

        expect(selfRelatedPlans.length).to.equal(1);
        expect(selfRelatedPlans[0]).to.equal(env.rewardPlan.address);
      });

    });

    describe('Entities A and B add some points rules', function () {
      it('Should emit an event when Entity A adds a points rule', async function () {
        env.rewardPlan = await env.rewardPlan.connect(env.Entity.A);
        const addSpendRuleTx = await env.rewardPlan.addSpendRule(env.planRules.A.points, env.planRules.A.reward);
        const [founder, points, reward] = await getEventArguments(addSpendRuleTx, 'SpendRuleAdded');

        expect(founder).to.equal(env.Entity.A.address);
        expect(points.toString()).to.equal(env.planRules.A.points.toString());
        expect(reward.toString()).to.equal(env.planRules.A.reward.toString());
      });

      it('Should emit an event when Entity B adds a points rule', async function () {
        env.rewardPlan = await env.rewardPlan.connect(env.Entity.B);
        const addSpendRuleTx = await env.rewardPlan.addSpendRule(env.planRules.B.points, env.planRules.B.reward);
        const [founder, points, reward] = await getEventArguments(addSpendRuleTx, 'SpendRuleAdded');

        expect(founder).to.equal(env.Entity.B.address);
        expect(points.toString()).to.equal(env.planRules.B.points.toString());
        expect(reward.toString()).to.equal(env.planRules.B.reward.toString());
      });

      it('Should mantain points rules array sorted from low to high spends', async function () {
        const addSpendRuleCTx = await env.rewardPlan.addSpendRule(env.planRules.C.points, env.planRules.C.reward);
        const addSpendRuleDTx = await env.rewardPlan.addSpendRule(env.planRules.D.points, env.planRules.D.reward);

        const CSpendRule = await env.rewardPlan.rewardPointsRules(1);
        const DSpendRule = await env.rewardPlan.rewardPointsRules(3);

        expect(CSpendRule.points.toString()).to.equal(env.planRules.C.points.toString());
        expect(CSpendRule.reward.toString()).to.equal(env.planRules.C.reward.toString());
        expect(DSpendRule.points.toString()).to.equal(env.planRules.D.points.toString());
        expect(DSpendRule.reward.toString()).to.equal(env.planRules.D.reward.toString());
      });

    });

    describe('Both founders add their notifier addresses', function () {
      it('Should add entity A\'s notifier', async function () {
        env.rewardPlan = await env.rewardPlan.connect(env.Entity.A);
        const addNotifierTx = await env.rewardPlan.addNotifier(env.Notifier.A.address);
        const [notifierAddress] = await getEventArguments(addNotifierTx, 'NotifierAdded');

        expect(notifierAddress).to.equal(env.Notifier.A.address);

        const notifier = await env.rewardPlan.notifiers(env.Notifier.A.address);

        expect(notifier.addedBy).to.equal(env.Entity.A.address);
        expect(notifier.active).to.equal(true);
      });

      it('Should add entity B\'s notifier', async function () {
        env.rewardPlan = await env.rewardPlan.connect(env.Entity.B);
        const addNotifierTx = await env.rewardPlan.addNotifier(env.Notifier.B.address);
        const [notifierAddress] = await getEventArguments(addNotifierTx, 'NotifierAdded');

        expect(notifierAddress).to.equal(env.Notifier.B.address);

        const notifier = await env.rewardPlan.notifiers(env.Notifier.B.address);

        expect(notifier.addedBy).to.equal(env.Entity.B.address);
        expect(notifier.active).to.equal(true);
      });
    });

    // // Signing
    // describe('Founder A signs the plan, making it transit to the SIGNING stage', function () {
    //   it('Should emit an event when Entity A signs the plan', async function () {
    //     env.rewardPlan = await env.rewardPlan.connect(env.Entity.A);
    //     const signTx = await env.rewardPlan.sign();
    //     const [signer, allSigned] = await getEventArguments(signTx, 'FounderSigned');

    //     expect(signer).to.equal(env.Entity.A.address);
    //     expect(allSigned).to.equal(false);
    //   });

    //   it('Should have a SIGNING stage', async function () {
    //     const stage = await env.rewardPlan.stage();

    //     expect(stage).to.equal(Stages.SIGNING);
    //   });

    //   it('Should not be able to call the refund method', async function () {
    //     env.rewardPlan = await env.rewardPlan.connect(env.Entity.A);
    //     let failed = false;
    //     try {
    //       await env.rewardPlan.signPeriodExpiredRefund();
    //     }
    //     catch (error) {
    //       failed = true;
    //     }
    //     expect(failed).to.equal(true);
    //   });
    // });

    // // Active
    // describe('Founder B sign the plan, making it transit to the ACTIVE stage', function () {
    //   it('Should emit an event when Entity B signs the plan', async function () {
    //     env.rewardPlan = await env.rewardPlan.connect(env.Entity.B);
    //     const signTx = await env.rewardPlan.sign({ value: env.Entity.B.collaboration });
    //     const [signer, allSigned] = await getEventArguments(signTx, 'FounderSigned');

    //     expect(signer).to.equal(env.Entity.B.address);
    //     expect(allSigned).to.equal(true);
    //   });

    //   it('Should be in the active stage now', async function () {
    //     const stage = await env.rewardPlan.stage();

    //     expect(stage).to.equal(Stages.ACTIVE);
    //   });

    //   it('Should update the plan\'s balance in the Reward Center plan registry', async function () {
    //     const planProfile = await env.rewardCenter.planRegistry(env.rewardPlan.address);
    //     const expectedBalance = creatorContribution.add(env.Entity.B.collaboration);

    //     expect(planProfile.balance.toString()).to.equal(expectedBalance.toString());
    //   });
    // });

    // describe('Clients A and B get signed up to the platform', function () {
    //   it('Should emit an event when client A is signed up by Notifier A', async function () {
    //     env.rewardPlan = env.rewardPlan.connect(env.Notifier.A);
    //     const signUpTx = await env.rewardPlan.signUpClient(env.Client.A.id, env.Client.A.address);
    //     const [clientId, clientAddress] = await getEventArguments(signUpTx, 'ClientSignedUp');

    //     expect(clientId.toString()).to.equal(env.Client.A.id.toString());
    //     expect(clientAddress).to.equal(env.Client.A.address);
    //   });

    //   it('Should emit an event when client B is signed up by Notifier B', async function () {
    //     env.rewardPlan = env.rewardPlan.connect(env.Notifier.B);
    //     const signUpTx = await env.rewardPlan.signUpClient(env.Client.B.id, env.Client.B.address);
    //     const [clientId, clientAddress] = await getEventArguments(signUpTx, 'ClientSignedUp');

    //     expect(clientId.toString()).to.equal(env.Client.B.id.toString());
    //     expect(clientAddress).to.equal(env.Client.B.address);
    //   });

    //   it('Client A and B should appear in the Reward Center clients registry', async function () {
    //     const profileA = await env.rewardCenter.clientRegistry(env.Client.A.id);
    //     const profileB = await env.rewardCenter.clientRegistry(env.Client.B.id);

    //     expect(profileA.active).to.equal(true);
    //     expect(profileA.addr).to.equal(env.Client.A.address);
    //     expect(profileA.balance.toString()).to.equal('0');

    //     expect(profileB.active).to.equal(true);
    //     expect(profileB.addr).to.equal(env.Client.B.address);
    //     expect(profileB.balance.toString()).to.equal('0');
    //   });
    // });

    // describe('Client A spends 50€ two consecutive times', function () {
    //   it('Should emit an event when the spends are notified', async function () {
    //     env.rewardPlan = env.rewardPlan.connect(env.Notifier.A);
    //     const notifyAmountSpentTx = await env.rewardPlan.notifyAmountSpent(env.Client.A.id, '50');
    //     const [clientId, amountSpent, totalRewarded] = await getEventArguments(notifyAmountSpentTx, 'AmountSpent');

    //     expect(clientId.toString()).to.equal(env.Client.A.id.toString());
    //     expect(amountSpent.toString()).to.equal('50');
    //     expect(totalRewarded.toString()).to.equal('0');
    //   });

    //   it('Should be accumulating spends in the plans points registry', async function () {
    //     const clientSpends = await env.rewardPlan.clientSpendsRegistry(env.Client.A.id);

    //     expect(clientSpends.active).to.equal(true);
    //     expect(clientSpends.points.toString()).to.equal('50');
    //   });

    //   it('Should reward ClientA, since its spends meet a reward', async function () {
    //     env.rewardPlan = env.rewardPlan.connect(env.Notifier.A);
    //     const notifyAmountSpentTx = await env.rewardPlan.notifyAmountSpent(env.Client.A.id, '50');
    //     const [clientId, amountSpent, totalRewarded] = await getEventArguments(notifyAmountSpentTx, 'AmountSpent');

    //     expect(totalRewarded.toString()).to.equal(env.planRules.A.reward.toString());
    //   });

    //   it('Should subtract the rewarded spends from the plans spends registry', async function () {
    //     const clientSpends = await env.rewardPlan.clientSpendsRegistry(env.Client.A.id);

    //     expect(clientSpends.active).to.equal(true);
    //     expect(clientSpends.points.toString()).to.equal('0');
    //   });

    //   it('Should update the clients balance in the Reward Center client registry', async function () {
    //     const clientProfile = await env.rewardCenter.clientRegistry(env.Client.A.id);

    //     expect(clientProfile.balance.toString()).to.equal(env.planRules.A.reward.toString());
    //   });

    //   it('Should reduce the plans balance by the amount of the rewards given', async function () {
    //     const planProfile = await env.rewardCenter.planRegistry(env.rewardPlan.address);

    //     expect(planProfile.balance.toString()).to.equal(
    //       creatorContribution.add(env.Entity.B.collaboration).sub(env.planRules.A.reward).toString()
    //     );
    //   });
    // });

    // describe('Client B Spends 11250 at once meeting multiple rewards', function () {
    //   it('Should emit an event when the spends are notified', async function () {
    //     env.rewardPlan = env.rewardPlan.connect(env.Notifier.B);
    //     const notifyAmountSpentTx = await env.rewardPlan.notifyAmountSpent(env.Client.B.id, '11250');
    //     const [clientId, amountSpent, totalRewarded] = await getEventArguments(notifyAmountSpentTx, 'AmountSpent');

    //     expect(clientId.toString()).to.equal(env.Client.B.id.toString());
    //     expect(amountSpent.toString()).to.equal('11250');
    //     expect(totalRewarded.toString()).to.equal('167000');  // 1500000000000000 + 1500 + 1000 + 1000.
    //   });

    //   it('Should subtract the rewarded spends from the plans spends registry', async function () {
    //     const clientSpends = await env.rewardPlan.clientSpendsRegistry(env.Client.B.id);

    //     expect(clientSpends.active).to.equal(true);
    //     expect(clientSpends.points.toString()).to.equal('50');  // What is left.
    //   });

    //   it('Should update the clients balance in the Reward Center client registry', async function () {
    //     const clientProfile = await env.rewardCenter.clientRegistry(env.Client.B.id);

    //     expect(clientProfile.balance.toString()).to.equal('167000');
    //   });

    //   it('Should reduce the plans balance by the amount of the rewards given', async function () {
    //     const planProfile = await env.rewardCenter.planRegistry(env.rewardPlan.address);

    //     expect(planProfile.balance.toString()).to.equal(
    //       creatorContribution.add(env.Entity.B.collaboration).sub(env.planRules.A.reward.add('167000')).toString()
    //     );
    //   });
    // });

    // // Deprecated
    // describe('The plan runs out of rewarding balance', function () {
    //   it('Should reward as much as the plans balance allowes', async function () {
    //     const planProfile = await env.rewardCenter.planRegistry(env.rewardPlan.address);
    //     const planBalancePreRewarding = planProfile.balance;

    //     // Limited reward, because it would exceed the plan balance.
    //     env.rewardPlan = env.rewardPlan.connect(env.Notifier.A);
    //     const notifyAmountSpentTx = await env.rewardPlan.notifyAmountSpent(env.Client.A.id, '5000000');
    //     const [clientId, amountSpent, totalRewarded] = await getEventArguments(notifyAmountSpentTx, 'AmountSpent');

    //     expect(amountSpent.toString()).to.equal('5000000');
    //     expect(totalRewarded.toString()).to.equal(planBalancePreRewarding.toString());
    //   });

    //   it('Should deprecate the plan', async function () {
    //     const stage = await env.rewardPlan.stage();

    //     expect(stage).to.equal(Stages.SLEEPING);
    //   });

    //   it('Should be reflected in the Reward Center plans registry', async function () {
    //     const planProfile = await env.rewardCenter.planRegistry(env.rewardPlan.address);

    //     expect(planProfile.active).to.equal(false);
    //     expect(planProfile.balance.toString()).to.equal('0');
    //   });

    //   it('Should also sign out both entities from Reward Center registry', async function () {
    //     const entityAProfile = await env.rewardCenter.clientRegistry(env.Entity.A.address);
    //     const entityBProfile = await env.rewardCenter.clientRegistry(env.Entity.B.address);

    //     expect(entityAProfile.active).to.equal(false);
    //     expect(entityBProfile.active).to.equal(false);
    //   });
    // });

    // describe('Test', function () {
    //   it('Test', async function () {
    //     const rpEthBalance = await env.rewardPlan.getContractBalance();
    //     console.log("RP: ", rpEthBalance.toString());
    //   });
    // });
  });

});