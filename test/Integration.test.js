const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");

describe("Integration Tests - Full Launch Flow", function () {
    async function deployFullSystemFixture() {
        const [owner, creator, buyer1, buyer2, buyer3, buyer4, buyer5] = await ethers.getSigners();

        // Deploy FCWEED token
        const MemeToken = await ethers.getContractFactory("MemeToken");
        const fcweedToken = await MemeToken.deploy(
            "FCWEED",
            "FCWEED",
            ethers.parseEther("1000000000"),
            owner.address, // Placeholder
            owner.address
        );

        // Deploy mock Uniswap router
        const MockRouter = await ethers.getContractFactory("MockUniswapV2Router");
        const mockRouter = await MockRouter.deploy();

        // Deploy LaunchpadFactory
        const LaunchpadFactory = await ethers.getContractFactory("LaunchpadFactory");
        const launchpad = await LaunchpadFactory.deploy(
            await mockRouter.getAddress(),
            await fcweedToken.getAddress()
        );

        return {
            launchpad,
            fcweedToken,
            mockRouter,
            owner,
            creator,
            buyer1,
            buyer2,
            buyer3,
            buyer4,
            buyer5
        };
    }

    describe("Complete Launch Lifecycle", function () {
        it("Should complete full launch from creation to DEX graduation", async function () {
            const { launchpad, creator, buyer1, buyer2, buyer3 } = await loadFixture(deployFullSystemFixture);

            // Step 1: Creator launches a new token
            console.log("\n=== Step 1: Creating Launch ===");
            const createTx = await launchpad.connect(creator).createLaunch("PumpMeme", "PUMP");
            const createReceipt = await createTx.wait();
            const event = createReceipt.logs.find(log => log.fragment && log.fragment.name === "LaunchCreated");
            const tokenAddress = event.args[0];

            console.log("Token created at:", tokenAddress);

            const MemeToken = await ethers.getContractFactory("MemeToken");
            const token = MemeToken.attach(tokenAddress);

            // Verify initial state
            expect(await token.name()).to.equal("PumpMeme");
            expect(await token.symbol()).to.equal("PUMP");

            const launch = await launchpad.getLaunch(tokenAddress);
            expect(launch.active).to.be.true;
            expect(launch.graduated).to.be.false;

            // Step 2: Multiple buyers purchase during bonding curve phase
            console.log("\n=== Step 2: Bonding Curve Purchases ===");

            const buy1Amount = ethers.parseEther("10");
            await launchpad.connect(buyer1).buyTokens(tokenAddress, { value: buy1Amount });
            console.log("Buyer 1 purchased with 10 ETH");

            const buyer1Balance = await token.balanceOf(buyer1.address);
            console.log("Buyer 1 token balance:", ethers.formatEther(buyer1Balance));
            expect(buyer1Balance).to.be.gt(0);

            const buy2Amount = ethers.parseEther("20");
            await launchpad.connect(buyer2).buyTokens(tokenAddress, { value: buy2Amount });
            console.log("Buyer 2 purchased with 20 ETH");

            const buyer2Balance = await token.balanceOf(buyer2.address);
            console.log("Buyer 2 token balance:", ethers.formatEther(buyer2Balance));
            expect(buyer2Balance).to.be.gt(0);

            // Check price increased
            const currentPrice = await launchpad.getCurrentPrice(tokenAddress);
            const initialPrice = await launchpad.INITIAL_PRICE();
            expect(currentPrice).to.be.gt(initialPrice);
            console.log("Current price:", ethers.formatEther(currentPrice), "ETH per token");

            // Step 3: Final purchase triggers graduation
            console.log("\n=== Step 3: Graduation to DEX ===");

            const launchBefore = await launchpad.getLaunch(tokenAddress);
            console.log("Total raised before graduation:", ethers.formatEther(launchBefore.totalRaised), "ETH");

            // Calculate remaining amount needed to reach graduation
            const graduationCap = await launchpad.GRADUATION_MARKET_CAP();
            const remaining = graduationCap - launchBefore.totalRaised;
            console.log("Remaining to graduate:", ethers.formatEther(remaining), "ETH");

            // Buyer 3 triggers graduation
            const graduationTx = await launchpad.connect(buyer3).buyTokens(tokenAddress, {
                value: remaining + ethers.parseEther("1")
            });
            const graduationReceipt = await graduationTx.wait();

            // Verify graduation event
            const graduationEvent = graduationReceipt.logs.find(
                log => log.fragment && log.fragment.name === "LaunchGraduated"
            );
            expect(graduationEvent).to.not.be.undefined;
            console.log("Launch graduated! Pair created at:", graduationEvent.args[2]);

            // Step 4: Verify post-graduation state
            console.log("\n=== Step 4: Post-Graduation Verification ===");

            const launchAfter = await launchpad.getLaunch(tokenAddress);
            expect(launchAfter.graduated).to.be.true;
            expect(launchAfter.active).to.be.false;
            console.log("Launch status: Graduated ✓");

            // Verify ownership transferred to creator
            expect(await token.owner()).to.equal(creator.address);
            console.log("Token ownership transferred to creator ✓");

            // Verify tax exemption removed
            expect(await token.isTaxExempt(await launchpad.getAddress())).to.be.false;
            console.log("Launchpad tax exemption removed ✓");

            // Step 5: Test tax mechanism post-graduation
            console.log("\n=== Step 5: Tax Mechanism Test ===");

            const buyer1BalanceBefore = await token.balanceOf(buyer1.address);
            const transferAmount = ethers.parseEther("1000");

            // Transfer between buyers (should apply 3% tax)
            await token.connect(buyer1).transfer(buyer2.address, transferAmount);

            const expectedTax = (transferAmount * 300n) / 10000n; // 3%
            const expectedReceived = transferAmount - expectedTax;

            const buyer2BalanceAfter = await token.balanceOf(buyer2.address);
            const taxCollected = await token.balanceOf(await token.getAddress());

            console.log("Tax collected:", ethers.formatEther(taxCollected));
            expect(taxCollected).to.equal(expectedTax);
            console.log("Tax mechanism working correctly ✓");

            console.log("\n=== Integration Test Complete ===");
        });

        it("Should handle multiple concurrent launches", async function () {
            const { launchpad, creator, buyer1, buyer2 } = await loadFixture(deployFullSystemFixture);

            // Create multiple launches
            const tx1 = await launchpad.connect(creator).createLaunch("Meme1", "M1");
            const tx2 = await launchpad.connect(creator).createLaunch("Meme2", "M2");
            const tx3 = await launchpad.connect(creator).createLaunch("Meme3", "M3");

            const receipt1 = await tx1.wait();
            const receipt2 = await tx2.wait();
            const receipt3 = await tx3.wait();

            const token1 = receipt1.logs.find(log => log.fragment && log.fragment.name === "LaunchCreated").args[0];
            const token2 = receipt2.logs.find(log => log.fragment && log.fragment.name === "LaunchCreated").args[0];
            const token3 = receipt3.logs.find(log => log.fragment && log.fragment.name === "LaunchCreated").args[0];

            // Buy from different launches
            await launchpad.connect(buyer1).buyTokens(token1, { value: ethers.parseEther("5") });
            await launchpad.connect(buyer2).buyTokens(token2, { value: ethers.parseEther("10") });
            await launchpad.connect(buyer1).buyTokens(token3, { value: ethers.parseEther("15") });

            // Verify all launches are independent
            const launch1 = await launchpad.getLaunch(token1);
            const launch2 = await launchpad.getLaunch(token2);
            const launch3 = await launchpad.getLaunch(token3);

            expect(launch1.totalRaised).to.not.equal(launch2.totalRaised);
            expect(launch2.totalRaised).to.not.equal(launch3.totalRaised);

            // Verify getAllLaunches
            const allLaunches = await launchpad.getAllLaunches();
            expect(allLaunches.length).to.equal(3);
        });

        it("Should correctly distribute platform fees", async function () {
            const { launchpad, creator, buyer1, owner } = await loadFixture(deployFullSystemFixture);

            const tx = await launchpad.connect(creator).createLaunch("FeeMeme", "FEE");
            const receipt = await tx.wait();
            const tokenAddress = receipt.logs.find(log => log.fragment && log.fragment.name === "LaunchCreated").args[0];

            const ownerBalanceBefore = await ethers.provider.getBalance(owner.address);

            // Buy enough to graduate
            await launchpad.connect(buyer1).buyTokens(tokenAddress, { value: ethers.parseEther("70") });

            const ownerBalanceAfter = await ethers.provider.getBalance(owner.address);
            const platformFee = ownerBalanceAfter - ownerBalanceBefore;

            // Platform fee should be ~1% of 69 ETH (graduation cap)
            const expectedFee = (ethers.parseEther("69") * 100n) / 10000n; // 1%

            // Allow small variance due to actual raised amount
            expect(platformFee).to.be.closeTo(expectedFee, ethers.parseEther("0.1"));
        });

        it("Should prevent buying after graduation", async function () {
            const { launchpad, creator, buyer1, buyer2 } = await loadFixture(deployFullSystemFixture);

            const tx = await launchpad.connect(creator).createLaunch("TestMeme", "TEST");
            const receipt = await tx.wait();
            const tokenAddress = receipt.logs.find(log => log.fragment && log.fragment.name === "LaunchCreated").args[0];

            // Graduate the launch
            await launchpad.connect(buyer1).buyTokens(tokenAddress, { value: ethers.parseEther("70") });

            // Try to buy after graduation
            await expect(
                launchpad.connect(buyer2).buyTokens(tokenAddress, { value: ethers.parseEther("1") })
            ).to.be.revertedWith("Already graduated to DEX");
        });

        it("Should handle edge case: exact graduation amount", async function () {
            const { launchpad, creator, buyer1 } = await loadFixture(deployFullSystemFixture);

            const tx = await launchpad.connect(creator).createLaunch("ExactMeme", "EXACT");
            const receipt = await tx.wait();
            const tokenAddress = receipt.logs.find(log => log.fragment && log.fragment.name === "LaunchCreated").args[0];

            const graduationCap = await launchpad.GRADUATION_MARKET_CAP();

            // Buy exactly the graduation amount
            await expect(
                launchpad.connect(buyer1).buyTokens(tokenAddress, { value: graduationCap })
            ).to.emit(launchpad, "LaunchGraduated");

            const launch = await launchpad.getLaunch(tokenAddress);
            expect(launch.graduated).to.be.true;
        });
    });

    describe("Security Tests", function () {
        it("Should prevent reentrancy attacks", async function () {
            const { launchpad, creator } = await loadFixture(deployFullSystemFixture);

            // Create launch
            const tx = await launchpad.connect(creator).createLaunch("SecureMeme", "SEC");
            const receipt = await tx.wait();
            const tokenAddress = receipt.logs.find(log => log.fragment && log.fragment.name === "LaunchCreated").args[0];

            // Deploy malicious contract that attempts reentrancy
            const MaliciousContract = await ethers.getContractFactory("MaliciousBuyer");
            const malicious = await MaliciousContract.deploy(await launchpad.getAddress());

            // Attempt attack (should fail due to ReentrancyGuard)
            await expect(
                malicious.attack(tokenAddress, { value: ethers.parseEther("1") })
            ).to.be.reverted;
        });

        it("Should only allow owner to call admin functions", async function () {
            const { launchpad, buyer1 } = await loadFixture(deployFullSystemFixture);

            await expect(
                launchpad.connect(buyer1).setPlatformFee(200)
            ).to.be.reverted;

            await expect(
                launchpad.connect(buyer1).emergencyWithdraw()
            ).to.be.reverted;
        });
    });
});

// Helper contract for reentrancy testing
// Note: This would need to be in a separate file in production
