// SPDX-License-Identifier: MIT

pragma solidity ^0.8.9;

import "./Constants.sol";
import "./DataStructures.sol";
import "./RewardPlan.sol";

// import "hardhat/console.sol";

contract RewardCenter {
  mapping(address => uint256) public clientAddressToId; // Client address => to Numeric Id.
  mapping(uint256 => ClientProfile) public clientRegistry; // Numeric Id => Client Profile.
  mapping(address => EntityProfile) public entityRegistry; // Address => Entity Profile.
  mapping(address => PlanProfile) public planRegistry; // Address => Reward Plan Profile.

  mapping(address => address[]) public entityRelatedPlans; // Address => Plan address array.
  mapping(address => address[]) public clientRelatedPlans; // Address => Plan address array.

  event RewardPlanCreated(address planAddress, address creator);

  modifier onlyPlans() {
    require(planRegistry[msg.sender].active, "Only active plans authorized");
    _;
  }

  receive() external payable {}

  fallback() external payable {}

  constructor() {}

  function createRewardPlan(
    uint256 refundNotAllowedDuration,
    string calldata name,
    uint256 collaborationAmount
  ) external {
    signUpEntity(msg.sender);
    require(
      entityRegistry[msg.sender].runningPlans < 255,
      "Running plans limit reached"
    );
    entityRegistry[msg.sender].runningPlans++;

    RewardPlan plan = new RewardPlan(
      msg.sender,
      refundNotAllowedDuration,
      collaborationAmount
    );

    entityRelatedPlans[msg.sender].push(address(plan));
    planRegistry[address(plan)] = PlanProfile(true, msg.sender, 0, name);

    emit RewardPlanCreated(address(plan), msg.sender);
  }

  function notifyMemberAddedToPlan(address memberAddress) external onlyPlans {
    signUpEntity(memberAddress);
    require(
      entityRegistry[memberAddress].runningPlans < 255,
      "Running plans limit reached"
    );
    if (planRegistry[msg.sender].creatorAddr != memberAddress) {
      entityRegistry[memberAddress].runningPlans++;
      entityRelatedPlans[memberAddress].push(msg.sender);
    }
  }

  // Will be called only by creating a plan or being added as member to one.
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
      clientAddressToId[clientAddress] = clientId;
      clientRelatedPlans[clientAddress].push(msg.sender);
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

  function unlinkPlanToMember(address member) external onlyPlans {
    entityRegistry[member].runningPlans--;
    uint256 relatedPlansLength = entityRelatedPlans[member].length;

    for (uint256 i = 0; i < relatedPlansLength; i++) {
      if (entityRelatedPlans[member][i] == msg.sender) {
        entityRelatedPlans[member][i] = entityRelatedPlans[member][
          relatedPlansLength - 1
        ];
        entityRelatedPlans[member].pop();
        break;
      }
    }
  }

  /* 
    Getters
  */

  function checkRolesInPlan(address planAddress)
    external
    view
    returns (
      bool isClient,
      bool isFounder,
      bool isNotifier
    )
  {
    require(planRegistry[planAddress].active, "Plan not registered");

    RewardPlan target = RewardPlan(payable(planAddress));

    return (
      target.isClient(clientAddressToId[msg.sender]),
      target.isFounder(msg.sender),
      target.isNotifier(msg.sender)
    );
  }

  function getSelfRelatedPlans() external view returns (address[] memory) {
    uint256 nEntityPlans = entityRelatedPlans[msg.sender].length;
    uint256 nClientPlans = clientRelatedPlans[msg.sender].length;
    address[] memory relatedPlans = new address[](nEntityPlans + nClientPlans);

    for (uint256 i = 0; i < nEntityPlans; i++) {
      relatedPlans[i] = entityRelatedPlans[msg.sender][i];
    }

    for (uint256 i = 0; i < nClientPlans; i++) {
      relatedPlans[nEntityPlans + i] = clientRelatedPlans[msg.sender][i];
    }

    return relatedPlans;
  }

  function getClientAddress(uint256 clientId) external view returns (address) {
    return clientRegistry[clientId].addr;
  }

  function getPlanStage(address planAddress) external view returns (Stages) {
    require(planRegistry[planAddress].active, "Plan not registered");
    return RewardPlan(payable(planAddress)).stage();
  }
}
