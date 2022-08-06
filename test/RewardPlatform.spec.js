const { ethers } = require("hardhat");
const { assert } = require("chai");
const { time, loadFixture } = require("@nomicfoundation/hardhat-network-helpers");
const { anyValue } = require("@nomicfoundation/hardhat-chai-matchers/withArgs");

describe("Reward Platform", function () {

  async function RewardCenterDeployed() {
    const RewardCenter = await ethers.getContractFactory("RewardCenter");
    const rewardCenter = await RewardCenter.deploy();

    return { rewardCenter };
  }

  async function RewardPlanDeployed() {
    const { rewardCenter } = await RewardCenterDeployed();
    const rewardPlan = await rewardCenter.createRewardPlan(1000, 1, { value: ethers.utils.parseEther("1") });

    return { rewardCenter, rewardPlan };
  }

  describe("Standard flow of use", function () {

    it("Should deploy RewardCenter and initialize its attributes", async function () {
      const { rewardCenter } = await loadFixture(RewardCenterDeployed);
      assert(rewardCenter.address !== undefined);
      assert(await rewardCenter.clientRegistry !== undefined);
      assert(await rewardCenter.entityRegistry !== undefined);
      assert(await rewardCenter.planRegistry !== undefined);
      assert(await rewardCenter.entityRelatedPlans !== undefined);
    });

    it("Should deploy RewardPlan", async function () {
      const { rewardCenter, rewardPlan } = await loadFixture(RewardPlanDeployed);
      console.log(rewardPlan);
      assert(rewardPlan !== undefined);
    });

  });

});
