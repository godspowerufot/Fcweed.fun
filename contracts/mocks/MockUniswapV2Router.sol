// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../interfaces/IUniswapV2Router02.sol";
import "../interfaces/IUniswapV2Factory.sol";
import "../interfaces/IUniswapV2Pair.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title MockUniswapV2Router
 * @dev Simplified mock for testing purposes
 */
contract MockUniswapV2Router is IUniswapV2Router02 {
    address public immutable WETH;
    address public immutable factory;

    constructor() {
        // Deploy mock factory and WETH
        MockUniswapV2Factory mockFactory = new MockUniswapV2Factory();
        factory = address(mockFactory);
        
        MockWETH mockWETH = new MockWETH();
        WETH = address(mockWETH);
    }

    function addLiquidityETH(
        address token,
        uint amountTokenDesired,
        uint amountTokenMin,
        uint amountETHMin,
        address to,
        uint deadline
    ) external payable override returns (uint amountToken, uint amountETH, uint liquidity) {
        require(deadline >= block.timestamp, "Expired");
        
        // Transfer tokens from sender
        IERC20(token).transferFrom(msg.sender, address(this), amountTokenDesired);
        
        // Get or create pair
        address pair = IUniswapV2Factory(factory).getPair(token, WETH);
        if (pair == address(0)) {
            pair = IUniswapV2Factory(factory).createPair(token, WETH);
        }

        // Transfer tokens to pair
        IERC20(token).transfer(pair, amountTokenDesired);
        
        // Mint LP tokens (simplified)
        MockUniswapV2Pair(pair).mint(to, amountTokenDesired + msg.value);

        return (amountTokenDesired, msg.value, amountTokenDesired + msg.value);
    }

    // Stub implementations for interface compliance
    function addLiquidity(address,address,uint,uint,uint,uint,address,uint) external pure override returns (uint, uint, uint) {
        revert("Not implemented");
    }
    function removeLiquidity(address,address,uint,uint,uint,address,uint) external pure override returns (uint, uint) {
        revert("Not implemented");
    }
    function removeLiquidityETH(address,uint,uint,uint,address,uint) external pure override returns (uint, uint) {
        revert("Not implemented");
    }
    function swapExactTokensForTokens(uint,uint,address[] calldata,address,uint) external pure override returns (uint[] memory) {
        revert("Not implemented");
    }
    function swapTokensForExactTokens(uint,uint,address[] calldata,address,uint) external pure override returns (uint[] memory) {
        revert("Not implemented");
    }
    function swapExactETHForTokens(uint,address[] calldata,address,uint) external payable override returns (uint[] memory) {
        revert("Not implemented");
    }
    function swapTokensForExactETH(uint,uint,address[] calldata,address,uint) external pure override returns (uint[] memory) {
        revert("Not implemented");
    }
    function swapExactTokensForETH(uint,uint,address[] calldata,address,uint) external pure override returns (uint[] memory) {
        revert("Not implemented");
    }
    function swapETHForExactTokens(uint,address[] calldata,address,uint) external payable override returns (uint[] memory) {
        revert("Not implemented");
    }
    function quote(uint,uint,uint) external pure override returns (uint) {
        revert("Not implemented");
    }
    function getAmountOut(uint,uint,uint) external pure override returns (uint) {
        revert("Not implemented");
    }
    function getAmountIn(uint,uint,uint) external pure override returns (uint) {
        revert("Not implemented");
    }
    function getAmountsOut(uint,address[] calldata) external pure override returns (uint[] memory) {
        revert("Not implemented");
    }
    function getAmountsIn(uint,address[] calldata) external pure override returns (uint[] memory) {
        revert("Not implemented");
    }
    function removeLiquidityETHSupportingFeeOnTransferTokens(address,uint,uint,uint,address,uint) external pure override returns (uint) {
        revert("Not implemented");
    }
    function swapExactTokensForTokensSupportingFeeOnTransferTokens(uint,uint,address[] calldata,address,uint) external pure override {
        revert("Not implemented");
    }
    function swapExactETHForTokensSupportingFeeOnTransferTokens(uint,address[] calldata,address,uint) external payable override {
        revert("Not implemented");
    }
    function swapExactTokensForETHSupportingFeeOnTransferTokens(uint,uint,address[] calldata,address,uint) external pure override {
        revert("Not implemented");
    }
}

contract MockUniswapV2Factory is IUniswapV2Factory {
    mapping(address => mapping(address => address)) public override getPair;
    address[] public override allPairs;

    function createPair(address tokenA, address tokenB) external override returns (address pair) {
        require(tokenA != tokenB, "Identical addresses");
        require(getPair[tokenA][tokenB] == address(0), "Pair exists");

        MockUniswapV2Pair newPair = new MockUniswapV2Pair(tokenA, tokenB);
        pair = address(newPair);

        getPair[tokenA][tokenB] = pair;
        getPair[tokenB][tokenA] = pair;
        allPairs.push(pair);

        emit PairCreated(tokenA, tokenB, pair, allPairs.length);
        return pair;
    }

    function allPairsLength() external view override returns (uint) {
        return allPairs.length;
    }

    function feeTo() external pure override returns (address) {
        return address(0);
    }

    function feeToSetter() external pure override returns (address) {
        return address(0);
    }

    function setFeeTo(address) external pure override {
        revert("Not implemented");
    }

    function setFeeToSetter(address) external pure override {
        revert("Not implemented");
    }
}

contract MockUniswapV2Pair is IUniswapV2Pair {
    address public immutable override token0;
    address public immutable override token1;
    
    mapping(address => uint) public override balanceOf;
    mapping(address => mapping(address => uint)) public override allowance;
    uint public override totalSupply;

    constructor(address _token0, address _token1) {
        token0 = _token0;
        token1 = _token1;
    }

    function mint(address to) external override returns (uint liquidity) {
        uint amount = 1000; // Simplified mint logic
        balanceOf[to] += amount;
        totalSupply += amount;
        emit Transfer(address(0), to, amount);
        return amount;
    }

    function mint(address to, uint amount) external {
        balanceOf[to] += amount;
        totalSupply += amount;
        emit Transfer(address(0), to, amount);
    }

    function transfer(address to, uint value) external override returns (bool) {
        require(balanceOf[msg.sender] >= value, "Insufficient balance");
        balanceOf[msg.sender] -= value;
        balanceOf[to] += value;
        emit Transfer(msg.sender, to, value);
        return true;
    }

    function approve(address spender, uint value) external override returns (bool) {
        allowance[msg.sender][spender] = value;
        emit Approval(msg.sender, spender, value);
        return true;
    }

    function transferFrom(address from, address to, uint value) external override returns (bool) {
        require(balanceOf[from] >= value, "Insufficient balance");
        require(allowance[from][msg.sender] >= value, "Insufficient allowance");
        
        balanceOf[from] -= value;
        balanceOf[to] += value;
        allowance[from][msg.sender] -= value;
        
        emit Transfer(from, to, value);
        return true;
    }

    // Stub implementations
    function name() external pure override returns (string memory) { return "Mock LP"; }
    function symbol() external pure override returns (string memory) { return "MLP"; }
    function decimals() external pure override returns (uint8) { return 18; }
    function DOMAIN_SEPARATOR() external pure override returns (bytes32) { return bytes32(0); }
    function PERMIT_TYPEHASH() external pure override returns (bytes32) { return bytes32(0); }
    function nonces(address) external pure override returns (uint) { return 0; }
    function permit(address,address,uint,uint,uint8,bytes32,bytes32) external pure override { revert("Not implemented"); }
    function MINIMUM_LIQUIDITY() external pure override returns (uint) { return 1000; }
    function factory() external pure override returns (address) { return address(0); }
    function getReserves() external pure override returns (uint112, uint112, uint32) { return (0, 0, 0); }
    function price0CumulativeLast() external pure override returns (uint) { return 0; }
    function price1CumulativeLast() external pure override returns (uint) { return 0; }
    function kLast() external pure override returns (uint) { return 0; }
    function burn(address) external pure override returns (uint, uint) { revert("Not implemented"); }
    function swap(uint,uint,address,bytes calldata) external pure override { revert("Not implemented"); }
    function skim(address) external pure override { revert("Not implemented"); }
    function sync() external pure override { revert("Not implemented"); }
    function initialize(address,address) external pure override { revert("Not implemented"); }
}

contract MockWETH {
    string public name = "Wrapped Ether";
    string public symbol = "WETH";
    uint8 public decimals = 18;

    mapping(address => uint) public balanceOf;

    function deposit() public payable {
        balanceOf[msg.sender] += msg.value;
    }

    function withdraw(uint amount) public {
        require(balanceOf[msg.sender] >= amount, "Insufficient balance");
        balanceOf[msg.sender] -= amount;
        payable(msg.sender).transfer(amount);
    }

    receive() external payable {
        deposit();
    }
}
