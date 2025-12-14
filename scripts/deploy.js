const hre = require("hardhat");

async function main() {
    console.log("🚀 Starting Pump.fun-style Launchpad Deployment...\n");

    const [deployer] = await hre.ethers.getSigners();
    console.log("Deploying contracts with account:", deployer.address);
    console.log("Account balance:", hre.ethers.formatEther(await hre.ethers.provider.getBalance(deployer.address)), "ETH\n");

    // Configuration - UPDATE THESE VALUES
    const FCWEED_TOKEN_ADDRESS = process.env.FCWEED_TOKEN_ADDRESS || "0x0000000000000000000000000000000000000000";
    const UNISWAP_ROUTER_ADDRESS = process.env.UNISWAP_ROUTER_ADDRESS || "0x0000000000000000000000000000000000000000";

    // Validate addresses
    if (FCWEED_TOKEN_ADDRESS === "0x0000000000000000000000000000000000000000") {
        throw new Error("❌ FCWEED_TOKEN_ADDRESS not set in .env file");
    }
    if (UNISWAP_ROUTER_ADDRESS === "0x0000000000000000000000000000000000000000") {
        throw new Error("❌ UNISWAP_ROUTER_ADDRESS not set in .env file");
    }

    console.log("Configuration:");
    console.log("- FCWEED Token:", FCWEED_TOKEN_ADDRESS);
    console.log("- Uniswap Router:", UNISWAP_ROUTER_ADDRESS);
    console.log("");

    // Deploy LaunchpadFactory
    console.log("📦 Deploying LaunchpadFactory...");
    const LaunchpadFactory = await hre.ethers.getContractFactory("LaunchpadFactory");
    const launchpad = await LaunchpadFactory.deploy(
        UNISWAP_ROUTER_ADDRESS,
        FCWEED_TOKEN_ADDRESS
    );

    await launchpad.waitForDeployment();
    const launchpadAddress = await launchpad.getAddress();

    console.log("✅ LaunchpadFactory deployed to:", launchpadAddress);
    console.log("");

    // Display deployment summary
    console.log("📋 Deployment Summary:");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("LaunchpadFactory:", launchpadAddress);
    console.log("FCWEED Token:", FCWEED_TOKEN_ADDRESS);
    console.log("Uniswap Router:", UNISWAP_ROUTER_ADDRESS);
    console.log("Platform Fee:", "1% (100 basis points)");
    console.log("Initial Price:", hre.ethers.formatEther(await launchpad.INITIAL_PRICE()), "ETH per token");
    console.log("Graduation Cap:", hre.ethers.formatEther(await launchpad.GRADUATION_MARKET_CAP()), "ETH");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("");

    // Wait for block confirmations before verification
    console.log("⏳ Waiting for block confirmations...");
    await launchpad.deploymentTransaction().wait(5);
    console.log("✅ Block confirmations complete");
    console.log("");

    // Verify on Etherscan (if not on local network)
    if (hre.network.name !== "hardhat" && hre.network.name !== "localhost") {
        console.log("🔍 Verifying contract on Etherscan...");
        try {
            await hre.run("verify:verify", {
                address: launchpadAddress,
                constructorArguments: [
                    UNISWAP_ROUTER_ADDRESS,
                    FCWEED_TOKEN_ADDRESS
                ],
            });
            console.log("✅ Contract verified on Etherscan");
        } catch (error) {
            console.log("⚠️  Verification failed:", error.message);
            console.log("You can verify manually later with:");
            console.log(`npx hardhat verify --network ${hre.network.name} ${launchpadAddress} ${UNISWAP_ROUTER_ADDRESS} ${FCWEED_TOKEN_ADDRESS}`);
        }
    }

    console.log("");
    console.log("🎉 Deployment Complete!");
    console.log("");
    console.log("Next Steps:");
    console.log("1. Update .env with LAUNCHPAD_FACTORY_ADDRESS=" + launchpadAddress);
    console.log("2. Test creating a launch with: npx hardhat run scripts/createLaunch.js --network", hre.network.name);
    console.log("3. Integrate with your frontend application");
    console.log("");

    // Save deployment info to file
    const fs = require("fs");
    const deploymentInfo = {
        network: hre.network.name,
        launchpadFactory: launchpadAddress,
        fcweedToken: FCWEED_TOKEN_ADDRESS,
        uniswapRouter: UNISWAP_ROUTER_ADDRESS,
        deployer: deployer.address,
        timestamp: new Date().toISOString(),
        blockNumber: await hre.ethers.provider.getBlockNumber()
    };

    fs.writeFileSync(
        `deployments/${hre.network.name}.json`,
        JSON.stringify(deploymentInfo, null, 2)
    );
    console.log("💾 Deployment info saved to deployments/" + hre.network.name + ".json");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
