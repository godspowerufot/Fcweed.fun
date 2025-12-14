const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");

describe("MemeToken", function () {
    // Fixture for deploying contracts
    async function deployTokenFixture() {
        const [owner, addr1, addr2, addr3] = await ethers.getSigners();

        // Deploy mock FCWEED token
        const MockERC20 = await ethers.getContractFactory("MemeToken");
        const fcweedToken = await MockERC20.deploy(
            "FCWEED",
            "FCWEED",
            ethers.parseEther("1000000000"), // 1B supply
            owner.address, // Use owner as placeholder for FCWEED
            owner.address
        );

        // Deploy MemeToken
        const totalSupply = ethers.parseEther("1000000000"); // 1B tokens
        const memeToken = await MockERC20.deploy(
            "TestMeme",
            "MEME",
            totalSupply,
            await fcweedToken.getAddress(),
            owner.address
        );

        return { memeToken, fcweedToken, owner, addr1, addr2, addr3, totalSupply };
    }

    describe("Deployment", function () {
        it("Should set the right owner", async function () {
            const { memeToken, owner } = await loadFixture(deployTokenFixture);
            expect(await memeToken.owner()).to.equal(owner.address);
        });

        it("Should assign the total supply to the owner", async function () {
            const { memeToken, owner, totalSupply } = await loadFixture(deployTokenFixture);
            expect(await memeToken.balanceOf(owner.address)).to.equal(totalSupply);
        });

        it("Should set the correct FCWEED token", async function () {
            const { memeToken, fcweedToken } = await loadFixture(deployTokenFixture);
            expect(await memeToken.fcweedToken()).to.equal(await fcweedToken.getAddress());
        });

        it("Should set default tax percentage to 3%", async function () {
            const { memeToken } = await loadFixture(deployTokenFixture);
            expect(await memeToken.taxPercentage()).to.equal(300); // 3% = 300 basis points
        });

        it("Should exempt owner and contract from tax", async function () {
            const { memeToken, owner } = await loadFixture(deployTokenFixture);
            expect(await memeToken.isTaxExempt(owner.address)).to.be.true;
            expect(await memeToken.isTaxExempt(await memeToken.getAddress())).to.be.true;
        });
    });

    describe("Tax Mechanism", function () {
        it("Should apply 3% tax on transfers", async function () {
            const { memeToken, owner, addr1, addr2 } = await loadFixture(deployTokenFixture);

            const transferAmount = ethers.parseEther("1000");
            const expectedTax = (transferAmount * 300n) / 10000n; // 3%
            const expectedReceived = transferAmount - expectedTax;

            // Transfer from owner to addr1 (owner is exempt, so no tax)
            await memeToken.transfer(addr1.address, transferAmount);
            expect(await memeToken.balanceOf(addr1.address)).to.equal(transferAmount);

            // Transfer from addr1 to addr2 (should apply tax)
            await memeToken.connect(addr1).transfer(addr2.address, transferAmount);

            expect(await memeToken.balanceOf(addr2.address)).to.equal(expectedReceived);
            expect(await memeToken.balanceOf(await memeToken.getAddress())).to.equal(expectedTax);
        });

        it("Should not apply tax to exempt addresses", async function () {
            const { memeToken, owner, addr1 } = await loadFixture(deployTokenFixture);

            const transferAmount = ethers.parseEther("1000");

            // Transfer from owner (exempt) to addr1
            await memeToken.transfer(addr1.address, transferAmount);
            expect(await memeToken.balanceOf(addr1.address)).to.equal(transferAmount);

            // No tax should be collected
            expect(await memeToken.balanceOf(await memeToken.getAddress())).to.equal(0);
        });

        it("Should track total tax collected", async function () {
            const { memeToken, owner, addr1, addr2 } = await loadFixture(deployTokenFixture);

            const transferAmount = ethers.parseEther("1000");
            const expectedTax = (transferAmount * 300n) / 10000n;

            await memeToken.transfer(addr1.address, transferAmount);
            await memeToken.connect(addr1).transfer(addr2.address, transferAmount);

            expect(await memeToken.totalTaxCollected()).to.equal(expectedTax);
        });

        it("Should emit TaxCollected event", async function () {
            const { memeToken, owner, addr1, addr2 } = await loadFixture(deployTokenFixture);

            const transferAmount = ethers.parseEther("1000");
            const expectedTax = (transferAmount * 300n) / 10000n;

            await memeToken.transfer(addr1.address, transferAmount);

            await expect(memeToken.connect(addr1).transfer(addr2.address, transferAmount))
                .to.emit(memeToken, "TaxCollected")
                .withArgs(addr1.address, addr2.address, expectedTax);
        });
    });

    describe("Tax Configuration", function () {
        it("Should allow owner to update tax percentage", async function () {
            const { memeToken, owner } = await loadFixture(deployTokenFixture);

            await expect(memeToken.setTaxPercentage(500))
                .to.emit(memeToken, "TaxPercentageUpdated")
                .withArgs(300, 500);

            expect(await memeToken.taxPercentage()).to.equal(500);
        });

        it("Should not allow tax above maximum", async function () {
            const { memeToken } = await loadFixture(deployTokenFixture);

            await expect(memeToken.setTaxPercentage(1001))
                .to.be.revertedWith("Tax too high");
        });

        it("Should not allow non-owner to update tax", async function () {
            const { memeToken, addr1 } = await loadFixture(deployTokenFixture);

            await expect(memeToken.connect(addr1).setTaxPercentage(500))
                .to.be.reverted;
        });

        it("Should allow owner to set tax exemptions", async function () {
            const { memeToken, addr1 } = await loadFixture(deployTokenFixture);

            await expect(memeToken.setTaxExempt(addr1.address, true))
                .to.emit(memeToken, "TaxExemptionUpdated")
                .withArgs(addr1.address, true);

            expect(await memeToken.isTaxExempt(addr1.address)).to.be.true;
        });

        it("Should allow owner to update FCWEED token", async function () {
            const { memeToken, addr1 } = await loadFixture(deployTokenFixture);

            await expect(memeToken.setFcweedToken(addr1.address))
                .to.emit(memeToken, "FcweedTokenUpdated");

            expect(await memeToken.fcweedToken()).to.equal(addr1.address);
        });
    });

    describe("Tax Distribution", function () {
        it("Should allow owner to distribute tax rewards", async function () {
            const { memeToken, fcweedToken, owner, addr1, addr2 } = await loadFixture(deployTokenFixture);

            // Setup: collect some tax first
            const transferAmount = ethers.parseEther("10000");
            await memeToken.transfer(addr1.address, transferAmount);
            await memeToken.connect(addr1).transfer(addr2.address, transferAmount);

            // Prepare FCWEED for distribution
            const fcweedAmount = ethers.parseEther("100");
            await fcweedToken.approve(await memeToken.getAddress(), fcweedAmount);

            // Distribute rewards
            const recipients = [addr1.address, addr2.address];
            const amounts = [ethers.parseEther("60"), ethers.parseEther("40")];

            await expect(memeToken.distributeTaxRewards(fcweedAmount, recipients, amounts))
                .to.emit(memeToken, "TaxDistributed")
                .withArgs(fcweedAmount);
        });

        it("Should revert if arrays length mismatch", async function () {
            const { memeToken } = await loadFixture(deployTokenFixture);

            const recipients = [ethers.ZeroAddress];
            const amounts = [ethers.parseEther("100"), ethers.parseEther("50")];

            await expect(memeToken.distributeTaxRewards(ethers.parseEther("150"), recipients, amounts))
                .to.be.revertedWith("Array length mismatch");
        });
    });

    describe("Emergency Functions", function () {
        it("Should allow owner to withdraw collected tax", async function () {
            const { memeToken, owner, addr1, addr2 } = await loadFixture(deployTokenFixture);

            // Collect some tax
            const transferAmount = ethers.parseEther("1000");
            await memeToken.transfer(addr1.address, transferAmount);
            await memeToken.connect(addr1).transfer(addr2.address, transferAmount);

            const taxCollected = await memeToken.balanceOf(await memeToken.getAddress());
            const ownerBalanceBefore = await memeToken.balanceOf(owner.address);

            await memeToken.withdrawTax(taxCollected);

            expect(await memeToken.balanceOf(await memeToken.getAddress())).to.equal(0);
            expect(await memeToken.balanceOf(owner.address)).to.equal(ownerBalanceBefore + taxCollected);
        });

        it("Should not allow non-owner to withdraw tax", async function () {
            const { memeToken, addr1 } = await loadFixture(deployTokenFixture);

            await expect(memeToken.connect(addr1).withdrawTax(100))
                .to.be.reverted;
        });
    });

    describe("Edge Cases", function () {
        it("Should handle zero transfers", async function () {
            const { memeToken, addr1 } = await loadFixture(deployTokenFixture);

            await expect(memeToken.transfer(addr1.address, 0))
                .to.not.be.reverted;
        });

        it("Should not overflow on large transfers", async function () {
            const { memeToken, owner, addr1 } = await loadFixture(deployTokenFixture);

            const largeAmount = ethers.parseEther("999999999");
            await expect(memeToken.transfer(addr1.address, largeAmount))
                .to.not.be.reverted;
        });

        it("Should revert on insufficient balance", async function () {
            const { memeToken, addr1, addr2 } = await loadFixture(deployTokenFixture);

            await expect(memeToken.connect(addr1).transfer(addr2.address, ethers.parseEther("1")))
                .to.be.reverted;
        });
    });
});
