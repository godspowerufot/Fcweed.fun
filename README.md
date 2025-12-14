# Pump.fun-style Launchpad 🚀

A complete smart contract system for launching meme tokens with a two-phase bonding curve mechanism, automatic liquidity migration to Uniswap V2, and tax-based FCWEED rewards.

## Features

### Two-Phase Launch Mechanism

**Phase 1 - Bonding Curve**
- Initial token purchases at bonding curve pricing
- Linear price increase with each buy
- No selling allowed during this phase
- Collects ETH for liquidity

**Phase 2 - DEX Trading**
- Automatically triggered at 69 ETH market cap
- Migrates all liquidity to Uniswap V2
- Burns LP tokens (permanent liquidity lock)
- Enables normal trading with 3% tax

### Tax System
- 3% tax on all transfers (configurable, max 10%)
- Tax collected and distributed as FCWEED rewards
- Configurable tax exemptions
- Owner-controlled tax parameters

### Security
- ReentrancyGuard on all payable functions
- Ownable access controls
- Checks-Effects-Interactions pattern
- Comprehensive test coverage

## Architecture

```
contracts/
├── MemeToken.sol              # ERC20 with 3% tax mechanism
├── LaunchpadFactory.sol       # Two-phase launch platform
├── interfaces/
│   ├── IERC20.sol
│   ├── IUniswapV2Router02.sol
│   ├── IUniswapV2Factory.sol
│   └── IUniswapV2Pair.sol
└── mocks/
    └── MockUniswapV2Router.sol # Testing mocks
```

## Installation

```bash
# Clone repository
git clone <repository-url>
cd pump-launchpad

# Install dependencies
npm install

# Copy environment template
cp .env.example .env

# Edit .env with your configuration
```

## Configuration

Update `.env` with required values:

```bash
# Deployment wallet
PRIVATE_KEY=your_private_key_here

# Network RPC URLs
SEPOLIA_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR_API_KEY
MAINNET_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/YOUR_API_KEY

# Contract addresses (network-specific)
FCWEED_TOKEN_ADDRESS=0x...
UNISWAP_ROUTER_ADDRESS=0x...

# API keys for verification
ETHERSCAN_API_KEY=your_etherscan_api_key
```

### Network-Specific Addresses

**Ethereum Mainnet**
- Uniswap V2 Router: `0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D`

**Sepolia Testnet**
- Uniswap V2 Router: `0xC532a74256D3Db42D0Bf7a0400fEFDbad7694008`

**BSC Mainnet**
- PancakeSwap Router: `0x10ED43C718714eb63d5aA57B78B54704E256024E`

## Testing

```bash
# Run all tests
npx hardhat test

# Run specific test file
npx hardhat test test/MemeToken.test.js
npx hardhat test test/LaunchpadFactory.test.js
npx hardhat test test/Integration.test.js

# Run with gas reporting
REPORT_GAS=true npx hardhat test

# Run with coverage
npx hardhat coverage
```

## Deployment

```bash
# Deploy to local network
npx hardhat run scripts/deploy.js --network localhost

# Deploy to Sepolia testnet
npx hardhat run scripts/deploy.js --network sepolia

# Deploy to mainnet
npx hardhat run scripts/deploy.js --network mainnet
```

After deployment, the contract will be automatically verified on Etherscan (if API key is configured).

## Usage

### Creating a Launch

```javascript
const launchpad = await ethers.getContractAt("LaunchpadFactory", LAUNCHPAD_ADDRESS);

// Create new token launch
const tx = await launchpad.createLaunch("MyMeme", "MEME");
const receipt = await tx.wait();

// Get token address from event
const event = receipt.logs.find(log => log.fragment.name === "LaunchCreated");
const tokenAddress = event.args[0];
```

### Buying Tokens (Phase 1)

```javascript
// Buy tokens during bonding curve phase
await launchpad.buyTokens(tokenAddress, { value: ethers.parseEther("1") });

// Check current price
const currentPrice = await launchpad.getCurrentPrice(tokenAddress);

// Calculate purchase
const [tokenAmount, cost, newPrice] = await launchpad.calculatePurchase(
  tokenAddress,
  ethers.parseEther("1")
);
```

### After Graduation (Phase 2)

```javascript
// Get token contract
const token = await ethers.getContractAt("MemeToken", tokenAddress);

// Check if graduated
const launch = await launchpad.getLaunch(tokenAddress);
console.log("Graduated:", launch.graduated);

// Normal ERC20 transfers (with 3% tax)
await token.transfer(recipientAddress, amount);
```

## Contract Parameters

### LaunchpadFactory

| Parameter | Value | Description |
|-----------|-------|-------------|
| INITIAL_PRICE | 0.00001 ETH | Starting price per token |
| PRICE_INCREMENT | 0.000001 ETH | Price increase per purchase |
| GRADUATION_MARKET_CAP | 69 ETH | Market cap to graduate to DEX |
| TOKENS_FOR_SALE | 800M | Tokens available in bonding curve |
| TOTAL_SUPPLY | 1B | Total token supply |
| Platform Fee | 1% | Fee collected on graduation |

### MemeToken

| Parameter | Value | Description |
|-----------|-------|-------------|
| Tax Percentage | 3% (300 bp) | Default tax on transfers |
| Max Tax | 10% (1000 bp) | Maximum allowed tax |
| FCWEED Rewards | Configurable | Reward token for tax distribution |

## Security Considerations

### Auditing
- ⚠️ **This code has not been audited**
- Recommended to get professional audit before mainnet deployment
- Use at your own risk

### Best Practices
- Always test thoroughly on testnet first
- Verify contract source code on Etherscan
- Monitor for unusual activity after deployment
- Keep private keys secure

### Known Limitations
- Bonding curve uses simplified linear pricing
- No slippage protection for buyers (refunds excess)
- LP tokens burned to dead address (not true burn)

## Gas Optimization

Approximate gas costs (may vary by network):

| Operation | Gas Cost |
|-----------|----------|
| Create Launch | ~3,000,000 |
| Buy Tokens | ~150,000 |
| Graduation | ~500,000 |
| Token Transfer | ~65,000 |

## Troubleshooting

### Common Issues

**"Invalid FCWEED token address"**
- Ensure FCWEED_TOKEN_ADDRESS is set in .env
- Verify the address is a valid ERC20 contract

**"Insufficient ETH for purchase"**
- Price increases with each buy
- Check current price with `getCurrentPrice()`

**"Already graduated to DEX"**
- Launch has completed bonding curve phase
- Buy from DEX instead (Uniswap)

**"Launch not active"**
- Token address may be incorrect
- Launch may have been graduated

## Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch
3. Add tests for new functionality
4. Ensure all tests pass
5. Submit a pull request

## License

MIT License - see LICENSE file for details

## Support

For issues and questions:
- Open an issue on GitHub
- Check existing documentation in `/docs`
- Review test files for usage examples

## Acknowledgments

- Inspired by Pump.fun's bonding curve mechanism
- Built with Hardhat and OpenZeppelin
- Uniswap V2 integration for DEX functionality

---

**⚠️ Disclaimer**: This software is provided "as is" without warranty. Use at your own risk. Always conduct thorough testing and security audits before deploying to mainnet.
