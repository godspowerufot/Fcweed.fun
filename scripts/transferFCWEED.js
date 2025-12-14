const hre = require("hardhat");

async function main() {
    const FCWEED_ADDRESS = "0x96a986C5996068fb77486076Af7A8A884bc6E214";
    const RECIPIENT = "0x4d182E340D884Fe63268326eDA118bbf8382D332";
    const AMOUNT = "100000"; // 100,000 tokens

    const [deployer] = await hre.ethers.getSigners();
    console.log("Transferring from:", deployer.address);

    const fcweed = await hre.ethers.getContractAt("@openzeppelin/contracts/token/ERC20/IERC20.sol:IERC20", FCWEED_ADDRESS);

    // Check balance
    const balance = await fcweed.balanceOf(deployer.address);
    console.log("Current Balance:", hre.ethers.utils.formatEther(balance));

    const amountWei = hre.ethers.utils.parseEther(AMOUNT);

    console.log(`Transferring ${AMOUNT} FCWEED to ${RECIPIENT}...`);
    const tx = await fcweed.transfer(RECIPIENT, amountWei);
    await tx.wait();

    console.log("✅ Transfer successful!");
    console.log("Tx Hash:", tx.hash);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
