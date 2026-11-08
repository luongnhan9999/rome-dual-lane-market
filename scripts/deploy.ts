import { ethers, network } from "hardhat";
import * as fs from "fs";
import * as path from "path";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("=================================================");
  console.log("Rome Protocol - Dual-Lane Prediction & Perps Market");
  console.log("Deploying contracts with account:", deployer.address);
  console.log("Network:", network.name, `(Chain ID: ${network.config.chainId})`);
  console.log("=================================================");

  // Pyth Network Feed IDs
  // BTC/USD Pyth Feed
  const PYTH_BTC_USD = "0xe62df6e07101a35b130e9d8b2e63d773c0a37e4647f0e37b138bee4e9e8c616c";
  // SOL/USD Pyth Feed
  const PYTH_SOL_USD = "0xef0d8b6fda2ceba41da15d4095d1da392a0d2f8ed0c6c7bc0f4cfac8c280b56d";

  // Solana Pyth Program ID (32-byte representation)
  const PYTH_PROGRAM_SOLANA = ethers.keccak256(ethers.toUtf8Bytes("PythProgramSolanaDevnet"));

  // 1. Deploy or resolve Collateral Token (USDC)
  let usdcAddress: string;
  if (network.name === "hadrian") {
    // Hadrian wUSDC / native token or mock deployment
    console.log("\n[1/5] Deploying / Resolving Collateral Token on Hadrian...");
    const MockUSDC = await ethers.getContractFactory("MockUSDC");
    const usdc = await MockUSDC.deploy();
    await usdc.waitForDeployment();
    usdcAddress = await usdc.getAddress();
    console.log("-> Collateral Token (USDC) deployed at:", usdcAddress);
  } else {
    console.log("\n[1/5] Deploying MockUSDC for testing...");
    const MockUSDC = await ethers.getContractFactory("MockUSDC");
    const usdc = await MockUSDC.deploy();
    await usdc.waitForDeployment();
    usdcAddress = await usdc.getAddress();
    console.log("-> MockUSDC deployed at:", usdcAddress);
  }

  // 2. Deploy RomeOracleGateway
  console.log("\n[2/5] Deploying RomeOracleGateway (Solana Pyth Precompile Bridge)...");
  const RomeOracleGateway = await ethers.getContractFactory("RomeOracleGateway");
  const oracleGateway = await RomeOracleGateway.deploy(PYTH_PROGRAM_SOLANA);
  await oracleGateway.waitForDeployment();
  const oracleGatewayAddress = await oracleGateway.getAddress();
  console.log("-> RomeOracleGateway deployed at:", oracleGatewayAddress);

  // Seed initial live prices (8 decimals)
  console.log("-> Seeding initial Pyth oracle benchmark feeds...");
  // BTC/USD: $92,500.00 -> 9250000000000 (8 decimals)
  await (await oracleGateway.updatePrice(
    PYTH_BTC_USD,
    9250000000000n,
    15000000n,
    -8,
    Math.floor(Date.now() / 1000)
  )).wait();

  // SOL/USD: $215.50 -> 21550000000 (8 decimals)
  await (await oracleGateway.updatePrice(
    PYTH_SOL_USD,
    21550000000n,
    5000000n,
    -8,
    Math.floor(Date.now() / 1000)
  )).wait();
  console.log("-> Benchmark Pyth prices initialized for BTC/USD and SOL/USD");

  // 3. Deploy RomeMarketVault
  console.log("\n[3/5] Deploying RomeMarketVault (Shared State Dual-Lane Vault)...");
  const RomeMarketVault = await ethers.getContractFactory("RomeMarketVault");
  const vault = await RomeMarketVault.deploy(usdcAddress);
  await vault.waitForDeployment();
  const vaultAddress = await vault.getAddress();
  console.log("-> RomeMarketVault deployed at:", vaultAddress);

  // 4. Deploy PredictionEngine
  console.log("\n[4/5] Deploying PredictionEngine...");
  const PredictionEngine = await ethers.getContractFactory("PredictionEngine");
  const predictionEngine = await PredictionEngine.deploy(vaultAddress, oracleGatewayAddress);
  await predictionEngine.waitForDeployment();
  const predictionEngineAddress = await predictionEngine.getAddress();
  console.log("-> PredictionEngine deployed at:", predictionEngineAddress);

  // 5. Deploy PerpsPositionManager
  console.log("\n[5/5] Deploying PerpsPositionManager (10x Margin Engine)...");
  const PerpsPositionManager = await ethers.getContractFactory("PerpsPositionManager");
  const perps = await PerpsPositionManager.deploy(vaultAddress, oracleGatewayAddress);
  await perps.waitForDeployment();
  const perpsAddress = await perps.getAddress();
  console.log("-> PerpsPositionManager deployed at:", perpsAddress);

  // Authorize Market Engines in Vault
  console.log("\n-> Authorizing PredictionEngine & PerpsPositionManager in Vault...");
  await (await vault.setMarketAuthorization(predictionEngineAddress, true)).wait();
  await (await vault.setMarketAuthorization(perpsAddress, true)).wait();
  console.log("-> Authorization confirmed!");

  // Create an initial prediction market
  console.log("\n-> Initializing first flagship prediction market...");
  const oneWeekInSeconds = 7 * 24 * 3600;
  const expiryTime = Math.floor(Date.now() / 1000) + oneWeekInSeconds;
  const txCreate = await predictionEngine.createMarket(
    "Will BTC break $100,000 before resolution?",
    PYTH_BTC_USD,
    10000000000000n, // $100,000 (8 decimals)
    0, // GREATER_OR_EQUAL
    expiryTime
  );
  await txCreate.wait();
  console.log("-> Market #1 created successfully: 'Will BTC break $100,000?'");

  const deploymentData = {
    network: network.name,
    chainId: network.config.chainId,
    deployer: deployer.address,
    timestamp: new Date().toISOString(),
    contracts: {
      USDC: usdcAddress,
      RomeOracleGateway: oracleGatewayAddress,
      RomeMarketVault: vaultAddress,
      PredictionEngine: predictionEngineAddress,
      PerpsPositionManager: perpsAddress,
    },
    feeds: {
      PYTH_BTC_USD,
      PYTH_SOL_USD,
    },
    precompiles: {
      CPI_PROGRAM: "0xFF00000000000000000000000000000000000008",
      SYSTEM_PROGRAM: "0xFF00000000000000000000000000000000000007",
      HELPER_PROGRAM: "0xFF00000000000000000000000000000000000009",
    },
  };

  // Write deployment data to root and frontend config
  const outputPath = path.join(__dirname, "..", "deployed-addresses.json");
  fs.writeFileSync(outputPath, JSON.stringify(deploymentData, null, 2));
  console.log("\n-> Deployment summary saved to:", outputPath);

  const frontendConfigDir = path.join(__dirname, "..", "frontend", "src", "config");
  if (!fs.existsSync(frontendConfigDir)) {
    fs.mkdirSync(frontendConfigDir, { recursive: true });
  }
  fs.writeFileSync(
    path.join(frontendConfigDir, "contracts.json"),
    JSON.stringify(deploymentData, null, 2)
  );
  console.log("-> Frontend config synchronized:", path.join(frontendConfigDir, "contracts.json"));

  console.log("\n=================================================");
  console.log("DEPLOYMENT COMPLETE! Ready for Arena Registration");
  console.log("Register on Arena: https://arena.mainnet.romeprotocol.xyz/apps/new");
  console.log("Verify on Hadrian: rome verify hadrian --path solidity");
  console.log("=================================================");
}

main().catch((error) => {
  console.error("Deployment failed:", error);
  process.exitCode = 1;
});
