const ethers = require("ethers");

async function main() {
    const errors = [
        "ERC20InsufficientAllowance(address,uint256,uint256)",
        "ERC20InsufficientBalance(address,uint256,uint256)",
        "TransferFailed()",
        "InsufficientAllowance()",
        "InsufficientBalance()",
        "SafeERC20FailedOperation(address)"
    ];

    console.log("Error Selectors:");
    for (const err of errors) {
        const selector = ethers.utils.id(err).slice(0, 10);
        console.log(`${selector} : ${err}`);
    }
}

main();
