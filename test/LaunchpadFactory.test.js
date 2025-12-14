const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture, time } = require("@nomicfoundation/hardhat-network-helpers");

describe("LaunchpadFactory", function () {
    // Fixture for deploying contracts
    async function deployLaunchpadFixture() {
        const [owner, creator, buyer1, buyer2, buyer3] = await ethers.getSigners();

        // Deploy mock FCWEED token
        const MockERC20 = await ethers.getContractFactory("MemeToken");
        const fcweedToken = await MockERC20.deploy(
            "FCWEED",
            "FCWEED",
            ethers.parseEther("1000000000"),
            owner.address,
            owner.address
        );

        // Deploy mock Uniswap V2 contracts (simplified for testing)
        // In production, use actual Uniswap addresses
        const MockRouter = await ethers.getContractFactory("MockUniswapV2Router");
        const mockRouter = await MockRouter.deploy();

        // Deploy LaunchpadFactory
        const LaunchpadFactory = await ethers.getContractFactory("LaunchpadFactory");
        const launchpad = await LaunchpadFactory.deploy(
            await mockRouter.getAddress(),
            await fcweedToken.getAddress()
        );

        return { launchpad, fcweedToken, mockRouter, owner, creator, buyer1, buyer2, buyer3 };
    }

    describe("Deployment", function () {
        it("Should set the right owner", async function () {
            const { launchpad, owner } = await loadFixture(deployLaunchpadFixture);
            expect(await launchpad.owner()).to.equal(owner.address);
        });

        it("Should set correct Uniswap router", async function () {
            const { launchpad, mockRouter } = await loadFixture(deployLaunchpadFixture);
            expect(await launchpad.uniswapRouter()).to.equal(await mockRouter.getAddress());
        });

        it("Should set correct FCWEED token", async function () {
            const { launchpad, fcweedToken } = await loadFixture(deployLaunchpadFixture);
            expect(await launchpad.fcweedToken()).to.equal(await fcweedToken.getAddress());
        });

        it("Should set default platform fee to 1%", async function () {
            const { launchpad } = await loadFixture(deployLaunchpadFixture);
            expect(await launchpad.platformFeePercentage()).to.equal(100);
        });
    });

    describe("Launch Creation", function () {
        it("Should create a new token launch", async function () {
            const { launchpad, creator } = await loadFixture(deployLaunchpadFixture);

            const tx = await launchpad.connect(creator).createLaunch("TestMeme", "MEME");
            const receipt = await tx.wait();

            // Find LaunchCreated event
            const event = receipt.logs.find(
                log => log.fragment && log.fragment.name === "LaunchCreated"
            );
            expect(event).to.not.be.undefined;

            const tokenAddress = event.args[0];
            const launch = await launchpad.getLaunch(tokenAddress);

            expect(launch.creator).to.equal(creator.address);
            expect(launch.active).to.be.true;
            expect(launch.graduated).to.be.false;
            expect(launch.totalRaised).to.equal(0);
            expect(launch.tokensSold).to.equal(0);
        });

        it("Should add launch to allLaunches array", async function () {
            const { launchpad, creator } = await loadFixture(deployLaunchpadFixture);

            await launchpad.connect(creator).createLaunch("TestMeme", "MEME");
            const launches = await launchpad.getAllLaunches();

            expect(launches.length).to.equal(1);
        });

        it("Should emit LaunchCreated event", async function () {
            const { launchpad, creator } = await loadFixture(deployLaunchpadFixture);

            await expect(launchpad.connect(creator).createLaunch("TestMeme", "MEME"))
                .to.emit(launchpad, "LaunchCreated");
        });
    });

    describe("Bonding Curve - Phase 1", function () {
        it("Should allow buying tokens in phase 1", async function () {
            const { launchpad, creator, buyer1 } = await loadFixture(deployLaunchpadFixture);

            // Create launch
            const tx = await launchpad.connect(creator).createLaunch("TestMeme", "MEME");
            const receipt = await tx.wait();
            const event = receipt.logs.find(log => log.fragment && log.fragment.name === "LaunchCreated");
            const tokenAddress = event.args[0];

            // Buy tokens
            const buyAmount = ethers.parseEther("1");
            await expect(launchpad.connect(buyer1).buyTokens(tokenAddress, { value: buyAmount }))
                .to.emit(launchpad, "TokensPurchased");

            const launch = await launchpad.getLaunch(tokenAddress);
            expect(launch.totalRaised).to.be.gt(0);
            expect(launch.tokensSold).to.be.gt(0);
        });

        it("Should calculate correct token amount based on bonding curve", async function () {
            const { launchpad, creator } = await loadFixture(deployLaunchpadFixture);

            const tx = await launchpad.connect(creator).createLaunch("TestMeme", "MEME");
            const receipt = await tx.wait();
            const event = receipt.logs.find(log => log.fragment && log.fragment.name === "LaunchCreated");
            const tokenAddress = event.args[0];

            const buyAmount = ethers.parseEther("1");
            const [tokenAmount, actualCost, newPrice] = await launchpad.calculatePurchase(
                tokenAddress,
                buyAmount
            );

            expect(tokenAmount).to.be.gt(0);
            expect(actualCost).to.be.lte(buyAmount);
            expect(newPrice).to.be.gt(await launchpad.INITIAL_PRICE());
        });

        it("Should increase price with each purchase", async function () {
            const { launchpad, creator, buyer1, buyer2 } = await loadFixture(deployLaunchpadFixture);

            const tx = await launchpad.connect(creator).createLaunch("TestMeme", "MEME");
            const receipt = await tx.wait();
            const event = receipt.logs.find(log => log.fragment && log.fragment.name === "LaunchCreated");
            const tokenAddress = event.args[0];

            const initialPrice = await launchpad.getCurrentPrice(tokenAddress);

            // First purchase
            await launchpad.connect(buyer1).buyTokens(tokenAddress, { value: ethers.parseEther("1") });
            const priceAfterFirst = await launchpad.getCurrentPrice(tokenAddress);

            expect(priceAfterFirst).to.be.gt(initialPrice);

            // Second purchase
            await launchpad.connect(buyer2).buyTokens(tokenAddress, { value: ethers.parseEther("1") });
            const priceAfterSecond = await launchpad.getCurrentPrice(tokenAddress);

            expect(priceAfterSecond).to.be.gt(priceAfterFirst);
        });

        it("Should refund excess ETH", async function () {
            const { launchpad, creator, buyer1 } = await loadFixture(deployLaunchpadFixture);

            const tx = await launchpad.connect(creator).createLaunch("TestMeme", "MEME");
            const receipt = await tx.wait();
            const event = receipt.logs.find(log => log.fragment && log.fragment.name === "LaunchCreated");
            const tokenAddress = event.args[0];

            const buyAmount = ethers.parseEther("10");
            const balanceBefore = await ethers.provider.getBalance(buyer1.address);

            const buyTx = await launchpad.connect(buyer1).buyTokens(tokenAddress, { value: buyAmount });
            const buyReceipt = await buyTx.wait();
            const gasUsed = buyReceipt.gasUsed * buyReceipt.gasPrice;

            const balanceAfter = await ethers.provider.getBalance(buyer1.address);
            const launch = await launchpad.getLaunch(tokenAddress);

            // Balance should decrease by (totalRaised + gas), not full buyAmount if refunded
            const actualSpent = balanceBefore - balanceAfter - gasUsed;
            expect(actualSpent).to.equal(launch.totalRaised);
        });

        it("Should revert if launch not active", async function () {
            const { launchpad, buyer1 } = await loadFixture(deployLaunchpadFixture);

            await expect(
                launchpad.connect(buyer1).buyTokens(ethers.ZeroAddress, { value: ethers.parseEther("1") })
            ).to.be.revertedWith("Launch not active");
        });

        it("Should revert if no ETH sent", async function () {
            const { launchpad, creator, buyer1 } = await loadFixture(deployLaunchpadFixture);

            const tx = await launchpad.connect(creator).createLaunch("TestMeme", "MEME");
            const receipt = await tx.wait();
            const event = receipt.logs.find(log => log.fragment && log.fragment.name === "LaunchCreated");
            const tokenAddress = event.args[0];

            await expect(
                launchpad.connect(buyer1).buyTokens(tokenAddress, { value: 0 })
            ).to.be.revertedWith("Must send ETH");
        });
    });

    describe("DEX Graduation - Phase 2", function () {
        it("Should graduate to DEX when market cap reached", async function () {
            const { launchpad, creator, buyer1 } = await loadFixture(deployLaunchpadFixture);

            const tx = await launchpad.connect(creator).createLaunch("TestMeme", "MEME");
            const receipt = await tx.wait();
            const event = receipt.logs.find(log => log.fragment && log.fragment.name === "LaunchCreated");
            const tokenAddress = event.args[0];

            // Buy enough to reach graduation (69 ETH)
            const graduationAmount = ethers.parseEther("70");

            await expect(
                launchpad.connect(buyer1).buyTokens(tokenAddress, { value: graduationAmount })
            ).to.emit(launchpad, "LaunchGraduated");

            const launch = await launchpad.getLaunch(tokenAddress);
            expect(launch.graduated).to.be.true;
            expect(launch.active).to.be.false;
        });

        it("Should collect platform fee on graduation", async function () {
            const { launchpad, creator, buyer1, owner } = await loadFixture(deployLaunchpadFixture);

            const tx = await launchpad.connect(creator).createLaunch("TestMeme", "MEME");
            const receipt = await tx.wait();
            const event = receipt.logs.find(log => log.fragment && log.fragment.name === "LaunchCreated");
            const tokenAddress = event.args[0];

            const ownerBalanceBefore = await ethers.provider.getBalance(owner.address);

            // Buy enough to graduate
            await launchpad.connect(buyer1).buyTokens(tokenAddress, { value: ethers.parseEther("70") });

            const ownerBalanceAfter = await ethers.provider.getBalance(owner.address);
            const balanceIncrease = ownerBalanceAfter - ownerBalanceBefore;

            // Should receive platform fee (1% of raised amount)
            expect(balanceIncrease).to.be.gt(0);
        });

        it("Should transfer token ownership to creator on graduation", async function () {
            const { launchpad, creator, buyer1 } = await loadFixture(deployLaunchpadFixture);

            const tx = await launchpad.connect(creator).createLaunch("TestMeme", "MEME");
            const receipt = await tx.wait();
            const event = receipt.logs.find(log => log.fragment && log.fragment.name === "LaunchCreated");
            const tokenAddress = event.args[0];

            await launchpad.connect(buyer1).buyTokens(tokenAddress, { value: ethers.parseEther("70") });

            const MemeToken = await ethers.getContractFactory("MemeToken");
            const token = MemeToken.attach(tokenAddress);

            expect(await token.owner()).to.equal(creator.address);
        });

        it("Should not allow buying after graduation", async function () {
            const { launchpad, creator, buyer1, buyer2 } = await loadFixture(deployLaunchpadFixture);

            const tx = await launchpad.connect(creator).createLaunch("TestMeme", "MEME");
            const receipt = await tx.wait();
            const event = receipt.logs.find(log => log.fragment && log.fragment.name === "LaunchCreated");
            const tokenAddress = event.args[0];

            // Graduate
            await launchpad.connect(buyer1).buyTokens(tokenAddress, { value: ethers.parseEther("70") });

            // Try to buy after graduation
            await expect(
                launchpad.connect(buyer2).buyTokens(tokenAddress, { value: ethers.parseEther("1") })
            ).to.be.revertedWith("Already graduated to DEX");
        });
    });

    describe("Platform Configuration", function () {
        it("Should allow owner to update platform fee", async function () {
            const { launchpad, owner } = await loadFixture(deployLaunchpadFixture);

            await expect(launchpad.connect(owner).setPlatformFee(200))
                .to.emit(launchpad, "PlatformFeeUpdated")
                .withArgs(100, 200);

            expect(await launchpad.platformFeePercentage()).to.equal(200);
        });

        it("Should not allow platform fee above maximum", async function () {
            const { launchpad, owner } = await loadFixture(deployLaunchpadFixture);

            await expect(launchpad.connect(owner).setPlatformFee(501))
                .to.be.revertedWith("Fee too high");
        });

        it("Should not allow non-owner to update platform fee", async function () {
            const { launchpad, buyer1 } = await loadFixture(deployLaunchpadFixture);

            await expect(launchpad.connect(buyer1).setPlatformFee(200))
                .to.be.reverted;
        });
    });

    describe("Emergency Functions", function () {
        it("Should allow owner to manually graduate a launch", async function () {
            const { launchpad, creator, buyer1, owner } = await loadFixture(deployLaunchpadFixture);

            const tx = await launchpad.connect(creator).createLaunch("TestMeme", "MEME");
            const receipt = await tx.wait();
            const event = receipt.logs.find(log => log.fragment && log.fragment.name === "LaunchCreated");
            const tokenAddress = event.args[0];

            // Buy some tokens (not enough to auto-graduate)
            await launchpad.connect(buyer1).buyTokens(tokenAddress, { value: ethers.parseEther("10") });

            // Owner manually graduates
            await expect(launchpad.connect(owner).graduateToDex(tokenAddress))
                .to.emit(launchpad, "LaunchGraduated");

            const launch = await launchpad.getLaunch(tokenAddress);
            expect(launch.graduated).to.be.true;
        });

        it("Should allow owner to emergency withdraw", async function () {
            const { launchpad, owner } = await loadFixture(deployLaunchpadFixture);

            // Send some ETH to contract
            await owner.sendTransaction({
                to: await launchpad.getAddress(),
                value: ethers.parseEther("1")
            });

            const balanceBefore = await ethers.provider.getBalance(owner.address);
            const contractBalance = await ethers.provider.getBalance(await launchpad.getAddress());

            await launchpad.connect(owner).emergencyWithdraw();

            const balanceAfter = await ethers.provider.getBalance(owner.address);
            expect(balanceAfter).to.be.gt(balanceBefore);
            expect(await ethers.provider.getBalance(await launchpad.getAddress())).to.equal(0);
        });
    });

    describe("View Functions", function () {
        it("Should return all launches", async function () {
            const { launchpad, creator } = await loadFixture(deployLaunchpadFixture);

            await launchpad.connect(creator).createLaunch("Meme1", "M1");
            await launchpad.connect(creator).createLaunch("Meme2", "M2");
            await launchpad.connect(creator).createLaunch("Meme3", "M3");

            const launches = await launchpad.getAllLaunches();
            expect(launches.length).to.equal(3);
        });

        it("Should return correct launch details", async function () {
            const { launchpad, creator } = await loadFixture(deployLaunchpadFixture);

            const tx = await launchpad.connect(creator).createLaunch("TestMeme", "MEME");
            const receipt = await tx.wait();
            const event = receipt.logs.find(log => log.fragment && log.fragment.name === "LaunchCreated");
            const tokenAddress = event.args[0];

            const launch = await launchpad.getLaunch(tokenAddress);

            expect(launch.tokenAddress).to.equal(tokenAddress);
            expect(launch.creator).to.equal(creator.address);
            expect(launch.active).to.be.true;
        });
    });
});
