// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/math/Math.sol";
import "./PrivateDEX.sol";
import "./LiquidityPool.sol";
import "./MockEERC20.sol";

/**
 * @title PrivateSwapRouter
 * @dev Handles routing of private swaps with optimal path finding and privacy preservation
 */
contract PrivateSwapRouter is ReentrancyGuard, Ownable {
    using Math for uint256;

    // Swap path structure
    struct SwapPath {
        address[] tokens;
        bytes32[] poolIds;
        uint256[] fees;
    }

    // Swap parameters
    struct SwapParams {
        address tokenIn;
        address tokenOut;
        bytes32 encryptedAmountIn;
        bytes32 encryptedMinAmountOut;
        address to;
        uint256 deadline;
        bytes zkProof;
    }

    // Multi-hop swap parameters
    struct MultiHopSwapParams {
        SwapPath path;
        bytes32 encryptedAmountIn;
        bytes32 encryptedMinAmountOut;
        address to;
        uint256 deadline;
        bytes zkProof;
    }

    // Events
    event PrivateSwapExecuted(
        address indexed user,
        address indexed tokenIn,
        address indexed tokenOut,
        bytes32 encryptedAmountIn,
        bytes32 encryptedAmountOut,
        bytes32[] poolIds
    );

    event OptimalPathFound(
        address indexed tokenIn,
        address indexed tokenOut,
        bytes32[] poolIds,
        uint256 estimatedOutput
    );

    event SlippageProtectionTriggered(
        address indexed user,
        bytes32 expectedAmount,
        bytes32 actualAmount
    );

    // State variables
    PrivateDEX public immutable privateDEX;
    LiquidityPool public immutable liquidityPool;
    
    mapping(address => bool) public authorizedTokens;
    mapping(bytes32 => bool) public authorizedPools;
    
    uint256 public maxHops = 3;
    uint256 public slippageTolerance = 50; // 0.5% default

    constructor(
        address _privateDEX,
        address _liquidityPool
    ) Ownable(msg.sender) {
        require(_privateDEX != address(0), "Invalid DEX address");
        require(_liquidityPool != address(0), "Invalid pool address");
        
        privateDEX = PrivateDEX(_privateDEX);
        liquidityPool = LiquidityPool(_liquidityPool);
    }

    /**
     * @dev Authorize a token for routing
     */
    function authorizeToken(address token) external onlyOwner {
        require(token != address(0), "Invalid token");
        authorizedTokens[token] = true;
    }

    /**
     * @dev Authorize a pool for routing
     */
    function authorizePool(bytes32 poolId) external onlyOwner {
        authorizedPools[poolId] = true;
    }

    /**
     * @dev Execute a single-hop token swap
     */
    function swapExactTokensForTokens(
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 minAmountOut,
        address to,
        uint256 deadline
    ) external nonReentrant returns (uint256 amountOut) {
        require(block.timestamp <= deadline, "Deadline exceeded");
        require(authorizedTokens[tokenIn], "Token not authorized");
        require(authorizedTokens[tokenOut], "Token not authorized");
        require(amountIn > 0, "Amount must be greater than 0");

        // Find the direct pool for this pair
        bytes32 poolId = _findDirectPool(tokenIn, tokenOut);
        require(poolId != bytes32(0), "No direct pool found");
        require(authorizedPools[poolId], "Pool not authorized");

        // Transfer tokens from user to this contract
        MockEERC20(tokenIn).transferFrom(msg.sender, address(this), amountIn);

        // Approve the DEX to spend tokens
        MockEERC20(tokenIn).approve(address(privateDEX), amountIn);

        // Execute swap through PrivateDEX
        amountOut = privateDEX.swapTokens(
            poolId,
            amountIn,
            minAmountOut,
            _isTokenAToB(tokenIn, tokenOut, poolId)
        );

        // Transfer output tokens to recipient
        MockEERC20(tokenOut).transfer(to, amountOut);

        // Create encrypted representations for privacy event
        bytes32 encryptedAmountIn = keccak256(abi.encodePacked(amountIn, msg.sender, block.timestamp));
        bytes32 encryptedAmountOut = keccak256(abi.encodePacked(amountOut, msg.sender, block.timestamp));

        bytes32[] memory poolIds = new bytes32[](1);
        poolIds[0] = poolId;

        emit PrivateSwapExecuted(
            msg.sender,
            tokenIn,
            tokenOut,
            encryptedAmountIn,
            encryptedAmountOut,
            poolIds
        );
    }

    /**
     * @dev Execute a multi-hop token swap
     */
    function swapExactTokensForTokensMultiHop(
        address[] calldata tokens,
        uint256 amountIn,
        uint256 minAmountOut,
        address to,
        uint256 deadline
    ) external nonReentrant returns (uint256 amountOut) {
        require(block.timestamp <= deadline, "Deadline exceeded");
        require(tokens.length >= 2, "Invalid path");
        require(tokens.length <= maxHops + 1, "Too many hops");
        require(amountIn > 0, "Amount must be greater than 0");

        // Validate all tokens in the path
        for (uint256 i = 0; i < tokens.length; i++) {
            require(authorizedTokens[tokens[i]], "Token not authorized");
        }

        // Transfer input tokens from user
        MockEERC20(tokens[0]).transferFrom(msg.sender, address(this), amountIn);

        // Execute swaps sequentially through each hop
        uint256 currentAmount = amountIn;
        bytes32[] memory poolIds = new bytes32[](tokens.length - 1);

        for (uint256 i = 0; i < tokens.length - 1; i++) {
            address tokenIn = tokens[i];
            address tokenOut = tokens[i + 1];

            // Find pool for this pair
            bytes32 poolId = _findDirectPool(tokenIn, tokenOut);
            require(poolId != bytes32(0), "No pool found for pair");
            require(authorizedPools[poolId], "Pool not authorized");
            poolIds[i] = poolId;

            // Approve DEX to spend tokens
            MockEERC20(tokenIn).approve(address(privateDEX), currentAmount);

            // Execute swap
            uint256 minOut = (i == tokens.length - 2) ? minAmountOut : 0; // Only apply slippage on final hop
            currentAmount = privateDEX.swapTokens(
                poolId,
                currentAmount,
                minOut,
                _isTokenAToB(tokenIn, tokenOut, poolId)
            );
        }

        amountOut = currentAmount;
        require(amountOut >= minAmountOut, "Insufficient output amount");

        // Transfer final output tokens to recipient
        MockEERC20(tokens[tokens.length - 1]).transfer(to, amountOut);

        // Create encrypted representations for privacy event
        bytes32 encryptedAmountIn = keccak256(abi.encodePacked(amountIn, msg.sender, block.timestamp));
        bytes32 encryptedAmountOut = keccak256(abi.encodePacked(amountOut, msg.sender, block.timestamp));

        emit PrivateSwapExecuted(
            msg.sender,
            tokens[0],
            tokens[tokens.length - 1],
            encryptedAmountIn,
            encryptedAmountOut,
            poolIds
        );
    }

    /**
     * @dev Find the optimal swap path between two tokens
     */
    function findOptimalPath(
        address tokenIn,
        address tokenOut,
        uint256 amountIn
    ) external view returns (address[] memory path, uint256 estimatedOutput) {
        require(authorizedTokens[tokenIn], "Token not authorized");
        require(authorizedTokens[tokenOut], "Token not authorized");

        // Try direct path first
        bytes32 directPool = _findDirectPool(tokenIn, tokenOut);
        if (directPool != bytes32(0) && authorizedPools[directPool]) {
            path = new address[](2);
            path[0] = tokenIn;
            path[1] = tokenOut;

            // Calculate estimated output
            estimatedOutput = _calculateDirectSwapOutput(directPool, amountIn, tokenIn, tokenOut);

            return (path, estimatedOutput);
        }

        // If no direct path, return empty path (could be extended for multi-hop)
        path = new address[](0);
        estimatedOutput = 0;
    }

    /**
     * @dev Get quote for a swap without executing it
     */
    function getAmountOut(
        address tokenIn,
        address tokenOut,
        uint256 amountIn
    ) external view returns (uint256 amountOut) {
        bytes32 poolId = _findDirectPool(tokenIn, tokenOut);
        require(poolId != bytes32(0), "No pool found");
        
        return _calculateDirectSwapOutput(poolId, amountIn, tokenIn, tokenOut);
    }

    /**
     * @dev Set maximum number of hops allowed
     */
    function setMaxHops(uint256 _maxHops) external onlyOwner {
        require(_maxHops > 0 && _maxHops <= 5, "Invalid max hops");
        maxHops = _maxHops;
    }

    /**
     * @dev Set slippage tolerance
     */
    function setSlippageTolerance(uint256 _slippageTolerance) external onlyOwner {
        require(_slippageTolerance <= 1000, "Slippage too high"); // Max 10%
        slippageTolerance = _slippageTolerance;
    }

    // Internal functions

    /**
     * @dev Find direct pool between two tokens
     */
    function _findDirectPool(address tokenA, address tokenB) internal pure returns (bytes32) {
        // Ensure consistent ordering
        if (tokenA > tokenB) {
            (tokenA, tokenB) = (tokenB, tokenA);
        }
        return keccak256(abi.encodePacked(tokenA, tokenB));
    }

    /**
     * @dev Determine if swap is tokenA to tokenB
     */
    function _isTokenAToB(address tokenIn, address tokenOut, bytes32 poolId) internal view returns (bool) {
        LiquidityPool.PoolInfo memory poolInfo = liquidityPool.getPoolInfo(poolId);
        return tokenIn == poolInfo.tokenA;
    }

    /**
     * @dev Calculate direct swap output (simplified)
     */
    function _calculateDirectSwapOutput(
        bytes32 poolId,
        uint256 amountIn,
        address tokenIn,
        address tokenOut
    ) internal view returns (uint256) {
        // Use the DEX's calculation function
        return privateDEX.calculateSwapOutput(poolId, amountIn, _isTokenAToB(tokenIn, tokenOut, poolId));
    }

    /**
     * @dev Execute multi-hop swap (simplified)
     */
    function _executeMultiHopSwap(MultiHopSwapParams calldata params) internal pure returns (bytes32) {
        // For now, return the minimum expected amount
        return params.encryptedMinAmountOut;
    }

    /**
     * @dev Find multi-hop path (simplified)
     */
    function _findMultiHopPath(address tokenIn, address tokenOut) internal pure returns (SwapPath memory) {
        // Simplified implementation - in reality, this would use graph algorithms
        SwapPath memory path;
        path.tokens = new address[](2);
        path.poolIds = new bytes32[](1);
        path.fees = new uint256[](1);
        
        path.tokens[0] = tokenIn;
        path.tokens[1] = tokenOut;
        path.poolIds[0] = _findDirectPool(tokenIn, tokenOut);
        path.fees[0] = 30; // Default fee
        
        return path;
    }

    /**
     * @dev Calculate multi-hop output (simplified)
     */
    function _calculateMultiHopOutput(SwapPath memory path, uint256 amountIn) internal view returns (uint256) {
        // Simplified calculation
        return amountIn * 99 / 100; // Assume 1% total slippage
    }
}
