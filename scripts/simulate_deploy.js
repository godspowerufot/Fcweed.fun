const hre = require("hardhat");

async function main() {
    console.log("🚀 Simulating Deployment on Base...\n");

    const [deployer] = await hre.ethers.getSigners();
    console.log("Deploying with account:", deployer.address);

    // Dummy addresses for simulation
    const FCWEED_TOKEN_ADDRESS = "0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb"; // DAI on Base (example)
    const UNISWAP_ROUTER_ADDRESS = "0x4752ba5DBc23f44D87826276BF6Fd6b1C372aD24"; // Uniswap V2 Router on Base (example)

    console.log("Using dummy addresses:");
    console.log("- FCWEED Token:", FCWEED_TOKEN_ADDRESS);
    console.log("- Uniswap Router:", UNISWAP_ROUTER_ADDRESS);

    // Deploy LaunchpadFactory
    const LaunchpadFactory = await hre.ethers.getContractFactory("LaunchpadFactory");

    // Estimate gas
    const deploymentData = LaunchpadFactory.getDeployTransaction(
        UNISWAP_ROUTER_ADDRESS,
        deployer.address,
        FCWEED_TOKEN_ADDRESS
    );

    const estimatedGas = await hre.ethers.provider.estimateGas(deploymentData);
    const feeData = await hre.ethers.provider.getFeeData();

    // Use maxFeePerGas if available (EIP-1559), otherwise gasPrice
    const gasPrice = feeData.maxFeePerGas || feeData.gasPrice;

    console.log("\n📊 Estimation Results:");
    console.log("Estimated Gas Units:", estimatedGas.toString());

    // Handle Ethers v5 vs v6 compatibility
    const formatUnits = hre.ethers.utils ? hre.ethers.utils.formatUnits : hre.ethers.formatUnits;
    const formatEther = hre.ethers.utils ? hre.ethers.utils.formatEther : hre.ethers.formatEther;

    console.log("Current Gas Price:", formatUnits(gasPrice, "gwei"), "gwei");

    // Calculate cost
    let estimatedCost;
    if (estimatedGas.mul) {
        // Ethers v5 BigNumber
        estimatedCost = estimatedGas.mul(gasPrice);
    } else {
        // Ethers v6 BigInt
        estimatedCost = estimatedGas * gasPrice;
    }

    console.log("Estimated Cost (ETH):", formatEther(estimatedCost));

    // Calculate USD cost (approximate)
    const ethPrice = 3900; // Approximate ETH price
    const costUSD = parseFloat(formatEther(estimatedCost)) * ethPrice;
    console.log("Estimated Cost (USD):", "$" + costUSD.toFixed(2));
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
