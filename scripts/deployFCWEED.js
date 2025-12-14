const hre = require("hardhat");

async function main() {
    console.log("🌿 Deploying FCWEED Token to Sepolia...\n");

    const [deployer] = await hre.ethers.getSigners();
    console.log("Deploying with account:", deployer.address);
    const balance = await deployer.getBalance();
    console.log("Account balance:", hre.ethers.utils.formatEther(balance), "ETH\n");

    // Deploy FCWEED token
    console.log("📦 Deploying FCWEED...");
    const FCWEED = await hre.ethers.getContractFactory("FCWEED");
    const fcweed = await FCWEED.deploy();

    await fcweed.deployed();
    const fcweedAddress = fcweed.address;

    console.log("✅ FCWEED deployed to:", fcweedAddress);
    console.log("");

    // Display token info
    const totalSupply = await fcweed.totalSupply();
    const deployerBalance = await fcweed.balanceOf(deployer.address);

    console.log("📋 Token Information:");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("Name:", await fcweed.name());
    console.log("Symbol:", await fcweed.symbol());
    console.log("Decimals:", await fcweed.decimals());
    console.log("Total Supply:", hre.ethers.utils.formatEther(totalSupply), "FCWEED");
    console.log("Deployer Balance:", hre.ethers.utils.formatEther(deployerBalance), "FCWEED");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("");

    // Wait for confirmations
    console.log("⏳ Waiting for 5 block confirmations...");
    await fcweed.deployTransaction.wait(5);
    console.log("✅ Confirmed!");
    console.log("");

    console.log("🎉 FCWEED Deployment Complete!");
    console.log("");
    console.log("Next Steps:");
    console.log("1. Add to .env: FCWEED_TOKEN_ADDRESS=" + fcweedAddress);
    console.log("2. Deploy LaunchpadFactory: npx hardhat run scripts/deployLaunchpad.js --network sepolia");
    console.log("");
    console.log("View on Etherscan:");
    console.log("https://sepolia.etherscan.io/address/" + fcweedAddress);
    console.log("");

    // Save deployment info
    const fs = require("fs");
    const deploymentInfo = {
        network: "sepolia",
        fcweedToken: fcweedAddress,
        deployer: deployer.address,
        totalSupply: hre.ethers.utils.formatEther(totalSupply),
        timestamp: new Date().toISOString(),
        blockNumber: await hre.ethers.provider.getBlockNumber()
    };

    if (!fs.existsSync("deployments")) {
        fs.mkdirSync("deployments");
    }

    fs.writeFileSync(
        "deployments/fcweed-sepolia.json",
        JSON.stringify(deploymentInfo, null, 2)
    );
    console.log("💾 Deployment info saved to deployments/fcweed-sepolia.json");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
