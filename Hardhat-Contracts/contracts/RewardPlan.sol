// SPDX-License-Identifier: MIT

pragma solidity ^0.8.9;

import "./Constants.sol";
import "./DataStructures.sol";
import "./RewardCenter.sol";

import "hardhat/console.sol";

enum Stages {
  CONSTRUCTION,
  SIGNING,
  ACTIVE,
  SLEEPING
}

contract RewardPlan {
  /* Main attributes */
  Stages public stage;
  address public creator;
  Founder[] public founders;
  address[] public notifierAddresses;
  mapping(address => Notifier) public notifiers;

  /* Constants */
  RewardCenter public rewardCenter;

  uint256 public nonRefundableDuration;
  uint256 public allowRefundTimestamp;

  /* Rules */
  RewardPointRule[] public rewardPointsRules; /* Sorted low to high points*/

  /* Client registries */
  mapping(uint256 => ClientPoints) public rewardPointsRegistry; /* Client Id -> Client Points */

  event FounderAdded(address founderAddress, uint256 collaborationAmount);
  event RewardRuleAdded(address founderAddress, uint256 points, uint256 reward);
  event RewardRuleRemoved(address founderAddress, uint256 index);
  event NotifierAdded(address notifierAddress, address addedBy);
  event SigningStageBegun(address caller);
  event FounderSigned(address signer, bool allSigned);
  event ClientSignedUp(uint256 clientId, address clientAddress);
  event PointsScored(uint256 clientId, uint256 amount, uint256 grantedReward);
  event PlanAwaken(address caller, uint256 collaboration);

  modifier onlyRewardCenter() {
    require(
      msg.sender == address(rewardCenter),
      "Only reward center authorized"
    );
    _;
  }

  modifier onlyFoundersOrCreator() {
    if (msg.sender != creator) {
      bool allowed = false;
      for (uint8 i = 0; i < founders.length; i++) {
        if (msg.sender == founders[i].addr) {
          allowed = true;
          break;
        }
      }
      require(allowed, "Only founders authorized");
    }
    _;
  }

  modifier onlyFounders() {
    bool allowed = false;
    for (uint8 i = 0; i < founders.length; i++) {
      if (msg.sender == founders[i].addr) {
        allowed = true;
        break;
      }
    }
    require(allowed, "Only founders authorized");
    _;
  }

  modifier onlyNotifiers() {
    require(notifiers[msg.sender].active, "Only notifiers authorized");
    bool parentFounderActive = false;
    for (uint8 i = 0; i < founders.length; i++) {
      if (founders[i].addr == notifiers[msg.sender].addedBy) {
        parentFounderActive = true;
      }
    }
    require(
      parentFounderActive,
      "Notifier is not valid since its parent is not a founder"
    );
    _;
  }

  modifier atStage(Stages allowedStage) {
    require(stage == allowedStage, "Not allowed at current stage");
    _;
  }

  modifier refundIsAllowed() {
    require(
      allowRefundTimestamp <= block.timestamp,
      "Refunds are not allowed yet"
    );
    _;
  }

  constructor(address creator_, uint256 nonRefundableDuration_) {
    creator = creator_;
    nonRefundableDuration = nonRefundableDuration_;
    allowRefundTimestamp = block.timestamp + nonRefundableDuration_;
    stage = Stages.CONSTRUCTION;
    rewardCenter = RewardCenter(msg.sender);
  }

  receive() external payable {}

  /*
    PRIVATES
  */
  function checkSignatures() private view returns (bool) {
    bool allSigned = true;
    for (uint8 i = 0; i < founders.length; i++) {
      if (!founders[i].signed) {
        allSigned = false;
        break;
      }
    }
    return allSigned;
  }

  function checkRules(uint256 clientId, uint256 amountAccumulator)
    private
    atStage(Stages.ACTIVE)
    returns (uint256)
  {
    require(rewardPointsRules.length > 0, "No spend rules defined");

    // In case none of the reward rules satisfy the points.
    if (rewardPointsRules[0].points > rewardPointsRegistry[clientId].points)
      return 0;

    // Look for the best reward rule that satisfies the points.
    uint256 rewardIndex;
    for (uint256 i = 0; i < rewardPointsRules.length; i++) {
      if (
        rewardPointsRules[i].points == rewardPointsRegistry[clientId].points ||
        (rewardPointsRules[i].points < rewardPointsRegistry[clientId].points &&
          i == rewardPointsRules.length - 1)
      ) {
        rewardIndex = i;
        break;
      } else if (
        rewardPointsRules[i].points > rewardPointsRegistry[clientId].points
      ) {
        rewardIndex = i - 1;
        break;
      }
    }

    // In case the plan is out of funds, reward the rest.
    if (
      address(this).balance <
      rewardPointsRules[rewardIndex].reward + amountAccumulator
    ) {
      uint256 fixedReward = address(this).balance - amountAccumulator;
      uint256 fixedRulePoints = (fixedReward *
        rewardPointsRules[rewardIndex].points) /
        rewardPointsRules[rewardIndex].reward;

      stage = Stages.SLEEPING;
      rewardPointsRegistry[clientId].points -= fixedRulePoints;
      return fixedReward;
    }

    // Else consider the full reward.
    rewardPointsRegistry[clientId].points -= rewardPointsRules[rewardIndex]
      .points;

    uint256 totalReward = rewardPointsRules[rewardIndex].reward +
      amountAccumulator;

    // If the plans balance is greater than the total reward, consider additional rewards.
    if (address(this).balance > totalReward)
      return
        rewardPointsRules[rewardIndex].reward +
        checkRules(clientId, totalReward);
    // Else the total rewards = plans balance, therefore dont consider additoinal rewards.
    else return totalReward;
  }

  function resetPlan() private {
    stage = Stages.CONSTRUCTION;
    allowRefundTimestamp = block.timestamp + nonRefundableDuration;

    for (uint256 i = 1; i < founders.length; i++) {
      rewardCenter.unlinkPlanToMember(founders[i].addr);
    }

    for (uint256 i = 0; i < notifierAddresses.length; i++) {
      rewardCenter.unlinkPlanToMember(notifierAddresses[i]);
    }

    delete founders;
    delete rewardPointsRules;
  }

  function leavePlan() external onlyFounders {
    for (uint256 i = 0; i < founders.length; i++) {
      if (founders[i].addr == msg.sender) {
        founders[i] = founders[founders.length - 1];
        founders.pop();
        rewardCenter.unlinkPlanToMember(founders[i].addr);
        break;
      }
    }
  }

  /*  
    EXTERNALS
  */
  /* ON CONSTRUCTION */
  function addFounder(address founderAddress, uint256 collaborationAmount)
    external
    atStage(Stages.CONSTRUCTION)
    onlyFoundersOrCreator
  {
    // Can not add a founder twice and 256 founders is the maximum.
    require(founders.length < 256, "Founders limit reached");
    for (uint8 i = 0; i < founders.length; i++) {
      require(founders[i].addr != founderAddress, "Founder already added");
    }

    rewardCenter.notifyMemberAddedToPlan(founderAddress);
    founders.push(Founder(founderAddress, collaborationAmount, false));

    emit FounderAdded(founderAddress, collaborationAmount);
  }

  function addNotifier(address notifierAddress)
    external
    atStage(Stages.CONSTRUCTION)
    onlyFounders
  {
    require(!notifiers[notifierAddress].active, "Notifier already added");
    notifiers[notifierAddress] = Notifier(true, msg.sender);
    notifierAddresses.push(notifierAddress);
    rewardCenter.notifyMemberAddedToPlan(notifierAddress);
    emit NotifierAdded(notifierAddress, msg.sender);
  }

  // Maintains the rewardPointsRules array sorted from low to high points.
  function addRewardRule(uint256 spendsAmount, uint256 rewardAmount)
    external
    atStage(Stages.CONSTRUCTION)
    onlyFounders
  {
    bool sorted = rewardPointsRules.length <= 0
      ? true
      : rewardPointsRules[rewardPointsRules.length - 1].points <= spendsAmount;

    if (sorted) {
      rewardPointsRules.push(
        RewardPointRule(spendsAmount, rewardAmount, msg.sender)
      );
    } else {
      uint256 firstGreaterIndex = rewardPointsRules.length;
      RewardPointRule memory insertRule = RewardPointRule(
        spendsAmount,
        rewardAmount,
        msg.sender
      );
      RewardPointRule memory auxRule;
      for (uint256 i = 0; i < rewardPointsRules.length; i++) {
        // Index search, can be optimized.
        if (rewardPointsRules[i].points > spendsAmount) {
          firstGreaterIndex = i;
          break;
        }
      }
      for (uint256 i = firstGreaterIndex; i < rewardPointsRules.length; i++) {
        auxRule = rewardPointsRules[i];
        rewardPointsRules[i] = insertRule;
        insertRule = auxRule;
      }
      rewardPointsRules.push(insertRule);
    }
    emit RewardRuleAdded(msg.sender, spendsAmount, rewardAmount);
  }

  function removeRewardRule(uint256 ruleIndex)
    external
    atStage(Stages.CONSTRUCTION)
    onlyFounders
  {
    require(ruleIndex < rewardPointsRules.length, "Rule index out of bounds");
    require(
      rewardPointsRules[ruleIndex].creator == msg.sender,
      "Not creator of the rule"
    );

    rewardPointsRules[ruleIndex] = rewardPointsRules[
      rewardPointsRules.length - 1
    ];
    rewardPointsRules.pop();

    emit RewardRuleRemoved(msg.sender, ruleIndex);
  }

  function beginSigningStage()
    external
    atStage(Stages.CONSTRUCTION)
    onlyFounders
  {
    stage = Stages.SIGNING;
    emit SigningStageBegun(msg.sender);
  }

  function sign() external payable atStage(Stages.SIGNING) onlyFounders {
    for (uint8 i = 0; i < founders.length; i++) {
      if (msg.sender == founders[i].addr) {
        require(!founders[i].signed, "Founder already signed");
        require(msg.value == founders[i].collaborationAmount, "Wrong amount");
        founders[i].signed = true;
        break;
      }
    }

    bool allSigned = checkSignatures();
    if (allSigned) stage = Stages.ACTIVE;
    emit FounderSigned(msg.sender, allSigned);
  }

  function refundAndReset()
    external
    atStage(Stages.SIGNING)
    refundIsAllowed
    onlyFounders
  {
    // Refund collaboration amounts to each founder.
    for (uint8 i = 0; i < founders.length; i++) {
      if (founders[i].signed) {
        founders[i].signed = false;
        require(
          payable(founders[i].addr).send(founders[i].collaborationAmount),
          "Refund failed"
        );
      }
    }

    resetPlan();
  }

  /* ON ACTIVE */
  function signUpClient(uint256 clientId, address addr)
    external
    atStage(Stages.ACTIVE)
    onlyNotifiers
  {
    rewardCenter.signUpClient(clientId, addr);
    emit ClientSignedUp(clientId, addr);
  }

  function notifyPointsScored(uint256 clientId, uint256 amount)
    external
    atStage(Stages.ACTIVE)
    onlyNotifiers
  {
    // Register client if needed and add the amount.
    if (!rewardPointsRegistry[clientId].active) {
      rewardPointsRegistry[clientId].active = true;
      rewardPointsRegistry[clientId].points = 0;
    }
    rewardPointsRegistry[clientId].points += amount;

    // Reward if there is any valid rule.
    uint256 totalRewarded = checkRules(clientId, 0);

    if (totalRewarded > 0) {
      require(
        payable(rewardCenter.getClientAddress(clientId)).send(totalRewarded),
        "Reward failed"
      );
      rewardCenter.notifyRewardGranted(clientId, totalRewarded);
    }

    emit PointsScored(clientId, amount, totalRewarded);
  }

  /* ON SLEEP */
  function awakePlan(bool reset)
    external
    payable
    atStage(Stages.SLEEPING)
    onlyFoundersOrCreator
  {
    if (reset) {
      require(msg.sender == creator, "Only creator can reset the plan");
      resetPlan();
    } else {
      require(msg.value > 0, "Awake need funds");
      stage = Stages.ACTIVE;
    }
    emit PlanAwaken(msg.sender, msg.value);
  }

  /* 
    Getters
  */

  function getFounderAddresses() external view returns (address[] memory) {
    address[] memory addresses = new address[](founders.length);
    for (uint8 i = 0; i < founders.length; i++) {
      addresses[i] = founders[i].addr;
    }
    return addresses;
  }
}
