// SPDX-License-Identifier: MIT

pragma solidity ^0.8.9;

struct ClientProfile {
  bool active;
  address addr;
  uint256 balance;
}

struct EntityProfile {
  bool active;
  address addr;
  uint8 runningPlans; // Usefull to know when to unlist them as entities. (256 max)
}

struct PlanProfile {
  bool active;
  address addr;
  uint256 balance;
  // uint8 state; might be able to read it from the contract.
}

struct Founder {
  address addr;
  uint256 collaborationAmount;
  // IntRange[] itemIdRange;
  bool signed;
}

struct Notifier {
  bool active;
}

struct ClientSpends {
  bool active;
  uint256 spends;
}

// struct IntRange {
//    int256 min;
//    int256 max;
// }

// struct Rule {
//    ItemStack[] items;
//    int256 rewardAmount;
// }

struct SpendRule {
  uint256 spends;
  uint256 reward;
}

struct ItemStack {
  int256 id;
  int256 amount;
}

struct rewardPlanConfig {
  bool isPrivate;
  address[] founders;
  int256[] expectedFundsPerFounder;
  // ...
}
