// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title FCWEED
 * @dev Simple ERC20 token for testing the launchpad
 */
contract FCWEED is ERC20, Ownable {
    constructor() ERC20("FCWEED", "FCWEED") Ownable(msg.sender) {
        // Mint 1 billion tokens to deployer
        _mint(msg.sender, 1_000_000_000 * 10**18);
    }

    /**
     * @dev Mint additional tokens (owner only)
     */
    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
    }
}
