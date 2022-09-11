// SPDX-License-Identifier: MIT

pragma solidity ^0.8.9;

struct EntityProfile {
  bool active;
  address addr;
  uint8 runningPlans; // 256 max
}

struct ClientProfile {
  bool active;
  address addr;
  uint256 rewards;
}

struct PlanProfile {
  bool active;
  address creatorAddr;
  uint256 totalRewarded;
  string name;
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
  address creator;
}
