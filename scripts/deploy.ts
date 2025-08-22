import { ethers } from "hardhat";

async function main() {
  console.log("🚀 Starting Private DEX deployment...");

  // Get the deployer account using private key from environment
  const privateKey = process.env.PRIVATE_KEY;
  if (!privateKey) {
    throw new Error("PRIVATE_KEY not found in environment variables");
  }

  const deployer = new ethers.Wallet(privateKey, ethers.provider);
  const deployerAddress = await deployer.getAddress();
  console.log("Deploying contracts with account:", deployerAddress);
  console.log("Account balance:", ethers.formatEther(await ethers.provider.getBalance(deployerAddress)));

  // Deploy MockEERC20 tokens for testing
  console.log("\n📄 Deploying Mock eERC20 tokens...");
  
  const MockEERC20 = await ethers.getContractFactory("MockEERC20");
  
  const tokenA = await MockEERC20.deploy(
    "Private Token A",
    "PTA",
    ethers.parseEther("1000000") // 1M tokens
  );
  await tokenA.waitForDeployment();
  console.log("Token A deployed to:", await tokenA.getAddress());

  const tokenB = await MockEERC20.deploy(
    "Private Token B", 
    "PTB",
    ethers.parseEther("1000000") // 1M tokens
  );
  await tokenB.waitForDeployment();
  console.log("Token B deployed to:", await tokenB.getAddress());

  // Deploy LiquidityPool
  console.log("\n💧 Deploying LiquidityPool...");
  const LiquidityPool = await ethers.getContractFactory("LiquidityPool");
  const liquidityPool = await LiquidityPool.deploy();
  await liquidityPool.waitForDeployment();
  console.log("LiquidityPool deployed to:", await liquidityPool.getAddress());

  // Deploy PrivateDEX
  console.log("\n🔄 Deploying PrivateDEX...");
  const PrivateDEX = await ethers.getContractFactory("PrivateDEX");
  const privateDEX = await PrivateDEX.deploy();
  await privateDEX.waitForDeployment();
  console.log("PrivateDEX deployed to:", await privateDEX.getAddress());

  // Deploy PrivateSwapRouter
  console.log("\n🛣️  Deploying PrivateSwapRouter...");
  const PrivateSwapRouter = await ethers.getContractFactory("PrivateSwapRouter");
  const swapRouter = await PrivateSwapRouter.deploy(
    await privateDEX.getAddress(),
    await liquidityPool.getAddress()
  );
  await swapRouter.waitForDeployment();
  console.log("PrivateSwapRouter deployed to:", await swapRouter.getAddress());

  // Setup initial configuration
  console.log("\n⚙️  Setting up initial configuration...");

  // Add supported tokens to PrivateDEX
  await privateDEX.addSupportedToken(await tokenA.getAddress());
  await privateDEX.addSupportedToken(await tokenB.getAddress());
  console.log("✅ Added supported tokens to PrivateDEX");

  // Authorize tokens in LiquidityPool
  await liquidityPool.authorizeToken(await tokenA.getAddress());
  await liquidityPool.authorizeToken(await tokenB.getAddress());
  console.log("✅ Authorized tokens in LiquidityPool");

  // Authorize tokens in SwapRouter
  await swapRouter.authorizeToken(await tokenA.getAddress());
  await swapRouter.authorizeToken(await tokenB.getAddress());
  console.log("✅ Authorized tokens in SwapRouter");

  // Create a trading pair
  const fee = 30; // 0.3%
  const createPairTx = await privateDEX.createPair(
    await tokenA.getAddress(),
    await tokenB.getAddress(),
    fee
  );
  const receipt = await createPairTx.wait();
  
  // Get the pair ID from the event
  const pairCreatedEvent = receipt?.logs.find(
    log => log.topics[0] === privateDEX.interface.getEvent("PairCreated")?.topicHash
  );
  
  let pairId: string = "";
  if (pairCreatedEvent) {
    const decodedEvent = privateDEX.interface.parseLog({
      topics: pairCreatedEvent.topics,
      data: pairCreatedEvent.data
    });
    pairId = decodedEvent?.args[2]; // pairId is the third argument
  }
  
  console.log("✅ Created trading pair with ID:", pairId);

  // Create a liquidity pool
  const poolTx = await liquidityPool.createPool(
    await tokenA.getAddress(),
    await tokenB.getAddress(),
    fee
  );
  const poolReceipt = await poolTx.wait();

  // Get the pool ID from the event
  const poolCreatedEvent = poolReceipt?.logs.find(
    log => log.topics[0] === liquidityPool.interface.getEvent("PoolCreated")?.topicHash
  );

  let poolId: string = "";
  if (poolCreatedEvent) {
    const decodedEvent = liquidityPool.interface.parseLog({
      topics: poolCreatedEvent.topics,
      data: poolCreatedEvent.data
    });
    poolId = decodedEvent?.args[0]; // poolId is the first argument
  }

  console.log("✅ Created liquidity pool with ID:", poolId);

  // Authorize the pool in SwapRouter
  if (poolId) {
    await swapRouter.authorizePool(poolId);
    console.log("✅ Authorized pool in SwapRouter");
  }

  // Mint some tokens to deployer for testing and add initial liquidity
  const initialLiquidityA = ethers.parseEther("10000");
  const initialLiquidityB = ethers.parseEther("20000");

  await tokenA.mint(deployer.address, initialLiquidityA * 2n); // Extra for testing
  await tokenB.mint(deployer.address, initialLiquidityB * 2n); // Extra for testing
  console.log("✅ Minted test tokens to deployer");

  // Add initial liquidity to the DEX
  await tokenA.approve(await privateDEX.getAddress(), initialLiquidityA);
  await tokenB.approve(await privateDEX.getAddress(), initialLiquidityB);

  await privateDEX.addLiquidity(pairId, initialLiquidityA, initialLiquidityB, 1);
  console.log("✅ Added initial liquidity to DEX");

  // Also add liquidity to the LiquidityPool
  await tokenA.approve(await liquidityPool.getAddress(), initialLiquidityA);
  await tokenB.approve(await liquidityPool.getAddress(), initialLiquidityB);

  if (poolId) {
    await liquidityPool.addLiquidity(poolId, initialLiquidityA, initialLiquidityB, 1);
    console.log("✅ Added initial liquidity to LiquidityPool");
  }

  // Summary
  console.log("\n🎉 Deployment completed successfully!");
  console.log("\n📋 Contract Addresses:");
  console.log("==========================================");
  console.log("Token A (PTA):", await tokenA.getAddress());
  console.log("Token B (PTB):", await tokenB.getAddress());
  console.log("LiquidityPool:", await liquidityPool.getAddress());
  console.log("PrivateDEX:", await privateDEX.getAddress());
  console.log("PrivateSwapRouter:", await swapRouter.getAddress());
  console.log("==========================================");
  console.log("Trading Pair ID:", pairId);
  console.log("Liquidity Pool ID:", poolId);
  console.log("==========================================");

  // Save deployment info to a file
  const deploymentInfo = {
    network: "localhost", // Will be updated based on actual network
    timestamp: new Date().toISOString(),
    deployer: deployer.address,
    contracts: {
      tokenA: await tokenA.getAddress(),
      tokenB: await tokenB.getAddress(),
      liquidityPool: await liquidityPool.getAddress(),
      privateDEX: await privateDEX.getAddress(),
      privateSwapRouter: await swapRouter.getAddress()
    },
    pairs: {
      pairId: pairId,
      poolId: poolId
    }
  };

  console.log("\n💾 Deployment info saved for frontend integration");
  console.log(JSON.stringify(deploymentInfo, null, 2));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  });
