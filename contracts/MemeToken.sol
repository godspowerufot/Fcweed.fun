// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title MemeToken
 * @dev ERC20 token with 3% buy/sell tax paid in FCWEED to holders
 * 
 * Features:
 * - 3% tax on all transfers (configurable)
 * - Tax collected and distributed in FCWEED tokens
 * - Tax exemptions for specific addresses (launchpad, owner, etc.)
 * - Owner can update tax parameters and FCWEED token address
 */
contract MemeToken is ERC20, Ownable, ReentrancyGuard {
    // Tax configuration
    uint256 public taxPercentage = 300; // 3% = 300 basis points (out of 10000)
    uint256 public constant MAX_TAX = 1000; // Maximum 10% tax
    uint256 public constant BASIS_POINTS = 10000;

    // FCWEED reward token
    IERC20 public fcweedToken;

    // Tax exemptions
    mapping(address => bool) public isTaxExempt;

    // Collected tax tracking
    uint256 public totalTaxCollected;

    // Events
    event TaxCollected(address indexed from, address indexed to, uint256 amount);
    event TaxPercentageUpdated(uint256 oldPercentage, uint256 newPercentage);
    event FcweedTokenUpdated(address indexed oldToken, address indexed newToken);
    event TaxExemptionUpdated(address indexed account, bool exempt);
    event TaxDistributed(uint256 amount);

    /**
     * @dev Constructor
     * @param name_ Token name
     * @param symbol_ Token symbol
     * @param totalSupply_ Total supply to mint
     * @param fcweedToken_ Address of FCWEED reward token
     * @param owner_ Owner address
     */
    constructor(
        string memory name_,
        string memory symbol_,
        uint256 totalSupply_,
        address fcweedToken_,
        address owner_
    ) ERC20(name_, symbol_) Ownable(owner_) {
        require(fcweedToken_ != address(0), "Invalid FCWEED token address");
        
        fcweedToken = IERC20(fcweedToken_);
        
        // Mint total supply to owner
        _mint(owner_, totalSupply_);

        // Exempt owner and this contract from tax
        isTaxExempt[owner_] = true;
        isTaxExempt[address(this)] = true;
    }

    /**
     * @dev Override transfer to implement tax mechanism
     */
    function _update(
        address from,
        address to,
        uint256 amount
    ) internal virtual override {
        // Skip tax for minting, burning, or exempt addresses
        if (from == address(0) || to == address(0) || isTaxExempt[from] || isTaxExempt[to]) {
            super._update(from, to, amount);
            return;
        }

        // Calculate tax
        uint256 taxAmount = (amount * taxPercentage) / BASIS_POINTS;
        uint256 amountAfterTax = amount - taxAmount;

        // Transfer tax to contract
        if (taxAmount > 0) {
            super._update(from, address(this), taxAmount);
            totalTaxCollected += taxAmount;
            emit TaxCollected(from, to, taxAmount);
        }

        // Transfer remaining amount to recipient
        super._update(from, to, amountAfterTax);
    }

    /**
     * @dev Distribute collected tax as FCWEED rewards to holders
     * @param fcweedAmount Amount of FCWEED to distribute
     * @param recipients Array of recipient addresses
     * @param amounts Array of amounts for each recipient
     */
    function distributeTaxRewards(
        uint256 fcweedAmount,
        address[] calldata recipients,
        uint256[] calldata amounts
    ) external onlyOwner nonReentrant {
        require(recipients.length == amounts.length, "Array length mismatch");
        require(recipients.length > 0, "No recipients");

        uint256 totalAmount = 0;
        for (uint256 i = 0; i < amounts.length; i++) {
            totalAmount += amounts[i];
        }
        require(totalAmount == fcweedAmount, "Amount mismatch");

        // Transfer FCWEED from owner to recipients
        for (uint256 i = 0; i < recipients.length; i++) {
            require(
                fcweedToken.transferFrom(msg.sender, recipients[i], amounts[i]),
                "FCWEED transfer failed"
            );
        }

        emit TaxDistributed(fcweedAmount);
    }

    /**
     * @dev Update tax percentage
     * @param newTaxPercentage New tax percentage in basis points
     */
    function setTaxPercentage(uint256 newTaxPercentage) external onlyOwner {
        require(newTaxPercentage <= MAX_TAX, "Tax too high");
        uint256 oldPercentage = taxPercentage;
        taxPercentage = newTaxPercentage;
        emit TaxPercentageUpdated(oldPercentage, newTaxPercentage);
    }

    /**
     * @dev Update FCWEED token address
     * @param newFcweedToken New FCWEED token address
     */
    function setFcweedToken(address newFcweedToken) external onlyOwner {
        require(newFcweedToken != address(0), "Invalid address");
        address oldToken = address(fcweedToken);
        fcweedToken = IERC20(newFcweedToken);
        emit FcweedTokenUpdated(oldToken, newFcweedToken);
    }

    /**
     * @dev Set tax exemption for an address
     * @param account Address to update
     * @param exempt Whether the address should be exempt
     */
    function setTaxExempt(address account, bool exempt) external onlyOwner {
        require(account != address(0), "Invalid address");
        isTaxExempt[account] = exempt;
        emit TaxExemptionUpdated(account, exempt);
    }

    /**
     * @dev Withdraw collected tax tokens (emergency function)
     * @param amount Amount to withdraw
     */
    function withdrawTax(uint256 amount) external onlyOwner {
        require(amount <= balanceOf(address(this)), "Insufficient balance");
        _transfer(address(this), owner(), amount);
    }

    /**
     * @dev Withdraw any ERC20 tokens sent to this contract
     * @param token Token address
     * @param amount Amount to withdraw
     */
    function withdrawToken(address token, uint256 amount) external onlyOwner {
        require(token != address(this), "Cannot withdraw own token");
        IERC20(token).transfer(owner(), amount);
    }
}
