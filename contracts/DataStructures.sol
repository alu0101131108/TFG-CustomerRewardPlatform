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

struct ClientSpends {
  bool active;
  uint256 spends;
}

struct SpendRule {
  uint256 spends;
  uint256 reward;
}
