# Sepolia Deployment Guide

## Quick Start - Deploy FCWEED and Test Launchpad

Follow these steps to deploy and test the launchpad on Sepolia testnet.

### Prerequisites

1. **Sepolia ETH**: Get testnet ETH from [Sepolia Faucet](https://sepoliafaucet.com/)
2. **Private Key**: Your wallet private key (keep it safe!)
3. **Etherscan API Key**: Get from [Etherscan](https://etherscan.io/myapikey)

---

## Step 1: Fix Dependencies

The project has Hardhat version conflicts. Run these commands to fix:

```bash
cd /Users/apple/.gemini/antigravity/scratch/pump-launchpad

# Remove conflicting packages
rm -rf node_modules package-lock.json

# Install compatible versions
npm install --save-dev \
  hardhat@^2.19.0 \
  @nomicfoundation/hardhat-toolbox@^3.0.0 \
  @nomicfoundation/hardhat-ethers@^3.0.0 \
  @openzeppelin/contracts@^5.0.0 \
  dotenv@^16.0.0 \
  --legacy-peer-deps

# Verify installation
npx hardhat --version
```

---

## Step 2: Configure Environment

Create `.env` file with your credentials:

```bash
# Copy template
cp .env.example .env

# Edit .env file
nano .env
```

Add these values to `.env`:

```bash
# Your wallet private key (WITHOUT 0x prefix)
PRIVATE_KEY=your_private_key_here

# Sepolia RPC (get from Alchemy or Infura)
SEPOLIA_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR_API_KEY

# Etherscan API key for verification
ETHERSCAN_API_KEY=your_etherscan_api_key_here
```

---

## Step 3: Compile Contracts

```bash
npx hardhat compile
```

Expected output:
```
Compiled 10 Solidity files successfully
```

---

## Step 4: Deploy FCWEED Token

```bash
npx hardhat run scripts/deployFCWEED.js --network sepolia
```

Expected output:
```
🌿 Deploying FCWEED Token to Sepolia...

Deploying with account: 0x...
Account balance: X.XX ETH

📦 Deploying FCWEED...
✅ FCWEED deployed to: 0x...

📋 Token Information:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Name: FCWEED
Symbol: FCWEED
Decimals: 18
Total Supply: 1000000000.0 FCWEED
Deployer Balance: 1000000000.0 FCWEED
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

**IMPORTANT**: Copy the FCWEED contract address!

---

## Step 5: Update .env with FCWEED Address

Add to your `.env` file:

```bash
FCWEED_TOKEN_ADDRESS=0x... # paste the address from step 4
```

---

## Step 6: Deploy LaunchpadFactory

```bash
npx hardhat run scripts/deployLaunchpad.js --network sepolia
```

Expected output:
```
🚀 Deploying LaunchpadFactory to Sepolia...

Configuration:
- FCWEED Token: 0x...
- Uniswap Router: 0xC532a74256D3Db42D0Bf7a0400fEFDbad7694008

✅ LaunchpadFactory deployed to: 0x...

📋 Deployment Summary:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
LaunchpadFactory: 0x...
FCWEED Token: 0x...
Uniswap Router: 0xC532a74256D3Db42D0Bf7a0400fEFDbad7694008
Platform Fee: 1% (100 basis points)
Initial Price: 0.00001 ETH per token
Graduation Cap: 69.0 ETH
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

**IMPORTANT**: Copy the LaunchpadFactory address!

---

## Step 7: Update .env with Launchpad Address

Add to your `.env` file:

```bash
LAUNCHPAD_FACTORY_ADDRESS=0x... # paste the address from step 6
```

---

## Step 8: Test the Launchpad

```bash
npx hardhat run scripts/testLaunch.js --network sepolia
```

This script will:
1. ✅ Create a new token launch ("TestMeme" / "TMEME")
2. ✅ Buy tokens with 0.1 ETH
3. ✅ Display your token balance
4. ✅ Show launch progress

Expected output:
```
🧪 Testing Launchpad on Sepolia...

📝 Step 1: Creating a new token launch...
✅ Transaction confirmed!
🎉 New token created at: 0x...

📋 Step 2: Getting token details...
Token Name: TestMeme
Token Symbol: TMEME
Total Supply: 1000000000.0 tokens

💰 Step 4: Buying tokens (0.1 ETH)...
Expected to receive: ~10000.0 tokens
✅ Purchase confirmed!

💼 Step 5: Checking balances...
Your token balance: 9700.0 TMEME (after 3% tax)
Total raised so far: 0.1 ETH

🎊 Test Complete!
```

---

## Step 9: View on Etherscan

Check your transactions and contracts:

1. **FCWEED Token**: `https://sepolia.etherscan.io/address/YOUR_FCWEED_ADDRESS`
2. **LaunchpadFactory**: `https://sepolia.etherscan.io/address/YOUR_LAUNCHPAD_ADDRESS`
3. **Your Meme Token**: `https://sepolia.etherscan.io/address/YOUR_TOKEN_ADDRESS`

---

## Troubleshooting

### "Insufficient funds"
- Get more Sepolia ETH from faucet
- Check balance: `npx hardhat run scripts/checkBalance.js --network sepolia`

### "Invalid FCWEED token address"
- Make sure FCWEED_TOKEN_ADDRESS is set in .env
- Verify the address is correct

### "Transaction failed"
- Check gas price is not too low
- Verify you have enough Sepolia ETH
- Check Sepolia network status

### "Compilation failed"
- Run: `rm -rf cache artifacts && npx hardhat compile`
- Verify all dependencies installed correctly

---

## Manual Testing Commands

### Check Your Balance
```bash
npx hardhat console --network sepolia
```

Then in console:
```javascript
const [signer] = await ethers.getSigners();
console.log("Address:", signer.address);
console.log("Balance:", ethers.formatEther(await ethers.provider.getBalance(signer.address)), "ETH");
```

### Interact with FCWEED
```javascript
const fcweed = await ethers.getContractAt("FCWEED", "YOUR_FCWEED_ADDRESS");
console.log("FCWEED Balance:", ethers.formatEther(await fcweed.balanceOf(signer.address)));
```

### Interact with Launchpad
```javascript
const launchpad = await ethers.getContractAt("LaunchpadFactory", "YOUR_LAUNCHPAD_ADDRESS");
const launches = await launchpad.getAllLaunches();
console.log("Total launches:", launches.length);
```

---

## Next Steps

After successful testing:

1. **Create More Launches**: Modify `testLaunch.js` to create different tokens
2. **Test Graduation**: Buy enough tokens to reach 69 ETH market cap
3. **Test Tax Distribution**: Transfer tokens between addresses to see 3% tax
4. **Mainnet Deployment**: When ready, deploy to mainnet (after audit!)

---

## Important Notes

> [!WARNING]
> **Testnet Only**
> - This is for testing on Sepolia testnet only
> - Do NOT deploy to mainnet without professional security audit
> - Testnet ETH has no real value

> [!CAUTION]
> **Private Key Security**
> - Never commit .env file to git
> - Never share your private key
> - Use a separate wallet for testing

---

## Deployment Info

All deployment information is saved to:
- `deployments/fcweed-sepolia.json`
- `deployments/launchpad-sepolia.json`

These files contain:
- Contract addresses
- Deployer address
- Block numbers
- Timestamps

Keep these files for reference!
