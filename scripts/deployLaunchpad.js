const hre = require("hardhat");
const fs = require("fs");

async function main() {
    console.log("🚀 Deploying LaunchpadFactory to Sepolia...\n");

    const [deployer] = await hre.ethers.getSigners();
    console.log("Deploying with account:", deployer.address);
    const balance = await deployer.getBalance();
    console.log("Account balance:", hre.ethers.utils.formatEther(balance), "ETH\n");

    // Configuration
    const UNISWAP_ROUTER_ADDRESS = "0xC532a74256D3Db42D0Bf7a0400fEFDbad7694008"; // Sepolia Uniswap V2 Router
    const FEE_RECIPIENT = deployer.address;

    // FCWEED Token Address (from previous deployment or env)
    // If not set, we should probably deploy a mock or ask user. 
    // Assuming user has FCWEED deployed.
    const FCWEED_TOKEN_ADDRESS = process.env.FCWEED_TOKEN_ADDRESS || "0x96a986C5996068fb77486076Af7A8A884bc6E214";

    if (!FCWEED_TOKEN_ADDRESS) {
        throw new Error("❌ FCWEED_TOKEN_ADDRESS not set in .env or script");
    }

    console.log("Configuration:");
    console.log("- Uniswap Router:", UNISWAP_ROUTER_ADDRESS);
    console.log("- Fee Recipient:", FEE_RECIPIENT);
    console.log("- Base Asset (FCWEED):", FCWEED_TOKEN_ADDRESS);
    console.log("");

    // Deploy LaunchpadFactory
    console.log("📦 Deploying LaunchpadFactory...");
    const LaunchpadFactory = await hre.ethers.getContractFactory("LaunchpadFactory");
    const launchpad = await LaunchpadFactory.deploy(
        UNISWAP_ROUTER_ADDRESS,
        FEE_RECIPIENT,
        FCWEED_TOKEN_ADDRESS
    );

    await launchpad.deployed();
    const launchpadAddress = launchpad.address;

    console.log("✅ LaunchpadFactory deployed to:", launchpadAddress);
    console.log("");

    // Display deployment summary
    console.log("📋 Deployment Summary:");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("LaunchpadFactory:", launchpadAddress);
    console.log("Base Asset (FCWEED):", FCWEED_TOKEN_ADDRESS);
    console.log("Tax Rate:", "3% (300 basis points)");
    console.log("Graduation Cap:", hre.ethers.utils.formatEther(await launchpad.GRADUATION_THRESHOLD()), "FCWEED");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("");

    // Wait for confirmations
    console.log("⏳ Waiting for 5 block confirmations...");
    await launchpad.deployTransaction.wait(5);
    console.log("✅ Confirmed!");
    console.log("");

    console.log("🎉 Deployment Complete!");
    console.log("");
    console.log("Next Steps:");
    console.log("1. Add to .env: LAUNCHPAD_FACTORY_ADDRESS=" + launchpadAddress);
    console.log("");
    console.log("View on Etherscan:");
    console.log("https://sepolia.etherscan.io/address/" + launchpadAddress);
    console.log("");

    // Save deployment info
    const deploymentInfo = {
        network: "sepolia",
        launchpadFactory: launchpadAddress,
        fcweedToken: FCWEED_TOKEN_ADDRESS,
        uniswapRouter: UNISWAP_ROUTER_ADDRESS,
        deployer: deployer.address,
        timestamp: new Date().toISOString(),
        blockNumber: await hre.ethers.provider.getBlockNumber()
    };

    if (!fs.existsSync("deployments")) {
        fs.mkdirSync("deployments");
    }

    fs.writeFileSync(
        "deployments/launchpad-sepolia.json",
        JSON.stringify(deploymentInfo, null, 2)
    );
    console.log("💾 Deployment info saved to deployments/launchpad-sepolia.json");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
