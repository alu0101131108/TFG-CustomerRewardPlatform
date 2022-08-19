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
  DEPRECATED
}

contract RewardPlan {
  /* Main attributes */
  Stages public stage;
  Founder[] public founders; /* Creator is always at index 0. */
  mapping(address => Notifier) public notifiers;

  /* Constants */
  RewardCenter public rewardCenter;
  uint256 public signStageExpireTimestamp;
  uint256 public deployDate;

  /* Rules */
  SpendRule[] public spendRules; /* Sorted low to high reward*/
  // Rule[] rules; --> [rule 0: {[{item0, cuantity0}, {item1, cuantity1}], rewardAmount}, rule 1: {}, ...].

  /* Client registries */
  mapping(uint256 => ClientSpends) public clientSpendsRegistry; /* Client Id -> Client Spends */

  event FounderAdded(address founderAddress, uint256 collaborationAmount);
  event SpendRuleAdded(address founderAddress, uint256 spends, uint256 reward);
  event NotifierAdded(address notifierAddress);
  event FounderSigned(address signer, bool allSigned);
  event ClientSignedUp(uint256 clientId, address clientAddress);
  event AmountSpent(uint256 clientId, uint256 amount, uint256 grantedReward);

  modifier onlyRewardCenter() {
    require(
      msg.sender == address(rewardCenter),
      "Only reward center authorized"
    );
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
    _;
  }

  modifier atStage(Stages allowedStage) {
    require(stage == allowedStage, "Not allowed at current stage");
    _;
  }

  modifier atStages(Stages[2] memory allowedStages) {
    /* Invalid conversion from dynamic sized array to fixed size array. (To investigate) -> Single line dynamic array not supported. */
    bool allowed = false;
    for (uint8 i = 0; i < allowedStages.length; i++) {
      if (stage == allowedStages[i]) {
        allowed = true;
        break;
      }
    }
    require(allowed, "Not allowed at current stage");
    _;
  }

  modifier signStageExpired() {
    require(
      signStageExpireTimestamp <= block.timestamp,
      "Sign period not expired"
    );
    _;
  }

  constructor(
    address creator,
    uint256 creatorContribution,
    uint256 signStageExpireTimestamp_
  ) {
    stage = Stages.CONSTRUCTION;
    rewardCenter = RewardCenter(payable(msg.sender));
    founders.push(Founder(creator, creatorContribution, false));
    deployDate = block.timestamp;
    signStageExpireTimestamp = signStageExpireTimestamp_;
  }

  receive() external payable {}

  /*
    PRIVATES
  */
  function checkSignatures() private returns (bool) {
    bool allSigned = true;
    for (uint8 i = 0; i < founders.length; i++) {
      if (!founders[i].signed) {
        allSigned = false;
        break;
      }
    }
    if (allSigned) stage = Stages.ACTIVE;
    return allSigned;
  }

  function checkItemRules() private {
    // Not implemented yet
  }

  function checkSpendRules(uint256 clientId) private returns (uint256) {
    bool isDeprecated = !rewardCenter.isPlanActive(address(this));
    if (
      isDeprecated ||
      spendRules.length == 0 ||
      spendRules[0].spends > clientSpendsRegistry[clientId].spends
    ) return 0;

    uint256 rewardIndex;
    for (uint256 i = 0; i < spendRules.length; i++) {
      if (
        spendRules[i].spends == clientSpendsRegistry[clientId].spends ||
        (spendRules[i].spends < clientSpendsRegistry[clientId].spends &&
          i == spendRules.length - 1)
      ) {
        rewardIndex = i;
        break;
      } else if (spendRules[i].spends > clientSpendsRegistry[clientId].spends) {
        rewardIndex = i - 1;
        break;
      }
    }

    clientSpendsRegistry[clientId].spends -= spendRules[rewardIndex].spends;
    uint256 rewardGranted = rewardCenter.grantReward(
      clientId,
      spendRules[rewardIndex].reward
    );

    return rewardGranted + checkSpendRules(clientId);
  }

  /*  
    EXTERNALS
  */
  /* ON CONSTRUCTION (Might need edit/remove also)*/
  function addFounder(address addr, uint256 collaborationAmount)
    external
    atStage(Stages.CONSTRUCTION)
    onlyFounders
  {
    // 256 founders max
    require(founders.length < 256, "Founders limit reached");

    rewardCenter.signUpEntity(addr);
    rewardCenter.notifyFounderAddedToPlan(addr);
    founders.push(Founder(addr, collaborationAmount, false));

    emit FounderAdded(addr, collaborationAmount);
  }

  function addNotifier(address addr)
    external
    atStage(Stages.CONSTRUCTION)
    onlyFounders
  {
    notifiers[addr] = Notifier(true, msg.sender);
    emit NotifierAdded(addr);
  }

  function addItemRule() external atStage(Stages.CONSTRUCTION) onlyFounders {
    // Not implemented yet
  }

  // Maintains the spendRules array sorted from low to high spends.
  function addSpendRule(uint256 spendsAmount, uint256 rewardAmount)
    external
    atStage(Stages.CONSTRUCTION)
    onlyFounders
  {
    bool sorted = spendRules.length <= 0
      ? true
      : spendRules[spendRules.length - 1].spends <= spendsAmount;

    if (sorted) {
      spendRules.push(SpendRule(spendsAmount, rewardAmount));
    } else {
      uint256 firstGreaterIndex = spendRules.length;
      SpendRule memory insertRule = SpendRule(spendsAmount, rewardAmount);
      SpendRule memory auxRule;
      for (uint256 i = 0; i < spendRules.length; i++) {
        // Index search, can be optimized.
        if (spendRules[i].spends > spendsAmount) {
          firstGreaterIndex = i;
          break;
        }
      }
      for (uint256 i = firstGreaterIndex; i < spendRules.length; i++) {
        auxRule = spendRules[i];
        spendRules[i] = insertRule;
        insertRule = auxRule;
      }
      spendRules.push(insertRule);
    }
    emit SpendRuleAdded(msg.sender, spendsAmount, rewardAmount);
  }

  /* ON SIGNING (or construction) */
  function sign()
    external
    payable
    atStages([Stages.CONSTRUCTION, Stages.SIGNING])
    onlyFounders
  {
    // The first founder can sign without paying. Already paid during construction.
    if (founders[0].addr == msg.sender) {
      founders[0].signed = true;
    }
    // The other founders can pay to sign.
    else {
      for (uint8 i = 1; i < founders.length; i++) {
        if (msg.sender == founders[i].addr && !founders[i].signed) {
          require(msg.value >= founders[i].collaborationAmount);
          founders[i].signed = true;
          rewardCenter.notifyFounderSigned(
            msg.sender,
            founders[i].collaborationAmount
          );
          break;
        }
      }
    }

    if (stage == Stages.CONSTRUCTION) stage = Stages.SIGNING;
    bool allSigned = checkSignatures();

    emit FounderSigned(msg.sender, allSigned);
  }

  function signPeriodExpiredRefund()
    external
    atStages([Stages.CONSTRUCTION, Stages.SIGNING])
    signStageExpired
    onlyFounders
  {
    // If sign period has expired, return funds to every founder.
    for (uint8 i = 0; i < founders.length; i++) {
      if (founders[i].signed) {
        founders[i].signed = false;
        require(
          payable(founders[i].addr).send(founders[i].collaborationAmount),
          "Payment failed"
        );
      }
    }
    stage = Stages.DEPRECATED;
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

  function notifyItemsBought(uint256 clientId, ItemStack[] calldata items)
    external
    atStage(Stages.ACTIVE)
    onlyNotifiers
  {
    // Add items to the registry.
    // Check items reward rules logic.
  }

  function notifyAmountSpent(uint256 clientId, uint256 amount)
    external
    atStage(Stages.ACTIVE)
    onlyNotifiers
  {
    if (!clientSpendsRegistry[clientId].active) {
      clientSpendsRegistry[clientId].active = true;
      clientSpendsRegistry[clientId].spends = 0;
    }
    clientSpendsRegistry[clientId].spends += amount;
    uint256 totalRewarded = checkSpendRules(clientId);

    emit AmountSpent(clientId, amount, totalRewarded);
  }

  function deprecate() external atStage(Stages.ACTIVE) onlyRewardCenter {
    stage = Stages.DEPRECATED;
  }

  /* 
    Views 
  */
  function getCreator() external view returns (Founder memory) {
    return founders[0];
  }

  function getContractBalance() external view returns (uint256) {
    return address(this).balance;
  }

  function getFounderAddresses() external view returns (address[] memory) {
    address[] memory addresses = new address[](founders.length);
    for (uint8 i = 0; i < founders.length; i++) {
      addresses[i] = founders[i].addr;
    }
    return addresses;
  }
}

/*
  Client fidelity measures:  Amount of spends or Items bought (Maybe).
  Reward options: Tokens or Non Fungible Sale Tickets.

  This leaves 4 possible combinations:
   - X amount of spends -> Tokens reward.
   - X amount of spends -> Non Fungible Sale Ticket reward.
   - X Items bought -> Tokens reward. (Maybe)
   - X Items bought -> Non Fungible Sale Ticket reward. (Maybe)
*/
