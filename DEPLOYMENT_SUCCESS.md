# Sepolia Deployment - SUCCESS! 🎉

## Deployment Summary

All contracts successfully deployed and tested on Sepolia testnet!

### Deployed Contracts

| Contract | Address | Etherscan |
|----------|---------|-----------|
| **FCWEED Token** | `0x96a986C5996068fb77486076Af7A8A884bc6E214` | [View](https://sepolia.etherscan.io/address/0x96a986C5996068fb77486076Af7A8A884bc6E214) |
| **LaunchpadFactory** | `0x7ACB9b5384b888d05c283775a4D60B2e7Fdc2b7D` | [View](https://sepolia.etherscan.io/address/0x7ACB9b5384b888d05c283775a4D60B2e7Fdc2b7D) |
| **Test Meme Token** | `0x793bfB0b10c531Ea1681519388b5B2A8297286bc` | [View](https://sepolia.etherscan.io/address/0x793bfB0b10c531Ea1681519388b5B2A8297286bc) |

### Test Results

✅ **FCWEED Token**
- Total Supply: 1,000,000,000 FCWEED
- Successfully deployed and verified

✅ **LaunchpadFactory**
- Platform Fee: 1%
- Initial Price: 0.00001 ETH per token
- Graduation Cap: 69 ETH
- Uniswap Router: Sepolia V2 Router

✅ **Test Launch**
- Created "TestMeme" (TMEME) token
- Successfully bought tokens with 0.1 ETH
- Launch is active and functioning
- Total raised: 0.1 ETH / 69 ETH needed for graduation

### Transaction Links

- **FCWEED Deployment**: [View on Etherscan](https://sepolia.etherscan.io/address/0x96a986C5996068fb77486076Af7A8A884bc6E214)
- **Launchpad Deployment**: [View on Etherscan](https://sepolia.etherscan.io/address/0x7ACB9b5384b888d05c283775a4D60B2e7Fdc2b7D)
- **Create Launch Tx**: [0x05b385...](https://sepolia.etherscan.io/tx/0x05b385278ff2a53249a2522906d1f46b393b83064bb9513ae6f7d6cab6addf07)
- **Buy Tokens Tx**: [0x0c563d...](https://sepolia.etherscan.io/tx/0x0c563da45e433f540c21df55e07c1e108eb73401a1b9311d92d7a8dd98035fa4)

## How to Use

### Create a New Launch

```bash
npx hardhat console --network sepolia
```

Then in console:
```javascript
const launchpad = await ethers.getContractAt("LaunchpadFactory", "0x7ACB9b5384b888d05c283775a4D60B2e7Fdc2b7D");
const tx = await launchpad.createLaunch("MyToken", "MTK");
await tx.wait();
```

### Buy Tokens

```javascript
const tokenAddress = "0x793bfB0b10c531Ea1681519388b5B2A8297286bc"; // Your token address
await launchpad.buyTokens(tokenAddress, { value: ethers.utils.parseEther("0.1") });
```

### Check Your Balance

```javascript
const token = await ethers.getContractAt("MemeToken", tokenAddress);
const balance = await token.balanceOf("YOUR_ADDRESS");
console.log("Balance:", ethers.utils.formatEther(balance));
```

## Next Steps

1. **Create More Launches**: Test with different token names and parameters
2. **Test Graduation**: Buy enough tokens to reach 69 ETH and trigger DEX migration
3. **Test Tax Mechanism**: Transfer tokens between addresses to see 3% tax in action
4. **Share with Others**: Let others test buying from your launches

## Important Notes

- This is on **Sepolia testnet** - use testnet ETH only
- Get testnet ETH from [Sepolia Faucet](https://sepoliafaucet.com/)
- All transactions are public on Sepolia Etherscan
- Graduation requires 69 ETH total raised (currently at 0.1 ETH)

## Deployment Files

All deployment information saved to:
- `deployments/fcweed-sepolia.json`
- `deployments/launchpad-sepolia.json`

## Configuration

Your `.env` file now contains:
```
FCWEED_TOKEN_ADDRESS=0x96a986C5996068fb77486076Af7A8A884bc6E214
LAUNCHPAD_FACTORY_ADDRESS=0x7ACB9b5384b888d05c283775a4D60B2e7Fdc2b7D
```

---

**🎊 Congratulations!** Your Pump.fun-style launchpad is live on Sepolia testnet!
