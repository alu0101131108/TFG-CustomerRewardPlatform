// SPDX-License-Identifier: MIT

pragma solidity ^0.8.9;

import "./Constants.sol";
import "./DataStructures.sol";
import "./RewardPlan.sol";

contract RewardCenter {
    mapping(uint256 => ClientProfile) public clientRegistry; // Numeric Id => Client Profile.
    mapping(address => EntityProfile) public entityRegistry; // Address => Entity Profile.
    mapping(address => PlanProfile) public planRegistry; // Address => Reward Plan Profile.
    mapping(address => address[]) public entityRelatedPlans; // Address => Plan adress array.

    modifier onlyPlans() {
        require(
            planRegistry[msg.sender].active,
            "Only active plans authorized"
        );
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
            address[] memory founderAddresses = TargetPlan
                .getFounderAddresses();
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
    function createRewardPlan(
        uint256 creatorContribution,
        uint256 signPeriodDaysLimit
    ) external payable {
        creatorContribution = creatorContribution * MILLIETHER_TO_WEI;
        require(
            msg.value >= MIN_CREATOR_COLLAB && msg.value >= creatorContribution,
            "Invalid collaboration amount"
        );
        require(
            signPeriodDaysLimit >= 0 &&
                signPeriodDaysLimit <= MAX_SIGN_PERIOD_DAYS,
            "Invalid sign period time limit"
        );

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
            creatorContribution,
            signPeriodDaysLimit
        );
        entityRelatedPlans[msg.sender].push(address(plan));
        planRegistry[address(plan)] = PlanProfile(
            true,
            msg.sender,
            creatorContribution
        );
        require(
            payable(address(plan)).send(creatorContribution),
            "Payment failed"
        );
    }

    function notifyFounderSigned(
        address founderAddress,
        uint256 collaborationAmount
    ) external onlyPlans {
        // Sign as entity if not already signed. Also increase running plans counter.
        if (entityRegistry[founderAddress].active) {
            entityRegistry[founderAddress].runningPlans += 1;
        } else {
            entityRegistry[founderAddress] = EntityProfile(
                true,
                founderAddress,
                1
            );
        }
        entityRelatedPlans[founderAddress].push(msg.sender);

        // Increase plans balance by the founders collaboration amount.
        planRegistry[msg.sender].balance += collaborationAmount;
    }

    function signUpClient(uint256 clientId, address addr) external onlyPlans {
        require(!clientRegistry[clientId].active, "Id is already taken");

        clientRegistry[clientId] = ClientProfile(true, addr, 0);
    }

    function grantReward(uint256 clientId, uint256 amount) external onlyPlans {
        require(clientRegistry[clientId].active, "Client not registered");

        // Check if the plan can grant rewards, deprecate if its rewardTokens or eth balance is 0.
        bool isDeprecated = evaluatePlanDeprecation(payable(msg.sender));
        if (!isDeprecated) {
            clientRegistry[clientId].balance += amount;
        }
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
}
