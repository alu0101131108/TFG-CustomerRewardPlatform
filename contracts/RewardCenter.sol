// SPDX-License-Identifier: MIT

pragma solidity ^0.8.9;

import "./Constants.sol";
import "./DataStructures.sol";
import "./RewardPlan.sol";
import "hardhat/console.sol";

contract RewardCenter {
  mapping(uint256 => ClientProfile) public clientRegistry; // Numeric Id => Client Profile.
  mapping(address => EntityProfile) public entityRegistry; // Address => Entity Profile.
  mapping(address => PlanProfile) public planRegistry; // Address => Reward Plan Profile.
  mapping(address => address[]) public entityRelatedPlans; // Address => Plan adress array.

  // Event for when plan is created, with plan address, creator address and transaction gas price.
  event RewardPlanCreated(address planAddress, address creator);

  modifier onlyPlans() {
    require(planRegistry[msg.sender].active, "Only active plans authorized");
    _;
  }

  constructor() {}

  receive() external payable {}

  function evaluatePlanDeprecation(address payable planAddr)
    private
    returns (bool)
  {
    if (
      planRegistry[planAddr].balance <= 0 ||
      planAddr.balance <= MIN_PLAN_ETH_BALANCE
    ) {
      RewardPlan TargetPlan = RewardPlan(planAddr);
      TargetPlan.deprecate();
      address[] memory founderAddresses = TargetPlan.getFounderAddresses();
      for (uint8 i = 0; i < founderAddresses.length; i++) {
        entityRegistry[founderAddresses[i]].runningPlans--;
        if (entityRegistry[founderAddresses[i]].runningPlans == 0) {
          entityRegistry[founderAddresses[i]].active = false;
        }
      }
      planRegistry[planAddr].active = false;
      return true;
    }
    return false;
  }

  /**
    Deploy a new instance of RewardPlan.
    1. Require buying a certain amount of tokens.
    2. Sign up msg.sender as entity. Once the plan expires, runningPlan counter will decrease untill 0 -> not active.
    3. Deploy and send funds to the new instance. Maybe gas should be considered.
    */
  function createRewardPlan(uint256 signStageExpireTimestamp) external payable {
    require(msg.value >= MIN_CREATOR_COLLAB, "Invalid collaboration amount");
    require(
      signStageExpireTimestamp > block.timestamp,
      "Invalid sign stage expire timestamp"
    );

    // Sign up msg.sender as entity if its not already signed up.
    if (!entityRegistry[msg.sender].active) {
      entityRegistry[msg.sender] = EntityProfile(true, msg.sender, 0);
    }
    require(
      entityRegistry[msg.sender].runningPlans < 255,
      "Running plans limit reached"
    );

    entityRegistry[msg.sender].runningPlans++;

    RewardPlan plan = new RewardPlan(
      msg.sender,
      msg.value,
      signStageExpireTimestamp
    );

    entityRelatedPlans[msg.sender].push(address(plan));
    planRegistry[address(plan)] = PlanProfile(true, msg.sender, msg.value);
    require(payable(address(plan)).send(msg.value), "Payment failed");

    emit RewardPlanCreated(address(plan), msg.sender);
  }

  function notifyFounderSigned(
    address founderAddress,
    uint256 collaborationAmount
  ) external onlyPlans {
    // Founder must be signed up as an entity.
    require(entityRegistry[founderAddress].active, "Entity is not signed up");

    // Increase plans balance by the founders collaboration amount.
    planRegistry[msg.sender].balance += collaborationAmount;
  }

  function notifyFounderAddedToPlan(address addr) external onlyPlans {
    // Founder must be signed up as an entity.
    require(entityRegistry[addr].active, "Entity is not signed up");

    // Increase running plans
    entityRegistry[addr].runningPlans++;
    entityRelatedPlans[addr].push(msg.sender);
  }

  function signUpEntity(address addr) external onlyPlans {
    if (!entityRegistry[addr].active) {
      entityRegistry[addr] = EntityProfile(true, addr, 0);
    }
  }

  function signUpClient(uint256 clientId, address addr) external onlyPlans {
    require(!clientRegistry[clientId].active, "Id is already taken");

    clientRegistry[clientId] = ClientProfile(true, addr, 0);
  }

  function grantReward(uint256 clientId, uint256 amount)
    external
    onlyPlans
    returns (uint256)
  {
    require(clientRegistry[clientId].active, "Client not registered");

    // Check if the plan can grant rewards, deprecate if its rewardTokens or eth balance is 0.
    bool isDeprecated = evaluatePlanDeprecation(payable(msg.sender));
    if (isDeprecated) return 0;

    // Adjust reward in case it surpases the plan balance.
    if (planRegistry[msg.sender].balance < amount) {
      amount = planRegistry[msg.sender].balance;
    }

    clientRegistry[clientId].balance += amount;
    planRegistry[msg.sender].balance -= amount;
    return amount;
  }

  /* 
    Views 
  */
  function getContractBalance() external view returns (uint256) {
    return address(this).balance;
  }

  function getSelfRelatedPlans() external view returns (address[] memory) {
    return entityRelatedPlans[msg.sender];
  }

  function isPlanActive(address target) external view returns (bool) {
    return planRegistry[target].active;
  }
}
