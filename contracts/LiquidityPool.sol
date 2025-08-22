// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/math/Math.sol";
import "./MockEERC20.sol";

/**
 * @title LiquidityPool
 * @dev Manages encrypted liquidity for trading pairs with privacy preservation
 */
contract LiquidityPool is ReentrancyGuard, Ownable {
    using Math for uint256;

    // Pool information structure
    struct PoolInfo {
        address tokenA;
        address tokenB;
        uint256 encryptedReserveA;
        uint256 encryptedReserveB;
        uint256 totalShares;
        uint256 fee;
        bool isActive;
        uint256 createdAt;
    }

    // Liquidity provider information
    struct LPInfo {
        uint256 shares;
        uint256 encryptedAmountA;
        uint256 encryptedAmountB;
        uint256 lastDeposit;
        uint256 rewardDebt;
    }

    // Events
    event PoolCreated(
        bytes32 indexed poolId,
        address indexed tokenA,
        address indexed tokenB,
        uint256 fee
    );
    
    event LiquidityDeposited(
        bytes32 indexed poolId,
        address indexed provider,
        bytes32 encryptedAmountA,
        bytes32 encryptedAmountB,
        uint256 shares
    );
    
    event LiquidityWithdrawn(
        bytes32 indexed poolId,
        address indexed provider,
        bytes32 encryptedAmountA,
        bytes32 encryptedAmountB,
        uint256 shares
    );
    
    event FeesCollected(
        bytes32 indexed poolId,
        bytes32 encryptedFeeA,
        bytes32 encryptedFeeB
    );

    // State variables
    mapping(bytes32 => PoolInfo) public pools;
    mapping(bytes32 => mapping(address => LPInfo)) public liquidityProviders;
    mapping(address => bool) public authorizedTokens;
    
    bytes32[] public allPools;
    uint256 public constant MINIMUM_LIQUIDITY = 1000;
    uint256 public constant MAX_FEE = 1000; // 10%
    uint256 public protocolFee = 5; // 0.05%

    constructor() Ownable(msg.sender) {}

    /**
     * @dev Authorize a token for use in pools
     */
    function authorizeToken(address token) external onlyOwner {
        require(token != address(0), "Invalid token");
        authorizedTokens[token] = true;
    }

    /**
     * @dev Revoke token authorization
     */
    function revokeToken(address token) external onlyOwner {
        authorizedTokens[token] = false;
    }

    /**
     * @dev Create a new liquidity pool
     */
    function createPool(
        address tokenA,
        address tokenB,
        uint256 fee
    ) external onlyOwner returns (bytes32 poolId) {
        require(tokenA != tokenB, "Identical tokens");
        require(tokenA != address(0) && tokenB != address(0), "Zero address");
        require(authorizedTokens[tokenA] && authorizedTokens[tokenB], "Unauthorized tokens");
        require(fee <= MAX_FEE, "Fee too high");

        // Ensure consistent ordering
        if (tokenA > tokenB) {
            (tokenA, tokenB) = (tokenB, tokenA);
        }

        poolId = keccak256(abi.encodePacked(tokenA, tokenB, fee));
        require(!pools[poolId].isActive, "Pool exists");

        pools[poolId] = PoolInfo({
            tokenA: tokenA,
            tokenB: tokenB,
            encryptedReserveA: 0,
            encryptedReserveB: 0,
            totalShares: 0,
            fee: fee,
            isActive: true,
            createdAt: block.timestamp
        });

        allPools.push(poolId);
        emit PoolCreated(poolId, tokenA, tokenB, fee);
    }

    /**
     * @dev Add liquidity to a pool
     */
    function addLiquidity(
        bytes32 poolId,
        uint256 amountA,
        uint256 amountB,
        uint256 minShares
    ) external nonReentrant returns (uint256 shares) {
        PoolInfo storage pool = pools[poolId];
        require(pool.isActive, "Pool inactive");
        require(amountA > 0 && amountB > 0, "Amounts must be greater than 0");

        // Transfer tokens from user
        MockEERC20(pool.tokenA).transferFrom(msg.sender, address(this), amountA);
        MockEERC20(pool.tokenB).transferFrom(msg.sender, address(this), amountB);

        // Calculate shares to mint
        if (pool.totalShares == 0) {
            // First liquidity provider
            shares = Math.sqrt(amountA * amountB);
            require(shares > MINIMUM_LIQUIDITY, "Insufficient liquidity");
            shares -= MINIMUM_LIQUIDITY; // Lock minimum liquidity
        } else {
            // Calculate proportional shares
            uint256 sharesA = (amountA * pool.totalShares) / pool.encryptedReserveA;
            uint256 sharesB = (amountB * pool.totalShares) / pool.encryptedReserveB;
            shares = Math.min(sharesA, sharesB);
        }

        require(shares >= minShares, "Insufficient shares minted");

        // Update pool state
        pool.encryptedReserveA += amountA;
        pool.encryptedReserveB += amountB;
        pool.totalShares += shares;

        // Update LP position
        LPInfo storage lpInfo = liquidityProviders[poolId][msg.sender];
        lpInfo.shares += shares;
        lpInfo.encryptedAmountA += amountA;
        lpInfo.encryptedAmountB += amountB;
        lpInfo.lastDeposit = block.timestamp;

        // Emit event with encrypted placeholders for privacy
        bytes32 encryptedAmountA = keccak256(abi.encodePacked(amountA, msg.sender, block.timestamp));
        bytes32 encryptedAmountB = keccak256(abi.encodePacked(amountB, msg.sender, block.timestamp));
        emit LiquidityDeposited(poolId, msg.sender, encryptedAmountA, encryptedAmountB, shares);
    }

    /**
     * @dev Remove liquidity from a pool
     */
    function removeLiquidity(
        bytes32 poolId,
        uint256 sharesToBurn,
        uint256 minAmountA,
        uint256 minAmountB
    ) external nonReentrant returns (uint256 amountA, uint256 amountB) {
        PoolInfo storage pool = pools[poolId];
        require(pool.isActive, "Pool inactive");
        require(sharesToBurn > 0, "Shares must be greater than 0");

        LPInfo storage lpInfo = liquidityProviders[poolId][msg.sender];
        require(lpInfo.shares >= sharesToBurn, "Insufficient shares");

        // Calculate proportional amounts to return
        amountA = (sharesToBurn * pool.encryptedReserveA) / pool.totalShares;
        amountB = (sharesToBurn * pool.encryptedReserveB) / pool.totalShares;

        require(amountA >= minAmountA, "Insufficient amount A");
        require(amountB >= minAmountB, "Insufficient amount B");

        // Update state
        lpInfo.shares -= sharesToBurn;
        lpInfo.encryptedAmountA -= amountA;
        lpInfo.encryptedAmountB -= amountB;

        pool.totalShares -= sharesToBurn;
        pool.encryptedReserveA -= amountA;
        pool.encryptedReserveB -= amountB;

        // Transfer tokens back to user
        MockEERC20(pool.tokenA).transfer(msg.sender, amountA);
        MockEERC20(pool.tokenB).transfer(msg.sender, amountB);

        // Emit event with encrypted placeholders for privacy
        bytes32 encryptedAmountA = keccak256(abi.encodePacked(amountA, msg.sender, block.timestamp));
        bytes32 encryptedAmountB = keccak256(abi.encodePacked(amountB, msg.sender, block.timestamp));
        emit LiquidityWithdrawn(poolId, msg.sender, encryptedAmountA, encryptedAmountB, sharesToBurn);
    }

    /**
     * @dev Calculate optimal liquidity amounts for adding to pool
     */
    function calculateOptimalAmounts(
        bytes32 poolId,
        uint256 desiredAmountA
    ) external view returns (uint256 optimalAmountB) {
        PoolInfo storage pool = pools[poolId];
        require(pool.isActive, "Pool inactive");

        if (pool.totalShares == 0) {
            // First liquidity addition - any ratio is acceptable
            optimalAmountB = desiredAmountA;
        } else {
            // Calculate optimal amount B to maintain current ratio
            optimalAmountB = (desiredAmountA * pool.encryptedReserveB) / pool.encryptedReserveA;
        }
    }

    /**
     * @dev Get pool information
     */
    function getPoolInfo(bytes32 poolId) external view returns (PoolInfo memory) {
        return pools[poolId];
    }

    /**
     * @dev Get liquidity provider information
     */
    function getLPInfo(bytes32 poolId, address provider) external view returns (LPInfo memory) {
        return liquidityProviders[poolId][provider];
    }

    /**
     * @dev Get all pool IDs
     */
    function getAllPools() external view returns (bytes32[] memory) {
        return allPools;
    }

    /**
     * @dev Calculate share percentage for a liquidity provider
     */
    function getSharePercentage(bytes32 poolId, address provider) external view returns (uint256) {
        PoolInfo storage pool = pools[poolId];
        LPInfo storage lpInfo = liquidityProviders[poolId][provider];
        
        if (pool.totalShares == 0) return 0;
        return (lpInfo.shares * 1e18) / pool.totalShares;
    }

    /**
     * @dev Emergency pause pool (owner only)
     */
    function pausePool(bytes32 poolId) external onlyOwner {
        pools[poolId].isActive = false;
    }

    /**
     * @dev Resume paused pool (owner only)
     */
    function resumePool(bytes32 poolId) external onlyOwner {
        pools[poolId].isActive = true;
    }

    /**
     * @dev Update protocol fee (owner only)
     */
    function setProtocolFee(uint256 newFee) external onlyOwner {
        require(newFee <= 100, "Fee too high"); // Max 1%
        protocolFee = newFee;
    }

    /**
     * @dev Collect protocol fees (simplified)
     */
    function collectProtocolFees(bytes32 poolId) external onlyOwner {
        // In a real implementation, this would calculate and transfer protocol fees
        emit FeesCollected(poolId, bytes32(0), bytes32(0));
    }
}
