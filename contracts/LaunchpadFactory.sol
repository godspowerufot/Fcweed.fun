// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./BondingCurveToken.sol";
import "./interfaces/IUniswapV2Router02.sol";
import "./interfaces/IUniswapV2Factory.sol";

/**
 * @title LaunchpadFactory
 * @dev Pump.fun-style launchpad with linear bonding curve, 3% tax, and automatic graduation.
 *      Uses FCWEED (ERC20) as the base asset.
 */
contract LaunchpadFactory is Ownable, ReentrancyGuard {
    // --- Constants ---
    uint256 public constant BASIS_POINTS = 10000;
    uint256 public constant TAX_RATE = 300; // 3%
    uint256 public constant GRADUATION_THRESHOLD = 9 ether; // 9 FCWEED target
    uint256 public constant TOTAL_SUPPLY = 1_000_000_000 * 10**18; // 1B tokens
    uint256 public constant BONDING_SUPPLY = 800_000_000 * 10**18; // 800M tokens for bonding
    
    // Linear Curve Constants
    // k_scaled = 281250, SCALE_FACTOR = 1e40
    uint256 public constant K_SCALED = 281250; 
    uint256 public constant SCALE_FACTOR = 1e40;

    // --- State Variables ---
    IUniswapV2Router02 public immutable uniswapRouter;
    IERC20 public immutable baseAsset; // FCWEED
    uint256 public creationFee = 0.01 ether; // 0.01 FCWEED
    address public feeRecipient;

    struct Launch {
        address creator;
        address token;
        uint256 tokensSold;
        uint256 baseAssetRaised;
        bool graduated;
        bool active;
        string imageURI;
        string twitter;
        string telegram;
        string website;
    }

    mapping(address => Launch) public launches; // token address -> Launch
    address[] public allLaunches;

    // --- Events ---
    event LaunchCreated(
        address indexed token, 
        address indexed creator, 
        string name, 
        string symbol, 
        string imageURI, 
        string twitter, 
        string telegram, 
        string website, 
        uint256 timestamp
    );
    event Buy(address indexed token, address indexed buyer, uint256 amountIn, uint256 amountOut, uint256 fee);
    event Sell(address indexed token, address indexed seller, uint256 amountIn, uint256 amountOut, uint256 fee);
    event Graduated(address indexed token, address indexed pair, uint256 liquidityBase, uint256 liquidityTokens);

    constructor(address _uniswapRouter, address _feeRecipient, address _baseAsset) Ownable(msg.sender) {
        uniswapRouter = IUniswapV2Router02(_uniswapRouter);
        baseAsset = IERC20(_baseAsset);
        feeRecipient = _feeRecipient;
    }

    // --- Core Logic ---

    function createLaunch(
        string memory name, 
        string memory symbol,
        string memory imageURI,
        string memory twitter,
        string memory telegram,
        string memory website,
        uint256 initialBuyAmount
    ) external nonReentrant returns (address) {
        // 1. Transfer Creation Fee
        require(baseAsset.transferFrom(msg.sender, feeRecipient, creationFee), "Fee transfer failed");

        // 2. Deploy Token
        BondingCurveToken token = new BondingCurveToken(name, symbol, address(this));
        address tokenAddress = address(token);

        // 3. Mint total supply to this contract
        token.mint(address(this), TOTAL_SUPPLY);

        // 4. Initialize Launch
        launches[tokenAddress] = Launch({
            creator: msg.sender,
            token: tokenAddress,
            tokensSold: 0,
            baseAssetRaised: 0,
            graduated: false,
            active: true,
            imageURI: imageURI,
            twitter: twitter,
            telegram: telegram,
            website: website
        });
        allLaunches.push(tokenAddress);

        emit LaunchCreated(tokenAddress, msg.sender, name, symbol, imageURI, twitter, telegram, website, block.timestamp);

        // 5. Optional Initial Buy
        if (initialBuyAmount > 0) {
            _buy(tokenAddress, msg.sender, initialBuyAmount, 0); // 0 minTokensOut for simplicity in atomic call
        }

        return tokenAddress;
    }

    function buy(address tokenAddress, uint256 amountIn, uint256 minTokensOut) external nonReentrant {
        _buy(tokenAddress, msg.sender, amountIn, minTokensOut);
    }

    function _buy(address tokenAddress, address buyer, uint256 amountIn, uint256 minTokensOut) internal {
        Launch storage launch = launches[tokenAddress];
        require(launch.active, "Launch not active");
        require(amountIn > 0, "Amount must be > 0");

        // Transfer Base Asset from Buyer
        require(baseAsset.transferFrom(buyer, address(this), amountIn), "Transfer failed");

        // 1. Calculate Tax
        uint256 fee = (amountIn * TAX_RATE) / BASIS_POINTS;
        uint256 netAmountIn = amountIn - fee;

        // 2. Calculate Tokens Out (Linear Curve Integration)
        uint256 sOld = launch.tokensSold;
        uint256 term = (2 * netAmountIn * SCALE_FACTOR) / K_SCALED;
        uint256 sNewSquared = (sOld * sOld) + term;
        uint256 sNew = sqrt(sNewSquared);
        uint256 tokensOut = sNew - sOld;

        require(tokensOut >= minTokensOut, "Slippage exceeded");
        require(launch.tokensSold + tokensOut <= BONDING_SUPPLY, "Exceeds max supply");

        // 3. Update State
        launch.tokensSold += tokensOut;
        launch.baseAssetRaised += netAmountIn;

        // 4. Distribute Fee (50% creator, 50% protocol)
        uint256 creatorFee = fee / 2;
        uint256 protocolFee = fee - creatorFee;
        
        require(baseAsset.transfer(launch.creator, creatorFee), "Creator fee failed");
        require(baseAsset.transfer(feeRecipient, protocolFee), "Protocol fee failed");

        // 5. Transfer Tokens
        BondingCurveToken(tokenAddress).transfer(buyer, tokensOut);

        emit Buy(tokenAddress, buyer, amountIn, tokensOut, fee);

        // 6. Check Graduation
        if (launch.baseAssetRaised >= GRADUATION_THRESHOLD) {
            _graduate(tokenAddress);
        }
    }

    function sell(address tokenAddress, uint256 amountIn, uint256 minBaseOut) external nonReentrant {
        Launch storage launch = launches[tokenAddress];
        require(launch.active, "Launch not active");
        require(amountIn > 0, "Amount must be > 0");
        
        BondingCurveToken token = BondingCurveToken(tokenAddress);
        require(token.balanceOf(msg.sender) >= amountIn, "Insufficient balance");

        // 1. Calculate Base Asset Out (Refund)
        uint256 sOld = launch.tokensSold;
        uint256 sNew = sOld - amountIn;
        
        uint256 refund = (K_SCALED * ((sOld * sOld) - (sNew * sNew))) / (2 * SCALE_FACTOR);
        
        // 2. Deduct Tax
        uint256 fee = (refund * TAX_RATE) / BASIS_POINTS;
        uint256 amountOut = refund - fee;

        require(amountOut >= minBaseOut, "Slippage exceeded");
        require(baseAsset.balanceOf(address(this)) >= amountOut + fee, "Insufficient contract balance");

        // 3. Update State
        launch.tokensSold -= amountIn;
        launch.baseAssetRaised -= refund;

        // 4. Transfer Tokens from Seller
        token.transferFrom(msg.sender, address(this), amountIn);

        // 5. Distribute Fee
        uint256 creatorFee = fee / 2;
        uint256 protocolFee = fee - creatorFee;
        
        require(baseAsset.transfer(launch.creator, creatorFee), "Creator fee failed");
        require(baseAsset.transfer(feeRecipient, protocolFee), "Protocol fee failed");

        // 6. Send Base Asset to Seller
        require(baseAsset.transfer(msg.sender, amountOut), "Base asset transfer failed");

        emit Sell(tokenAddress, msg.sender, amountIn, amountOut, fee);
    }

    function _graduate(address tokenAddress) internal {
        Launch storage launch = launches[tokenAddress];
        launch.graduated = true;
        launch.active = false;

        BondingCurveToken token = BondingCurveToken(tokenAddress);
        
        // 1. Mint remaining tokens (200M + unsold from curve)
        uint256 tokensToMint = TOTAL_SUPPLY - token.totalSupply();
        if (tokensToMint > 0) {
            token.mint(address(this), tokensToMint);
        }
        
        // 2. Liquidity Amount
        uint256 baseLiquidity = launch.baseAssetRaised;
        uint256 tokenLiquidity = token.balanceOf(address(this));

        // 3. Approve Uniswap
        token.approve(address(uniswapRouter), tokenLiquidity);
        baseAsset.approve(address(uniswapRouter), baseLiquidity);

        // 4. Add Liquidity
        uniswapRouter.addLiquidity(
            tokenAddress,
            address(baseAsset),
            tokenLiquidity,
            baseLiquidity,
            tokenLiquidity, // Min tokens
            baseLiquidity,  // Min base
            address(0),     // Burn LP tokens
            block.timestamp
        );

        // 5. Renounce Ownership
        token.renounceOwnership();

        emit Graduated(tokenAddress, address(0), baseLiquidity, tokenLiquidity);
    }

    // --- View Functions ---

    function getLaunch(address token) external view returns (Launch memory) {
        return launches[token];
    }

    function getAllLaunches() external view returns (address[] memory) {
        return allLaunches;
    }

    function getAmountOut(uint256 amountIn, bool isBuy, uint256 currentSupply) external pure returns (uint256) {
        if (isBuy) {
            // Buy: Input Base -> Output Tokens
            uint256 netIn = amountIn - (amountIn * 300 / 10000);
            uint256 term = (2 * netIn * SCALE_FACTOR) / K_SCALED;
            uint256 sNew = sqrt((currentSupply * currentSupply) + term);
            return sNew - currentSupply;
        } else {
            // Sell: Input Tokens -> Output Base
            uint256 sNew = currentSupply - amountIn;
            uint256 refund = (K_SCALED * ((currentSupply * currentSupply) - (sNew * sNew))) / (2 * SCALE_FACTOR);
            return refund - (refund * 300 / 10000);
        }
    }

    // --- Utils ---
    function sqrt(uint256 y) internal pure returns (uint256 z) {
        if (y > 3) {
            z = y;
            uint256 x = y / 2 + 1;
            while (x < z) {
                z = x;
                x = (y / x + x) / 2;
            }
        } else if (y != 0) {
            z = 1;
        }
    }
}
