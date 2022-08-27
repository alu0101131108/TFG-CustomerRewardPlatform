// SPDX-License-Identifier: MIT

pragma solidity ^0.8.9;

import "./Constants.sol";
import "./DataStructures.sol";
import "./RewardPlan.sol";

// import "hardhat/console.sol";

contract RewardCenter {
  mapping(uint256 => ClientProfile) public clientRegistry; // Numeric Id => Client Profile.
  mapping(address => EntityProfile) public entityRegistry; // Address => Entity Profile.
  mapping(address => PlanProfile) public planRegistry; // Address => Reward Plan Profile.
  mapping(address => address[]) public entityRelatedPlans; // Address => Plan adress array.

  event RewardPlanCreated(address planAddress, address creator);

  modifier onlyPlans() {
    require(planRegistry[msg.sender].active, "Only active plans authorized");
    _;
  }

  constructor() {}

  // receive() external payable {}

  function createRewardPlan(uint256 refundNotAllowedDuration) external {
    signUpEntity(msg.sender);
    require(
      entityRegistry[msg.sender].runningPlans < 255,
      "Running plans limit reached"
    );
    entityRegistry[msg.sender].runningPlans++;

    RewardPlan plan = new RewardPlan(msg.sender, refundNotAllowedDuration);

    entityRelatedPlans[msg.sender].push(address(plan));
    planRegistry[address(plan)] = PlanProfile(true, msg.sender, 0);

    emit RewardPlanCreated(address(plan), msg.sender);
  }

  function notifyFounderAddedToPlan(address founderAddress) external onlyPlans {
    signUpEntity(founderAddress);
    require(
      entityRegistry[founderAddress].runningPlans < 255,
      "Founder added reached de plans limit"
    );
    if (planRegistry[msg.sender].creatorAddr != founderAddress) {
      entityRegistry[founderAddress].runningPlans++;
      entityRelatedPlans[founderAddress].push(msg.sender);
    }
  }

  // Will be called only by creating a plan or being added to one.
  function signUpEntity(address founderAddress) private {
    if (!entityRegistry[founderAddress].active) {
      entityRegistry[founderAddress] = EntityProfile(true, founderAddress, 0);
    }
  }

  function signUpClient(uint256 clientId, address clientAddress)
    external
    onlyPlans
  {
    if (!clientRegistry[clientId].active) {
      clientRegistry[clientId] = ClientProfile(true, clientAddress, 0);
    }
  }

  function notifyRewardGranted(uint256 clientId, uint256 amount)
    external
    onlyPlans
  {
    require(clientRegistry[clientId].active, "Client not registered");

    clientRegistry[clientId].rewards += amount;
    planRegistry[msg.sender].totalRewarded += amount;
  }

  /* 
    Getters
  */
  function getContractBalance() external view returns (uint256) {
    return address(this).balance;
  }

  function getSelfRelatedPlans() external view returns (address[] memory) {
    return entityRelatedPlans[msg.sender];
  }

  function getClientAddress(uint256 clientId) external view returns (address) {
    return clientRegistry[clientId].addr;
  }
}
