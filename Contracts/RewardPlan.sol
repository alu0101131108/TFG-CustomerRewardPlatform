// SPDX-License-Identifier: MIT

pragma solidity 0.8.7;

import "./Constants.sol";
import "./DataStructures.sol";
import "./RewardCenter.sol";

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
    uint256 public signPeriodTimeLimit;
    uint256 public deployDate;

    /* Rules */
    SpendRule[] public spendRules; /* Sorted low to high reward*/
    // Rule[] rules; --> [rule 0: {[{item0, cuantity0}, {item1, cuantity1}], rewardAmount}, rule 1: {}, ...].

    /* Client registries */
    mapping(uint256 => ClientSpends) public clientSpendsRegistry; /* Client Id -> Client Spends */

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

    modifier signPeriodExpired() {
        require(
            block.timestamp > deployDate + signPeriodTimeLimit,
            "Sign period not expired"
        );
        _;
    }

    constructor(
        address creator,
        uint256 creatorContribution,
        uint256 signPeriodDaysLimit_
    ) {
        stage = Stages.CONSTRUCTION;
        rewardCenter = RewardCenter(payable(msg.sender));
        founders.push(Founder(creator, creatorContribution, false));
        deployDate = block.timestamp;
        signPeriodTimeLimit = signPeriodDaysLimit_ * 1 days;
    }

    receive() external payable {}

    /*
    PRIVATES
  */
    function checkSignatures() private {
        bool allSigned = true;
        for (uint8 i = 0; i < founders.length; i++) {
            if (!founders[i].signed) {
                allSigned = false;
                break;
            }
        }
        if (allSigned) stage = Stages.ACTIVE;
    }

    function checkItemRules() private {
        // Not implemented yet
    }

    function checkSpendRules(uint256 clientId) private {
        if (
            spendRules.length == 0 ||
            spendRules[0].spends > clientSpendsRegistry[clientId].spends
        ) return;
        for (uint256 i = 0; i < spendRules.length; i++) {
            if (spendRules[i].spends == clientSpendsRegistry[clientId].spends) {
                clientSpendsRegistry[clientId].spends -= spendRules[i].spends;
                rewardCenter.grantReward(clientId, spendRules[i].reward);
                break;
            } else if (
                spendRules[i].spends > clientSpendsRegistry[clientId].spends
            ) {
                clientSpendsRegistry[clientId].spends -= spendRules[i - 1]
                    .spends;
                rewardCenter.grantReward(clientId, spendRules[i - 1].reward);
                break;
            }
        }
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
        //(256 founders max)
        founders.push(
            Founder(addr, collaborationAmount * MILLIETHER_TO_WEI, false)
        );
    }

    function addNotifier(address addr)
        external
        atStage(Stages.CONSTRUCTION)
        onlyFounders
    {
        notifiers[addr] = Notifier(true);
    }

    function addItemRule() external atStage(Stages.CONSTRUCTION) onlyFounders {
        // Not implemented yet
    }

    function addSpendRule(
        uint256 spendsAmount,
        uint256 rewardAmount,
        bool sorted
    ) external atStage(Stages.CONSTRUCTION) onlyFounders {
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
        checkSignatures();
    }

    function signPeriodExpiredRefund()
        external
        atStages([Stages.CONSTRUCTION, Stages.SIGNING])
        signPeriodExpired
        onlyFounders
    {
        // If sign period has expired, return funds to every founder.
        for (uint8 i = 0; i < founders.length; i++) {
            if (founders[i].signed) {
                founders[i].signed = false;
                require(
                    payable(founders[i].addr).send(
                        founders[i].collaborationAmount
                    ),
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
        checkSpendRules(clientId);
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
