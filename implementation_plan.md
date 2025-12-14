# Pump.fun-style Launchpad Implementation Plan

A complete smart contract system for launching meme tokens with a two-phase bonding curve mechanism, automatic liquidity migration, and tax-based rewards.

## User Review Required

> [!IMPORTANT]
> **Two-Phase Launch Mechanism**
> - **Phase 1 (Bonding Curve)**: Initial buys happen at a bonding curve price until market cap reaches a threshold (e.g., 69,000 FCWEED)
> - **Phase 2 (DEX Trading)**: Liquidity automatically migrates to Uniswap V2, LP tokens are burned, and normal trading begins
> - This mimics Pump.fun's graduation mechanism

> [!IMPORTANT]
> **Tax Distribution**
> - 3% tax on all buys and sells (both phases)
> - Tax is paid in FCWEED tokens to holders
> - Tax collection mechanism needs FCWEED token address

> [!WARNING]
> **Configuration Needed**
> Please provide:
> 1. FCWEED token contract address
> 2. Uniswap V2 Router address (or compatible DEX)
> 3. Bonding curve parameters (initial price, graduation market cap)
> 4. Desired network for deployment (Ethereum, BSC, etc.)

## Proposed Changes

### Smart Contracts Core

#### [NEW] [IERC20.sol](file:///Users/apple/.gemini/antigravity/scratch/pump-launchpad/contracts/interfaces/IERC20.sol)
Standard ERC20 interface for token interactions.

#### [NEW] [IUniswapV2Router02.sol](file:///Users/apple/.gemini/antigravity/scratch/pump-launchpad/contracts/interfaces/IUniswapV2Router02.sol)
Uniswap V2 Router interface for liquidity operations.

#### [NEW] [IUniswapV2Factory.sol](file:///Users/apple/.gemini/antigravity/scratch/pump-launchpad/contracts/interfaces/IUniswapV2Factory.sol)
Uniswap V2 Factory interface for pair creation.

#### [NEW] [IUniswapV2Pair.sol](file:///Users/apple/.gemini/antigravity/scratch/pump-launchpad/contracts/interfaces/IUniswapV2Pair.sol)
Uniswap V2 Pair interface for LP token operations.

---

#### [NEW] [MemeToken.sol](file:///Users/apple/.gemini/antigravity/scratch/pump-launchpad/contracts/MemeToken.sol)

**Purpose**: ERC20 token with 3% buy/sell tax mechanism

**Key Features**:
- Standard ERC20 implementation with tax logic
- 3% tax on transfers (configurable exemptions)
- Tax collected in FCWEED and distributed to holders
- Launchpad-controlled tax exemptions for bonding curve phase
- Owner can update tax parameters and FCWEED reward token

**Security**:
- ReentrancyGuard on tax distribution
- Ownable for access control
- Tax exemption for launchpad contract during phase 1

---

#### [NEW] [LaunchpadFactory.sol](file:///Users/apple/.gemini/antigravity/scratch/pump-launchpad/contracts/LaunchpadFactory.sol)

**Purpose**: Two-phase launch mechanism with bonding curve and DEX migration

**Key Features**:

**Phase 1 - Bonding Curve**:
- Users buy tokens at calculated bonding curve price
- Price increases with each purchase (linear or exponential curve)
- All ETH/native tokens collected in contract
- Tracks total market cap
- No selling allowed in this phase

**Phase 2 - DEX Trading**:
- Triggered when market cap reaches graduation threshold (e.g., 69,000 FCWEED equivalent)
- Automatically creates Uniswap V2 pair
- Adds all collected liquidity to DEX
- Burns LP tokens (permanent liquidity lock)
- Enables normal trading with 3% tax

**Additional Features**:
- Factory pattern: can deploy multiple meme tokens
- Emergency pause mechanism
- Fee collection for platform (optional)
- Events for all major actions

**Security**:
- ReentrancyGuard on all payable functions
- Checks-Effects-Interactions pattern
- Access controls for admin functions
- Slippage protection on liquidity addition

---

### Testing Infrastructure

#### [NEW] [MemeToken.test.js](file:///Users/apple/.gemini/antigravity/scratch/pump-launchpad/test/MemeToken.test.js)

**Test Coverage**:
- Token deployment and initialization
- Tax calculation and collection
- Tax exemption management
- FCWEED reward distribution
- Edge cases (zero transfers, max supply, etc.)

---

#### [NEW] [LaunchpadFactory.test.js](file:///Users/apple/.gemini/antigravity/scratch/pump-launchpad/test/LaunchpadFactory.test.js)

**Test Coverage**:
- Token launch creation
- Phase 1: Bonding curve purchases
- Price calculation accuracy
- Market cap tracking
- Phase 2: Automatic graduation to DEX
- Liquidity addition and LP burn
- Tax collection in both phases
- Security: reentrancy, access control
- Edge cases: minimum buys, maximum supply, etc.

---

#### [NEW] [Integration.test.js](file:///Users/apple/.gemini/antigravity/scratch/pump-launchpad/test/Integration.test.js)

**Full Flow Testing**:
- End-to-end launch scenario
- Multiple users buying in phase 1
- Graduation trigger and DEX migration
- Post-migration trading with taxes
- Tax distribution to holders

---

### Documentation

#### [NEW] [README.md](file:///Users/apple/.gemini/antigravity/scratch/pump-launchpad/README.md)

**Contents**:
- Project overview and features
- Architecture diagram
- Contract addresses and ABIs
- Deployment instructions
- Usage examples
- Security considerations

---

#### [NEW] [DESIGN.md](file:///Users/apple/.gemini/antigravity/scratch/pump-launchpad/DESIGN.md)

**Contents**:
- High-level architecture
- Two-phase launch mechanism explained
- Bonding curve mathematics
- Tax mechanism flow
- Security design decisions
- Upgrade path considerations

---

### Configuration & Deployment

#### [NEW] [hardhat.config.js](file:///Users/apple/.gemini/antigravity/scratch/pump-launchpad/hardhat.config.js)
Hardhat configuration for testing and deployment.

#### [NEW] [deploy.js](file:///Users/apple/.gemini/antigravity/scratch/pump-launchpad/scripts/deploy.js)
Deployment script with verification steps.

#### [NEW] [.env.example](file:///Users/apple/.gemini/antigravity/scratch/pump-launchpad/.env.example)
Environment variables template.

## Verification Plan

### Automated Tests
```bash
# Install dependencies
npm install

# Run all tests with coverage
npx hardhat test
npx hardhat coverage

# Run specific test suites
npx hardhat test test/MemeToken.test.js
npx hardhat test test/LaunchpadFactory.test.js
npx hardhat test test/Integration.test.js
```

### Security Checks
```bash
# Run Slither static analysis
slither contracts/

# Run Mythril security scanner
myth analyze contracts/LaunchpadFactory.sol
myth analyze contracts/MemeToken.sol
```

### Manual Verification
- Deploy to testnet (Sepolia/Goerli)
- Test full launch flow with real transactions
- Verify Uniswap integration
- Confirm tax distribution works correctly
- Test edge cases and failure scenarios

### Code Review Checklist
- [ ] All functions have proper access controls
- [ ] ReentrancyGuard on all payable/external state-changing functions
- [ ] No unchecked external calls
- [ ] Proper event emission for all state changes
- [ ] Gas optimization review
- [ ] Documentation completeness
