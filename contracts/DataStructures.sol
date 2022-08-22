// SPDX-License-Identifier: MIT

pragma solidity ^0.8.9;

struct ClientProfile {
  bool active;
  address addr;
  uint256 rewards;
}

struct EntityProfile {
  bool active;
  address addr;
  uint8 runningPlans; // Usefull to know when to unlist them as entities. (256 max)
}

struct PlanProfile {
  bool active;
  address creatorAddr;
  uint256 totalRewarded;
}

struct Founder {
  address addr;
  uint256 collaborationAmount;
  bool signed;
}

struct Notifier {
  bool active;
  address addedBy;
}

struct ClientPoints {
  bool active;
  uint256 points;
}

struct RewardPointRule {
  uint256 points;
  uint256 reward;
}
