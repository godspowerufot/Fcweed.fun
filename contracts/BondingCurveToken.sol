// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title BondingCurveToken
 * @dev Standard ERC20 token with mint/burn restricted to the owner (Factory).
 *      No built-in tax logic; taxes are handled by the Factory during the bonding phase.
 */
contract BondingCurveToken is ERC20, Ownable {
    constructor(
        string memory name,
        string memory symbol,
        address factory
    ) ERC20(name, symbol) Ownable(factory) {}

    /**
     * @dev Mint tokens. Only callable by the factory (owner).
     * @param to Recipient address
     * @param amount Amount to mint
     */
    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
    }

    /**
     * @dev Burn tokens. Only callable by the factory (owner).
     * @param from Address to burn from
     * @param amount Amount to burn
     */
    function burn(address from, uint256 amount) external onlyOwner {
        _burn(from, amount);
    }
}
