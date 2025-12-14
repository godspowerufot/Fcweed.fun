const hre = require("hardhat");

async function main() {
    console.log("🧪 Testing Launchpad on Sepolia...\n");

    const [deployer] = await hre.ethers.getSigners();
    console.log("Testing with account:", deployer.address);
    const balance = await deployer.getBalance();
    console.log("Account balance:", hre.ethers.utils.formatEther(balance), "ETH\n");

    // Load deployment addresses
    const LAUNCHPAD_ADDRESS = process.env.LAUNCHPAD_FACTORY_ADDRESS || "";

    if (!LAUNCHPAD_ADDRESS) {
        throw new Error("❌ LAUNCHPAD_FACTORY_ADDRESS not set in .env file");
    }

    console.log("Launchpad Address:", LAUNCHPAD_ADDRESS);
    console.log("");

    // Get contract instance
    const launchpad = await hre.ethers.getContractAt("LaunchpadFactory", LAUNCHPAD_ADDRESS);

    // Step 1: Create a new launch
    console.log("📝 Step 1: Creating a new token launch...");
    const createTx = await launchpad.createLaunch("TestMeme", "TMEME");
    console.log("Transaction sent:", createTx.hash);

    const createReceipt = await createTx.wait();
    console.log("✅ Transaction confirmed!");

    // Find the LaunchCreated event
    const launchCreatedEvent = createReceipt.events.find(e => e.event === "LaunchCreated");
    if (!launchCreatedEvent) {
        throw new Error("LaunchCreated event not found");
    }

    const tokenAddress = launchCreatedEvent.args[0];
    console.log("🎉 New token created at:", tokenAddress);
    console.log("");

    // Step 2: Get token details
    console.log("📋 Step 2: Getting token details...");
    const token = await hre.ethers.getContractAt("MemeToken", tokenAddress);

    console.log("Token Name:", await token.name());
    console.log("Token Symbol:", await token.symbol());
    console.log("Total Supply:", hre.ethers.utils.formatEther(await token.totalSupply()), "tokens");
    console.log("");

    // Step 3: Check launch info
    console.log("📊 Step 3: Checking launch info...");
    const launch = await launchpad.getLaunch(tokenAddress);

    console.log("Creator:", launch.creator);
    console.log("Total Raised:", hre.ethers.utils.formatEther(launch.totalRaised), "ETH");
    console.log("Tokens Sold:", hre.ethers.utils.formatEther(launch.tokensSold), "tokens");
    console.log("Active:", launch.active);
    console.log("Graduated:", launch.graduated);
    console.log("");

    // Step 4: Buy some tokens
    console.log("💰 Step 4: Buying tokens (0.1 ETH)...");
    const currentPrice = await launchpad.getCurrentPrice(tokenAddress);
    console.log("Current Price:", hre.ethers.utils.formatEther(currentPrice), "ETH per token");

    const buyAmount = hre.ethers.utils.parseEther("0.1");
    const [tokenAmount, cost, newPrice] = await launchpad.calculatePurchase(tokenAddress, buyAmount);

    console.log("Expected to receive:", hre.ethers.utils.formatEther(tokenAmount), "tokens");
    console.log("Actual cost:", hre.ethers.utils.formatEther(cost), "ETH");
    console.log("New price after:", hre.ethers.utils.formatEther(newPrice), "ETH per token");

    const buyTx = await launchpad.buyTokens(tokenAddress, { value: buyAmount });
    console.log("Buy transaction sent:", buyTx.hash);

    await buyTx.wait();
    console.log("✅ Purchase confirmed!");
    console.log("");

    // Step 5: Check balances
    console.log("💼 Step 5: Checking balances...");
    const tokenBalance = await token.balanceOf(deployer.address);
    console.log("Your token balance:", hre.ethers.utils.formatEther(tokenBalance), "TMEME");

    const updatedLaunch = await launchpad.getLaunch(tokenAddress);
    console.log("Total raised so far:", hre.ethers.utils.formatEther(updatedLaunch.totalRaised), "ETH");
    console.log("Tokens sold so far:", hre.ethers.utils.formatEther(updatedLaunch.tokensSold), "tokens");
    console.log("");

    console.log("🎊 Test Complete!");
    console.log("");
    console.log("Summary:");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("✅ Created launch");
    console.log("✅ Bought tokens");
    console.log("Token Address:", tokenAddress);
    console.log("Your Balance:", hre.ethers.utils.formatEther(tokenBalance), "TMEME");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("");
    console.log("View on Etherscan:");
    console.log("Token:", "https://sepolia.etherscan.io/address/" + tokenAddress);
    console.log("Your Tx:", "https://sepolia.etherscan.io/tx/" + buyTx.hash);
    console.log("");
    console.log("To graduate to DEX, raise", hre.ethers.utils.formatEther(await launchpad.GRADUATION_MARKET_CAP()), "ETH total");
    console.log("Currently raised:", hre.ethers.utils.formatEther(updatedLaunch.totalRaised), "ETH");
    console.log("Remaining:", hre.ethers.utils.formatEther((await launchpad.GRADUATION_MARKET_CAP()).sub(updatedLaunch.totalRaised)), "ETH");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
