// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/math/Math.sol";
import "./MockEERC20.sol";

/**
 * @title PrivateDEX
 * @dev Core AMM contract with eERC20 integration for private trading
 * Implements constant product formula (x * y = k) with encrypted balances
 */
contract PrivateDEX is ReentrancyGuard, Ownable {
    using Math for uint256;

    // Trading pair structure
    struct TradingPair {
        address tokenA;
        address tokenB;
        uint256 reserveA;
        uint256 reserveB;
        uint256 totalLiquidity;
        bool isActive;
        uint256 fee; // Fee in basis points (100 = 1%)
    }

    // Liquidity provider position
    struct LiquidityPosition {
        uint256 liquidity;
        uint256 lastUpdate;
    }

    // Events
    event PairCreated(address indexed tokenA, address indexed tokenB, bytes32 indexed pairId);
    event PrivateSwap(
        address indexed user,
        bytes32 indexed pairId,
        bytes32 encryptedAmountIn,
        bytes32 encryptedAmountOut,
        bool isAtoB
    );
    event LiquidityAdded(
        address indexed provider,
        bytes32 indexed pairId,
        bytes32 encryptedAmountA,
        bytes32 encryptedAmountB,
        uint256 liquidity
    );
    event LiquidityRemoved(
        address indexed provider,
        bytes32 indexed pairId,
        bytes32 encryptedAmountA,
        bytes32 encryptedAmountB,
        uint256 liquidity
    );

    // State variables
    mapping(bytes32 => TradingPair) public tradingPairs;
    mapping(bytes32 => mapping(address => LiquidityPosition)) public liquidityPositions;
    mapping(address => bool) public supportedTokens;
    
    bytes32[] public allPairs;
    uint256 public constant MINIMUM_LIQUIDITY = 1000;
    uint256 public constant MAX_FEE = 1000; // 10% max fee
    
    constructor() Ownable(msg.sender) {}

    /**
     * @dev Add a token to the supported tokens list
     */
    function addSupportedToken(address token) external onlyOwner {
        require(token != address(0), "Invalid token address");
        supportedTokens[token] = true;
    }

    /**
     * @dev Remove a token from the supported tokens list
     */
    function removeSupportedToken(address token) external onlyOwner {
        supportedTokens[token] = false;
    }

    /**
     * @dev Create a new trading pair
     */
    function createPair(
        address tokenA,
        address tokenB,
        uint256 fee
    ) external onlyOwner returns (bytes32 pairId) {
        require(tokenA != tokenB, "Identical tokens");
        require(tokenA != address(0) && tokenB != address(0), "Zero address");
        require(supportedTokens[tokenA] && supportedTokens[tokenB], "Unsupported tokens");
        require(fee <= MAX_FEE, "Fee too high");

        // Ensure consistent ordering
        if (tokenA > tokenB) {
            (tokenA, tokenB) = (tokenB, tokenA);
        }

        pairId = keccak256(abi.encodePacked(tokenA, tokenB));
        require(!tradingPairs[pairId].isActive, "Pair already exists");

        tradingPairs[pairId] = TradingPair({
            tokenA: tokenA,
            tokenB: tokenB,
            reserveA: 0,
            reserveB: 0,
            totalLiquidity: 0,
            isActive: true,
            fee: fee
        });

        allPairs.push(pairId);
        emit PairCreated(tokenA, tokenB, pairId);
    }

    /**
     * @dev Calculate swap output amount using constant product formula
     */
    function _calculateSwapOutput(
        bytes32 pairId,
        uint256 amountIn,
        bool isAtoB
    ) internal view returns (uint256 amountOut) {
        TradingPair storage pair = tradingPairs[pairId];
        require(pair.isActive, "Pair not active");

        uint256 reserveIn = isAtoB ? pair.reserveA : pair.reserveB;
        uint256 reserveOut = isAtoB ? pair.reserveB : pair.reserveA;

        require(reserveIn > 0 && reserveOut > 0, "Insufficient liquidity");

        // Apply fee (fee is in basis points)
        uint256 amountInWithFee = amountIn * (10000 - pair.fee) / 10000;

        // Constant product formula: (x + dx) * (y - dy) = x * y
        // Solving for dy: dy = (y * dx) / (x + dx)
        amountOut = (reserveOut * amountInWithFee) / (reserveIn + amountInWithFee);

        require(amountOut > 0, "Insufficient output amount");
        require(amountOut < reserveOut, "Insufficient liquidity");
    }

    /**
     * @dev Execute a token swap (simplified privacy - using regular amounts for hackathon)
     * @param pairId The trading pair identifier
     * @param amountIn Input amount
     * @param minAmountOut Minimum expected output amount
     * @param isAtoB Direction of swap (true: A->B, false: B->A)
     */
    function swapTokens(
        bytes32 pairId,
        uint256 amountIn,
        uint256 minAmountOut,
        bool isAtoB
    ) external nonReentrant returns (uint256 amountOut) {
        TradingPair storage pair = tradingPairs[pairId];
        require(pair.isActive, "Pair not active");
        require(amountIn > 0, "Amount must be greater than 0");
        require(pair.reserveA > 0 && pair.reserveB > 0, "Insufficient liquidity");

        // Calculate output amount using constant product formula
        amountOut = _calculateSwapOutput(pairId, amountIn, isAtoB);
        require(amountOut >= minAmountOut, "Slippage too high");

        // Determine input and output tokens
        address tokenIn = isAtoB ? pair.tokenA : pair.tokenB;
        address tokenOut = isAtoB ? pair.tokenB : pair.tokenA;

        // Transfer tokens from user
        MockEERC20(tokenIn).transferFrom(msg.sender, address(this), amountIn);

        // Update reserves
        if (isAtoB) {
            pair.reserveA += amountIn;
            pair.reserveB -= amountOut;
        } else {
            pair.reserveB += amountIn;
            pair.reserveA -= amountOut;
        }

        // Transfer output tokens to user
        MockEERC20(tokenOut).transfer(msg.sender, amountOut);

        // Emit event with encrypted placeholders for privacy
        bytes32 encryptedAmountIn = keccak256(abi.encodePacked(amountIn, msg.sender, block.timestamp));
        bytes32 encryptedAmountOut = keccak256(abi.encodePacked(amountOut, msg.sender, block.timestamp));
        emit PrivateSwap(msg.sender, pairId, encryptedAmountIn, encryptedAmountOut, isAtoB);
    }

    /**
     * @dev Add liquidity to a trading pair
     */
    function addLiquidity(
        bytes32 pairId,
        uint256 amountA,
        uint256 amountB,
        uint256 minLiquidity
    ) external nonReentrant returns (uint256 liquidity) {
        TradingPair storage pair = tradingPairs[pairId];
        require(pair.isActive, "Pair not active");
        require(amountA > 0 && amountB > 0, "Amounts must be greater than 0");

        // Transfer tokens from user
        MockEERC20(pair.tokenA).transferFrom(msg.sender, address(this), amountA);
        MockEERC20(pair.tokenB).transferFrom(msg.sender, address(this), amountB);

        // Calculate liquidity tokens to mint
        if (pair.totalLiquidity == 0) {
            // First liquidity provider
            liquidity = Math.sqrt(amountA * amountB);
            require(liquidity > MINIMUM_LIQUIDITY, "Insufficient liquidity");
            liquidity -= MINIMUM_LIQUIDITY; // Lock minimum liquidity
        } else {
            // Calculate proportional liquidity
            uint256 liquidityA = (amountA * pair.totalLiquidity) / pair.reserveA;
            uint256 liquidityB = (amountB * pair.totalLiquidity) / pair.reserveB;
            liquidity = Math.min(liquidityA, liquidityB);
        }

        require(liquidity >= minLiquidity, "Insufficient liquidity minted");

        // Update reserves and positions
        pair.reserveA += amountA;
        pair.reserveB += amountB;
        pair.totalLiquidity += liquidity;

        liquidityPositions[pairId][msg.sender].liquidity += liquidity;
        liquidityPositions[pairId][msg.sender].lastUpdate = block.timestamp;

        // Emit event with encrypted placeholders for privacy
        bytes32 encryptedAmountA = keccak256(abi.encodePacked(amountA, msg.sender, block.timestamp));
        bytes32 encryptedAmountB = keccak256(abi.encodePacked(amountB, msg.sender, block.timestamp));
        emit LiquidityAdded(msg.sender, pairId, encryptedAmountA, encryptedAmountB, liquidity);
    }

    /**
     * @dev Remove liquidity from a trading pair
     */
    function removeLiquidity(
        bytes32 pairId,
        uint256 liquidityAmount,
        uint256 minAmountA,
        uint256 minAmountB
    ) external nonReentrant returns (uint256 amountA, uint256 amountB) {
        TradingPair storage pair = tradingPairs[pairId];
        require(pair.isActive, "Pair not active");
        require(liquidityAmount > 0, "Liquidity amount must be greater than 0");

        LiquidityPosition storage position = liquidityPositions[pairId][msg.sender];
        require(position.liquidity >= liquidityAmount, "Insufficient liquidity");

        // Calculate proportional amounts to return
        amountA = (liquidityAmount * pair.reserveA) / pair.totalLiquidity;
        amountB = (liquidityAmount * pair.reserveB) / pair.totalLiquidity;

        require(amountA >= minAmountA, "Insufficient amount A");
        require(amountB >= minAmountB, "Insufficient amount B");

        // Update state
        position.liquidity -= liquidityAmount;
        pair.totalLiquidity -= liquidityAmount;
        pair.reserveA -= amountA;
        pair.reserveB -= amountB;

        // Transfer tokens back to user
        MockEERC20(pair.tokenA).transfer(msg.sender, amountA);
        MockEERC20(pair.tokenB).transfer(msg.sender, amountB);

        // Emit event with encrypted placeholders for privacy
        bytes32 encryptedAmountA = keccak256(abi.encodePacked(amountA, msg.sender, block.timestamp));
        bytes32 encryptedAmountB = keccak256(abi.encodePacked(amountB, msg.sender, block.timestamp));
        emit LiquidityRemoved(msg.sender, pairId, encryptedAmountA, encryptedAmountB, liquidityAmount);
    }

    /**
     * @dev Get encrypted balance for a user (mock implementation)
     */
    function getEncryptedBalance(address user, address token) external view returns (uint256) {
        if (supportedTokens[token]) {
            return MockEERC20(token).getEncryptedBalance(user);
        }
        return 0;
    }

    /**
     * @dev Calculate swap output amount (public interface)
     */
    function calculateSwapOutput(
        bytes32 pairId,
        uint256 amountIn,
        bool isAtoB
    ) external view returns (uint256 amountOut) {
        return _calculateSwapOutput(pairId, amountIn, isAtoB);
    }

    /**
     * @dev Get trading pair information
     */
    function getPairInfo(bytes32 pairId) external view returns (TradingPair memory) {
        return tradingPairs[pairId];
    }

    /**
     * @dev Get user's liquidity position
     */
    function getLiquidityPosition(bytes32 pairId, address user) external view returns (LiquidityPosition memory) {
        return liquidityPositions[pairId][user];
    }

    /**
     * @dev Get all trading pairs
     */
    function getAllPairs() external view returns (bytes32[] memory) {
        return allPairs;
    }
}
