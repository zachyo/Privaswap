import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { expect } from "chai";
import { ethers } from "hardhat";

describe("PrivateDEX", function () {
  // Fixture to deploy all contracts
  async function deployPrivateDEXFixture() {
    const [owner, user1, user2] = await ethers.getSigners();

    // Deploy MockEERC20 tokens
    const MockEERC20 = await ethers.getContractFactory("MockEERC20");
    const tokenA = await MockEERC20.deploy("Token A", "TKA", ethers.parseEther("1000000"));
    const tokenB = await MockEERC20.deploy("Token B", "TKB", ethers.parseEther("1000000"));

    // Deploy LiquidityPool
    const LiquidityPool = await ethers.getContractFactory("LiquidityPool");
    const liquidityPool = await LiquidityPool.deploy();

    // Deploy PrivateDEX
    const PrivateDEX = await ethers.getContractFactory("PrivateDEX");
    const privateDEX = await PrivateDEX.deploy();

    // Deploy PrivateSwapRouter
    const PrivateSwapRouter = await ethers.getContractFactory("PrivateSwapRouter");
    const swapRouter = await PrivateSwapRouter.deploy(
      await privateDEX.getAddress(),
      await liquidityPool.getAddress()
    );

    return {
      owner,
      user1,
      user2,
      tokenA,
      tokenB,
      liquidityPool,
      privateDEX,
      swapRouter
    };
  }

  describe("Deployment", function () {
    it("Should deploy all contracts successfully", async function () {
      const { tokenA, tokenB, liquidityPool, privateDEX, swapRouter } = await loadFixture(deployPrivateDEXFixture);

      expect(await tokenA.getAddress()).to.not.equal(ethers.ZeroAddress);
      expect(await tokenB.getAddress()).to.not.equal(ethers.ZeroAddress);
      expect(await liquidityPool.getAddress()).to.not.equal(ethers.ZeroAddress);
      expect(await privateDEX.getAddress()).to.not.equal(ethers.ZeroAddress);
      expect(await swapRouter.getAddress()).to.not.equal(ethers.ZeroAddress);
    });

    it("Should set the correct owner", async function () {
      const { owner, privateDEX } = await loadFixture(deployPrivateDEXFixture);
      expect(await privateDEX.owner()).to.equal(owner.address);
    });
  });

  describe("Token Management", function () {
    it("Should add supported tokens", async function () {
      const { tokenA, tokenB, privateDEX } = await loadFixture(deployPrivateDEXFixture);

      await privateDEX.addSupportedToken(await tokenA.getAddress());
      await privateDEX.addSupportedToken(await tokenB.getAddress());

      expect(await privateDEX.supportedTokens(await tokenA.getAddress())).to.be.true;
      expect(await privateDEX.supportedTokens(await tokenB.getAddress())).to.be.true;
    });

    it("Should remove supported tokens", async function () {
      const { tokenA, privateDEX } = await loadFixture(deployPrivateDEXFixture);

      await privateDEX.addSupportedToken(await tokenA.getAddress());
      expect(await privateDEX.supportedTokens(await tokenA.getAddress())).to.be.true;

      await privateDEX.removeSupportedToken(await tokenA.getAddress());
      expect(await privateDEX.supportedTokens(await tokenA.getAddress())).to.be.false;
    });
  });

  describe("Trading Pairs", function () {
    it("Should create a trading pair", async function () {
      const { tokenA, tokenB, privateDEX } = await loadFixture(deployPrivateDEXFixture);

      // Add supported tokens first
      await privateDEX.addSupportedToken(await tokenA.getAddress());
      await privateDEX.addSupportedToken(await tokenB.getAddress());

      const fee = 30; // 0.3%
      const tx = await privateDEX.createPair(await tokenA.getAddress(), await tokenB.getAddress(), fee);
      const receipt = await tx.wait();

      // Check if PairCreated event was emitted
      const pairCreatedEvent = receipt?.logs.find(
        log => log.topics[0] === privateDEX.interface.getEvent("PairCreated")?.topicHash
      );
      expect(pairCreatedEvent).to.not.be.undefined;
    });

    it("Should not create pair with identical tokens", async function () {
      const { tokenA, privateDEX } = await loadFixture(deployPrivateDEXFixture);

      await privateDEX.addSupportedToken(await tokenA.getAddress());

      await expect(
        privateDEX.createPair(await tokenA.getAddress(), await tokenA.getAddress(), 30)
      ).to.be.revertedWith("Identical tokens");
    });

    it("Should not create pair with unsupported tokens", async function () {
      const { tokenA, tokenB, privateDEX } = await loadFixture(deployPrivateDEXFixture);

      await expect(
        privateDEX.createPair(await tokenA.getAddress(), await tokenB.getAddress(), 30)
      ).to.be.revertedWith("Unsupported tokens");
    });
  });

  describe("MockEERC20", function () {
    it("Should mint tokens", async function () {
      const { tokenA, user1 } = await loadFixture(deployPrivateDEXFixture);

      const amount = ethers.parseEther("1000");
      await tokenA.mint(user1.address, amount);

      expect(await tokenA.balanceOf(user1.address)).to.equal(amount);
    });

    it("Should handle encrypted operations", async function () {
      const { tokenA, user1, owner } = await loadFixture(deployPrivateDEXFixture);

      // Register users for eERC20 operations
      const publicKey1 = ethers.keccak256(ethers.toUtf8Bytes("owner_pubkey"));
      const publicKey2 = ethers.keccak256(ethers.toUtf8Bytes("user1_pubkey"));

      await tokenA.connect(owner).registerUser(publicKey1);
      await tokenA.connect(user1).registerUser(publicKey2);

      // Verify registration
      expect(await tokenA.isUserRegistered(owner.address)).to.be.true;
      expect(await tokenA.getUserPublicKey(owner.address)).to.equal(publicKey1);

      // Mint some tokens and deposit to encrypted balance
      const amount = ethers.parseEther("100");
      await tokenA.mint(owner.address, amount);
      await tokenA.connect(owner).deposit(amount, 12345);

      // Transfer encrypted tokens using legacy function (3 params)
      const transferAmount = ethers.parseEther("50");
      const nonce = 67890;

      await expect(tokenA.encryptedTransferLegacy(user1.address, transferAmount, nonce))
        .to.emit(tokenA, "EncryptedTransfer")
        .and.to.emit(tokenA, "EncryptedOperation");

      // Check encrypted balances
      expect(await tokenA.getEncryptedBalance(owner.address)).to.equal(amount - transferAmount);
      expect(await tokenA.getEncryptedBalance(user1.address)).to.equal(transferAmount);
    });

    it("Should deposit and withdraw tokens", async function () {
      const { tokenA, user1 } = await loadFixture(deployPrivateDEXFixture);

      // Register user for eERC20 operations
      const publicKey = ethers.keccak256(ethers.toUtf8Bytes("user1_pubkey"));
      await tokenA.connect(user1).registerUser(publicKey);

      // Mint tokens to user1
      const amount = ethers.parseEther("1000");
      await tokenA.mint(user1.address, amount);

      // Deposit tokens using eERC20-compliant function
      const depositNonce = 12345;
      await tokenA.connect(user1).depositToEncrypted(amount, depositNonce);
      expect(await tokenA.balanceOf(user1.address)).to.equal(0);
      expect(await tokenA.getEncryptedBalance(user1.address)).to.equal(amount);

      // Withdraw tokens using eERC20-compliant function
      const withdrawNonce = 67890;
      await tokenA.connect(user1).withdrawFromEncrypted(amount, withdrawNonce);
      expect(await tokenA.balanceOf(user1.address)).to.equal(amount);
      expect(await tokenA.getEncryptedBalance(user1.address)).to.equal(0);
    });

    it("Should handle eERC20 registration and auditor system", async function () {
      const { tokenA, user1, user2, owner } = await loadFixture(deployPrivateDEXFixture);

      // Test user registration
      const publicKey1 = ethers.keccak256(ethers.toUtf8Bytes("user1_pubkey"));
      await tokenA.connect(user1).registerUser(publicKey1);

      expect(await tokenA.isUserRegistered(user1.address)).to.be.true;
      expect(await tokenA.getUserPublicKey(user1.address)).to.equal(publicKey1);

      // Test auditor system
      await tokenA.connect(owner).authorizeAuditor(user2.address);
      expect(await tokenA.authorizedAuditors(user2.address)).to.be.true;

      // Set up encrypted balance for auditor testing
      await tokenA.setEncryptedBalance(user1.address, ethers.parseEther("500"));

      // Test auditor access to encrypted balances
      const encryptedBalance = await tokenA.connect(user2).getEncryptedBalanceForAuditor(user1.address);
      expect(encryptedBalance).to.equal(ethers.parseEther("500"));

      // Test non-auditor cannot access
      await expect(tokenA.connect(user1).getEncryptedBalanceForAuditor(user1.address))
        .to.be.revertedWith("Not authorized auditor");
    });
  });

  describe("LiquidityPool", function () {
    it("Should create a pool", async function () {
      const { tokenA, tokenB, liquidityPool } = await loadFixture(deployPrivateDEXFixture);

      // Authorize tokens
      await liquidityPool.authorizeToken(await tokenA.getAddress());
      await liquidityPool.authorizeToken(await tokenB.getAddress());

      const fee = 30;
      const tx = await liquidityPool.createPool(await tokenA.getAddress(), await tokenB.getAddress(), fee);
      const receipt = await tx.wait();

      // Check if PoolCreated event was emitted
      const poolCreatedEvent = receipt?.logs.find(
        log => log.topics[0] === liquidityPool.interface.getEvent("PoolCreated")?.topicHash
      );
      expect(poolCreatedEvent).to.not.be.undefined;
    });

    it("Should add liquidity", async function () {
      const { tokenA, tokenB, liquidityPool, user1 } = await loadFixture(deployPrivateDEXFixture);

      // Setup
      await liquidityPool.authorizeToken(await tokenA.getAddress());
      await liquidityPool.authorizeToken(await tokenB.getAddress());

      const fee = 30;
      const tx = await liquidityPool.createPool(await tokenA.getAddress(), await tokenB.getAddress(), fee);
      const receipt = await tx.wait();

      // Get pool ID from event
      const poolCreatedEvent = receipt?.logs.find(
        log => log.topics[0] === liquidityPool.interface.getEvent("PoolCreated")?.topicHash
      );
      const decodedEvent = liquidityPool.interface.parseLog({
        topics: poolCreatedEvent!.topics,
        data: poolCreatedEvent!.data
      });
      const poolId = decodedEvent?.args[0];

      // Mint tokens to user
      const amountA = ethers.parseEther("1000");
      const amountB = ethers.parseEther("2000");

      await tokenA.mint(user1.address, amountA);
      await tokenB.mint(user1.address, amountB);

      await tokenA.connect(user1).approve(await liquidityPool.getAddress(), amountA);
      await tokenB.connect(user1).approve(await liquidityPool.getAddress(), amountB);

      // Add liquidity
      await expect(liquidityPool.connect(user1).addLiquidity(poolId, amountA, amountB, 1))
        .to.emit(liquidityPool, "LiquidityDeposited");
    });
  });

  describe("Real Swap Functionality", function () {
    it("Should execute real token swaps", async function () {
      const { tokenA, tokenB, privateDEX, user1 } = await loadFixture(deployPrivateDEXFixture);

      // Setup
      await privateDEX.addSupportedToken(await tokenA.getAddress());
      await privateDEX.addSupportedToken(await tokenB.getAddress());

      // Create pair
      const fee = 30; // 0.3%
      const pairTx = await privateDEX.createPair(await tokenA.getAddress(), await tokenB.getAddress(), fee);
      const pairReceipt = await pairTx.wait();

      // Get pair ID
      const pairCreatedEvent = pairReceipt?.logs.find(
        log => log.topics[0] === privateDEX.interface.getEvent("PairCreated")?.topicHash
      );
      const decodedEvent = privateDEX.interface.parseLog({
        topics: pairCreatedEvent!.topics,
        data: pairCreatedEvent!.data
      });
      const pairId = decodedEvent?.args[2];

      // Mint tokens and add liquidity
      const liquidityA = ethers.parseEther("1000");
      const liquidityB = ethers.parseEther("2000");

      await tokenA.mint(user1.address, liquidityA);
      await tokenB.mint(user1.address, liquidityB);

      await tokenA.connect(user1).approve(await privateDEX.getAddress(), liquidityA);
      await tokenB.connect(user1).approve(await privateDEX.getAddress(), liquidityB);

      // Add initial liquidity
      await privateDEX.connect(user1).addLiquidity(pairId, liquidityA, liquidityB, 1);

      // Mint additional tokens to user for swapping
      const swapAmount = ethers.parseEther("100");
      await tokenA.mint(user1.address, swapAmount);
      await tokenA.connect(user1).approve(await privateDEX.getAddress(), swapAmount);

      // Execute swap
      const minAmountOut = ethers.parseEther("150"); // Expecting ~199 tokens out
      const tx = await privateDEX.connect(user1).swapTokens(pairId, swapAmount, minAmountOut, true);
      const receipt = await tx.wait();

      // Verify swap occurred by checking event
      const swapEvent = receipt?.logs.find(
        log => log.topics[0] === privateDEX.interface.getEvent("PrivateSwap")?.topicHash
      );
      expect(swapEvent).to.not.be.undefined;
    });

    it("Should add and remove liquidity", async function () {
      const { tokenA, tokenB, privateDEX, user1 } = await loadFixture(deployPrivateDEXFixture);

      // Setup
      await privateDEX.addSupportedToken(await tokenA.getAddress());
      await privateDEX.addSupportedToken(await tokenB.getAddress());

      // Create pair
      const fee = 30;
      const pairTx = await privateDEX.createPair(await tokenA.getAddress(), await tokenB.getAddress(), fee);
      const pairReceipt = await pairTx.wait();

      const pairCreatedEvent = pairReceipt?.logs.find(
        log => log.topics[0] === privateDEX.interface.getEvent("PairCreated")?.topicHash
      );
      const decodedEvent = privateDEX.interface.parseLog({
        topics: pairCreatedEvent!.topics,
        data: pairCreatedEvent!.data
      });
      const pairId = decodedEvent?.args[2];

      // Mint tokens to user
      const amountA = ethers.parseEther("1000");
      const amountB = ethers.parseEther("2000");

      await tokenA.mint(user1.address, amountA);
      await tokenB.mint(user1.address, amountB);

      await tokenA.connect(user1).approve(await privateDEX.getAddress(), amountA);
      await tokenB.connect(user1).approve(await privateDEX.getAddress(), amountB);

      // Add liquidity
      const liquidity = await privateDEX.connect(user1).addLiquidity(pairId, amountA, amountB, 1);

      // Check liquidity position
      const position = await privateDEX.getLiquidityPosition(pairId, user1.address);
      expect(position.liquidity).to.be.gt(0);

      // Remove liquidity
      await privateDEX.connect(user1).removeLiquidity(pairId, position.liquidity, 1, 1);

      // Check position is cleared
      const newPosition = await privateDEX.getLiquidityPosition(pairId, user1.address);
      expect(newPosition.liquidity).to.equal(0);
    });
  });

  describe("Integration", function () {
    it("Should setup complete DEX system", async function () {
      const { tokenA, tokenB, liquidityPool, privateDEX, swapRouter } = await loadFixture(deployPrivateDEXFixture);

      // Setup tokens
      await privateDEX.addSupportedToken(await tokenA.getAddress());
      await privateDEX.addSupportedToken(await tokenB.getAddress());
      await liquidityPool.authorizeToken(await tokenA.getAddress());
      await liquidityPool.authorizeToken(await tokenB.getAddress());
      await swapRouter.authorizeToken(await tokenA.getAddress());
      await swapRouter.authorizeToken(await tokenB.getAddress());

      // Create pair and pool
      const fee = 30;
      await privateDEX.createPair(await tokenA.getAddress(), await tokenB.getAddress(), fee);
      const poolTx = await liquidityPool.createPool(await tokenA.getAddress(), await tokenB.getAddress(), fee);
      const poolReceipt = await poolTx.wait();

      // Get pool ID and authorize it
      const poolCreatedEvent = poolReceipt?.logs.find(
        log => log.topics[0] === liquidityPool.interface.getEvent("PoolCreated")?.topicHash
      );
      const decodedEvent = liquidityPool.interface.parseLog({
        topics: poolCreatedEvent!.topics,
        data: poolCreatedEvent!.data
      });
      const poolId = decodedEvent?.args[0];

      await swapRouter.authorizePool(poolId);

      // Verify setup
      expect(await privateDEX.supportedTokens(await tokenA.getAddress())).to.be.true;
      expect(await liquidityPool.authorizedTokens(await tokenA.getAddress())).to.be.true;
      expect(await swapRouter.authorizedTokens(await tokenA.getAddress())).to.be.true;
      expect(await swapRouter.authorizedPools(poolId)).to.be.true;
    });
  });
});
