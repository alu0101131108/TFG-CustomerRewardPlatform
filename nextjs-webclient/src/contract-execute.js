import { ethers } from 'ethers';

const RewardCenterABI = require('../../Hardhat-Contracts/artifacts/contracts/RewardCenter.sol/RewardCenter.json').abi;  // require('./RewardCenter.json').abi;
const RewardPlanABI = require('../../Hardhat-Contracts/artifacts/contracts/RewardPlan.sol/RewardPlan.json').abi;        // require('./RewardPlan.json').abi;
const RewardCenterAddress = '0x5fbdb2315678afecb367f032d93f642f64180aa3';

// Reward Center.
async function createRewardPlan(provider) {
  const name = document.getElementById("create-reward-plan-name-0").value;
  const collaborationAmount = document.getElementById("create-reward-plan-collaboration-0").value;
  const nonRefundableDays = document.getElementById("create-reward-plan-refundable-0").value;
  const nonRefundableSeconds = ethers.BigNumber.from(nonRefundableDays).mul(24).mul(60).mul(60);

  const signer = await provider.getSigner();
  const RewardCenter = new ethers.Contract(RewardCenterAddress, RewardCenterABI, signer);
  const createRewardPlanTx = await RewardCenter.createRewardPlan(nonRefundableSeconds, name, collaborationAmount);
  const receipt = await createRewardPlanTx.wait();
}
const createRewardPlanInterface = {
  navEventKey: "create-reward-plan",
  navText: "Create Reward Plan",
  executeFunction: createRewardPlan,
  successMessage: "Reward plan created successfully",
  controls: [
    {
      id: "name",
      placeholder: "Name"
    },
    {
      id: "refundable",
      placeholder: "Non refundable days"
    },
    {
      id: "collaboration",
      placeholder: "Creator collaboration amount"
    }
  ]
};

// Reward Plan - Notifier.
async function signUpClient(provider, target, contractIndex) {
  const clientID = document.getElementById("signup-client-id-" + contractIndex).value;
  const clientAddress = document.getElementById("signup-client-address-" + contractIndex).value;

  const signer = await provider.getSigner();
  const RewardPlan = new ethers.Contract(target, RewardPlanABI, signer);
  const signUpClientTx = await RewardPlan.signUpClient(clientID, clientAddress);
  const receipt = await signUpClientTx.wait();
}
const signUpClientInterface = {
  navEventKey: "signup-client",
  navText: "Sign Up Client",
  executeFunction: signUpClient,
  successMessage: "Client signed up successfully",
  controls: [
    {
      id: "id",
      placeholder: "Client ID"
    },
    {
      id: "address",
      placeholder: "Client Address"
    }
  ]
};

async function notifyPointsScored(provider, target, contractIndex) {
  const clientID = document.getElementById("notify-points-scored-id-" + contractIndex).value;
  const pointsAmount = document.getElementById("notify-points-scored-amount-" + contractIndex).value;

  // console.log(clientID, pointsAmount);

  const signer = await provider.getSigner();
  const RewardPlan = new ethers.Contract(target, RewardPlanABI, signer);
  const notifyPointsScoredTx = await RewardPlan.notifyPointsScored(clientID, pointsAmount);
  const receipt = await notifyPointsScoredTx.wait();
}
const notifyPointsScoredInterface = {
  navEventKey: "notify-points-scored",
  navText: "Notify Points Scored",
  executeFunction: notifyPointsScored,
  successMessage: "Scored points notified successfully",
  controls: [
    {
      id: "id",
      placeholder: "Client ID"
    },
    {
      id: "amount",
      placeholder: "Amount of scored points"
    }
  ]
};

// Reward Plan - Founder. 
// leavePlan(), addFounder(address, collaborationAmount), addNotifier(address), addRewardRule(points, reward), 
// removeRewardRule(index), beginSigningStage(), sign(), refundAndReset(), awakePlan(resetPlan).
async function leavePlan(provider, target, contractIndex) {
  const signer = await provider.getSigner();
  const RewardPlan = new ethers.Contract(target, RewardPlanABI, signer);
  const leavePlanTx = await RewardPlan.leavePlan();
  const receipt = await leavePlanTx.wait();
}
const leavePlanInterface = {
  navEventKey: "leave-plan",
  navText: "Leave Plan",
  executeFunction: leavePlan,
  successMessage: "Left plan successfully",
  controls: []
};

async function addFounder(provider, target, contractIndex) {
  const founderAddress = document.getElementById("add-founder-address-" + contractIndex).value;
  const collaborationAmount = document.getElementById("add-founder-collaboration-" + contractIndex).value;

  const signer = await provider.getSigner();
  const RewardPlan = new ethers.Contract(target, RewardPlanABI, signer);
  const addFounderTx = await RewardPlan.addFounder(founderAddress, collaborationAmount);
  const receipt = await addFounderTx.wait();
}
const addFounderInterface = {
  navEventKey: "add-founder",
  navText: "Add Founder",
  executeFunction: addFounder,
  successMessage: "Founder added successfully",
  controls: [
    {
      id: "address",
      placeholder: "Founder Address"
    },
    {
      id: "collaboration",
      placeholder: "Founder collaboration amount"
    }
  ]
};

async function addNotifier(provider, target, contractIndex) {
  const notifierAddress = document.getElementById("add-notifier-address-" + contractIndex).value;

  const signer = await provider.getSigner();
  const RewardPlan = new ethers.Contract(target, RewardPlanABI, signer);
  const addNotifierTx = await RewardPlan.addNotifier(notifierAddress);
  const receipt = await addNotifierTx.wait();
}
const addNotifierInterface = {
  navEventKey: "add-notifier",
  navText: "Add Notifier",
  executeFunction: addNotifier,
  successMessage: "Notifier added successfully",
  controls: [
    {
      id: "address",
      placeholder: "Notifier Address"
    }
  ]
};

async function addRewardRule(provider, target, contractIndex) {
  const points = document.getElementById("add-reward-rule-points-" + contractIndex).value;
  const reward = document.getElementById("add-reward-rule-reward-" + contractIndex).value;

  const signer = await provider.getSigner();
  const RewardPlan = new ethers.Contract(target, RewardPlanABI, signer);
  const addRewardRuleTx = await RewardPlan.addRewardRule(points, reward);
  const receipt = await addRewardRuleTx.wait();
}
const addRewardRuleInterface = {
  navEventKey: "add-reward-rule",
  navText: "Add Reward Rule",
  executeFunction: addRewardRule,
  successMessage: "Reward rule added successfully",
  controls: [
    {
      id: "points",
      placeholder: "Points to score"
    },
    {
      id: "reward",
      placeholder: "WEI to reward"
    }
  ]
};

async function removeRewardRule(provider, target, contractIndex) {
  const index = (parseInt(document.getElementById("remove-reward-rule-index").value) - 1).toString();

  const signer = await provider.getSigner();
  const RewardPlan = new ethers.Contract(target, RewardPlanABI, signer);
  const removeRewardRuleTx = await RewardPlan.removeRewardRule(index);
  const receipt = await removeRewardRuleTx.wait();
}
const removeRewardRuleInterface = {
  navEventKey: "remove-reward-rule",
  navText: "Remove Reward Rule",
  executeFunction: removeRewardRule,
  successMessage: "Reward rule removed successfully",
  controls: [
    {
      id: "index",
      placeholder: "The # of rule to remove"
    }
  ]
}

async function beginSigningStage(provider, target, contractIndex) {
  const signer = await provider.getSigner();
  const RewardPlan = new ethers.Contract(target, RewardPlanABI, signer);
  const beginSigningStageTx = await RewardPlan.beginSigningStage();
  const receipt = await beginSigningStageTx.wait();
}
const beginSigningStageInterface = {
  navEventKey: "begin-signing-stage",
  navText: "Begin Signing Stage",
  executeFunction: beginSigningStage,
  successMessage: "Signing stage began successfully",
  controls: []
}

async function sign(provider, target, contractIndex) {
  const signer = await provider.getSigner();
  const RewardPlan = new ethers.Contract(target, RewardPlanABI, signer);

  const signerAddress = await signer.getAddress();
  const founders = await RewardPlan.getFounders();
  let collaborationAmount = "Invalid founder";
  for (let i = 0; i < founders.length; i++) {
    if (founders[i][0] === signerAddress) {
      collaborationAmount = founders[i][1];
      break;
    }
  }

  const signTx = await RewardPlan.sign({ value: collaborationAmount });
  const receipt = signTx.wait();
}
const signInterface = {
  navEventKey: "sign",
  navText: "Sign",
  executeFunction: sign,
  successMessage: "Signed successfully",
  controls: []
}

async function refundAndReset(provider, target, contractIndex) {
  const signer = await provider.getSigner();
  const RewardPlan = new ethers.Contract(target, RewardPlanABI, signer);
  const refundAndResetTx = await RewardPlan.refundAndReset();
  const receipt = await refundAndResetTx.wait();
}
const refundAndResetInterface = {
  navEventKey: "refund-and-reset",
  navText: "Refund And Reset",
  executeFunction: refundAndReset,
  successMessage: "Refunded and resetted successfully",
  controls: []
}

async function awakePlan(provider, target, contractIndex) {
  const resetPlan = document.getElementById("awake-plan-reset-" + contractIndex).checked;
  const awakeAmount = resetPlan ? 0 : document.getElementById("awake-plan-value-" + contractIndex).value;

  const signer = await provider.getSigner();
  const RewardPlan = new ethers.Contract(target, RewardPlanABI, signer);
  const awakePlanTx = await RewardPlan.awakePlan(resetPlan, { value: awakeAmount });
  const receipt = await awakePlanTx.wait();
}
const awakePlanInterface = {
  navEventKey: "awake-plan",
  navText: "Awake Plan",
  executeFunction: awakePlan,
  successMessage: "Plan awoken successfully",
  controls: [
    {
      id: "value",
      placeholder: "Awake amount"
    },
    {
      id: "reset",
      placeholder: "Reset the plan",
      checkbox: true
    }
  ]

}

module.exports = {
  createRewardPlanInterface,
  signUpClientInterface,
  notifyPointsScoredInterface,
  leavePlanInterface,
  addFounderInterface,
  addNotifierInterface,
  addRewardRuleInterface,
  removeRewardRuleInterface,
  beginSigningStageInterface,
  signInterface,
  refundAndResetInterface,
  awakePlanInterface
};