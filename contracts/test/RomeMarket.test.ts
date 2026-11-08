import { expect } from "chai";
import { ethers } from "hardhat";
import { RomeMarketVault, PredictionEngine, PerpsPositionManager, RomeOracleGateway, MockUSDC } from "../../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

describe("Rome Dual-Lane Prediction & Perps Market", function () {
  let deployer: SignerWithAddress;
  let evmUser: SignerWithAddress;
  let liquidatorKeeper: SignerWithAddress;

  let usdc: MockUSDC;
  let vault: RomeMarketVault;
  let oracleGateway: RomeOracleGateway;
  let predictionEngine: PredictionEngine;
  let perpsManager: PerpsPositionManager;

  const PYTH_BTC_USD = "0xe62df6e07101a35b130e9d8b2e63d773c0a37e4647f0e37b138bee4e9e8c616c";
  const PYTH_SOL_USD = "0xef0d8b6fda2ceba41da15d4095d1da392a0d2f8ed0c6c7bc0f4cfac8c280b56d";

  // Simulated Solana Public Key (32 bytes) - e.g., Phantom wallet user
  const SOLANA_USER_PUBKEY = "0x9876543210abcdef9876543210abcdef9876543210abcdef9876543210abcdef";

  beforeEach(async function () {
    [deployer, evmUser, liquidatorKeeper] = await ethers.getSigners();

    // 1. Deploy Collateral Token
    const MockUSDCFactory = await ethers.getContractFactory("MockUSDC");
    usdc = await MockUSDCFactory.deploy();
    await usdc.waitForDeployment();

    // Distribute USDC
    await usdc.mint(evmUser.address, ethers.parseUnits("10000", 6));
    await usdc.mint(deployer.address, ethers.parseUnits("10000", 6));

    // 2. Deploy Oracle Gateway
    const OracleGatewayFactory = await ethers.getContractFactory("RomeOracleGateway");
    oracleGateway = await OracleGatewayFactory.deploy(ethers.ZeroHash);
    await oracleGateway.waitForDeployment();

    // Set initial Pyth feed prices (8 decimals)
    // BTC: $90,000
    await oracleGateway.updatePrice(PYTH_BTC_USD, 9000000000000n, 10000000n, -8, Math.floor(Date.now() / 1000));
    // SOL: $200.00
    await oracleGateway.updatePrice(PYTH_SOL_USD, 20000000000n, 5000000n, -8, Math.floor(Date.now() / 1000));

    // 3. Deploy Shared-State Vault
    const VaultFactory = await ethers.getContractFactory("RomeMarketVault");
    vault = await VaultFactory.deploy(await usdc.getAddress());
    await vault.waitForDeployment();

    // 4. Deploy Market Engines
    const PredictionEngineFactory = await ethers.getContractFactory("PredictionEngine");
    predictionEngine = await PredictionEngineFactory.deploy(
      await vault.getAddress(),
      await oracleGateway.getAddress()
    );
    await predictionEngine.waitForDeployment();

    const PerpsManagerFactory = await ethers.getContractFactory("PerpsPositionManager");
    perpsManager = await PerpsManagerFactory.deploy(
      await vault.getAddress(),
      await oracleGateway.getAddress()
    );
    await perpsManager.waitForDeployment();

    // Authorize markets in vault
    await vault.setMarketAuthorization(await predictionEngine.getAddress(), true);
    await vault.setMarketAuthorization(await perpsManager.getAddress(), true);
  });

  describe("1. Shared-State Collateral Vault (Dual-Lane: EVM + Solana)", function () {
    it("Should accept deposits for both EVM addresses and Solana public keys", async function () {
      const depositAmount = ethers.parseUnits("1000", 6);

      // A. EVM User Deposit
      const evmAccountId = await vault.evmToAccountId(evmUser.address);
      await usdc.connect(evmUser).approve(await vault.getAddress(), depositAmount);
      await vault.connect(evmUser).depositCollateral(evmAccountId, depositAmount);

      expect(await vault.collateralBalances(evmAccountId)).to.equal(depositAmount);
      expect(await vault.getAvailableCollateral(evmAccountId)).to.equal(depositAmount);

      // B. Solana User Deposit (routed through bridge / relayer envelope into shared state)
      await usdc.connect(deployer).approve(await vault.getAddress(), depositAmount);
      await vault.connect(deployer).depositCollateral(SOLANA_USER_PUBKEY, depositAmount);

      expect(await vault.collateralBalances(SOLANA_USER_PUBKEY)).to.equal(depositAmount);
      expect(await vault.getAvailableCollateral(SOLANA_USER_PUBKEY)).to.equal(depositAmount);
    });

    it("Should allow withdrawal of unlocked collateral", async function () {
      const depositAmount = ethers.parseUnits("500", 6);
      const evmAccountId = await vault.evmToAccountId(evmUser.address);

      await usdc.connect(evmUser).approve(await vault.getAddress(), depositAmount);
      await vault.connect(evmUser).depositCollateral(evmAccountId, depositAmount);

      const withdrawAmount = ethers.parseUnits("200", 6);
      await vault.connect(evmUser).withdrawCollateral(evmAccountId, withdrawAmount, evmUser.address);

      expect(await vault.collateralBalances(evmAccountId)).to.equal(ethers.parseUnits("300", 6));
    });
  });

  describe("2. Prediction Market Engine (Shared State & Oracle Settlement)", function () {
    let marketId: bigint;
    const expiryOffset = 3600; // 1 hour

    beforeEach(async function () {
      // Deposit collateral for EVM and Solana user
      const depositAmount = ethers.parseUnits("1000", 6);
      const evmAccountId = await vault.evmToAccountId(evmUser.address);

      await usdc.connect(evmUser).approve(await vault.getAddress(), depositAmount);
      await vault.connect(evmUser).depositCollateral(evmAccountId, depositAmount);

      await usdc.connect(deployer).approve(await vault.getAddress(), depositAmount);
      await vault.connect(deployer).depositCollateral(SOLANA_USER_PUBKEY, depositAmount);

      // Create Prediction Market: Will BTC >= $95,000?
      const blockTimestamp = (await ethers.provider.getBlock("latest"))!.timestamp;
      const expiry = blockTimestamp + expiryOffset;

      const tx = await predictionEngine.createMarket(
        "Will BTC break $95,000 before expiry?",
        PYTH_BTC_USD,
        9500000000000n, // $95,000 (8 decimals)
        0, // GREATER_OR_EQUAL
        expiry
      );
      await tx.wait();
      marketId = 1n;
    });

    it("Should allow EVM and Solana accounts to buy opposite shares in the same market", async function () {
      const evmAccountId = await vault.evmToAccountId(evmUser.address);
      const tradeAmount = ethers.parseUnits("200", 6);

      // EVM user buys YES
      await predictionEngine.connect(evmUser).buyShares(marketId, evmAccountId, true, tradeAmount);
      expect(await predictionEngine.yesShares(marketId, evmAccountId)).to.equal(tradeAmount);

      // Solana user buys NO
      await predictionEngine.buyShares(marketId, SOLANA_USER_PUBKEY, false, tradeAmount);
      expect(await predictionEngine.noShares(marketId, SOLANA_USER_PUBKEY)).to.equal(tradeAmount);

      const market = await predictionEngine.getMarket(marketId);
      expect(market.totalPool).to.equal(tradeAmount * 2n);
    });

    it("Should resolve market via Pyth Oracle price and pay winners", async function () {
      const evmAccountId = await vault.evmToAccountId(evmUser.address);
      const tradeAmount = ethers.parseUnits("200", 6);

      // EVM user buys YES ($200)
      await predictionEngine.connect(evmUser).buyShares(marketId, evmAccountId, true, tradeAmount);

      // Solana user buys NO ($200)
      await predictionEngine.buyShares(marketId, SOLANA_USER_PUBKEY, false, tradeAmount);

      // Advance time past expiry
      await ethers.provider.send("evm_increaseTime", [expiryOffset + 10]);
      await ethers.provider.send("evm_mine", []);

      // Pyth Oracle updates BTC price to $98,000 (>= $95,000 -> YES wins)
      await oracleGateway.updatePrice(PYTH_BTC_USD, 9800000000000n, 5000000n, -8, Math.floor(Date.now() / 1000));

      // Resolve Market
      await predictionEngine.resolveMarket(marketId);
      const market = await predictionEngine.getMarket(marketId);
      expect(market.resolved).to.be.true;
      expect(market.outcome).to.be.true; // YES won

      // EVM user claims winnings
      const balanceBefore = await vault.collateralBalances(evmAccountId);
      await predictionEngine.claimWinnings(marketId, evmAccountId);
      const balanceAfter = await vault.collateralBalances(evmAccountId);

      // EVM user receives full pool of $400
      expect(balanceAfter - balanceBefore).to.equal(tradeAmount * 2n);
    });
  });

  describe("3. Perpetual Margin Engine (10x Leverage & Liquidation)", function () {
    const margin = ethers.parseUnits("100", 6); // $100 margin
    const leverage = 5n; // 5x leverage -> $500 size

    beforeEach(async function () {
      const depositAmount = ethers.parseUnits("1000", 6);
      const evmAccountId = await vault.evmToAccountId(evmUser.address);

      await usdc.connect(evmUser).approve(await vault.getAddress(), depositAmount);
      await vault.connect(evmUser).depositCollateral(evmAccountId, depositAmount);
    });

    it("Should open a 5x long position and lock margin", async function () {
      const evmAccountId = await vault.evmToAccountId(evmUser.address);

      const tx = await perpsManager.connect(evmUser).openPosition(
        evmAccountId,
        PYTH_BTC_USD,
        true, // Long
        margin,
        leverage
      );
      await tx.wait();

      const pos = await perpsManager.getPosition(1);
      expect(pos.isOpen).to.be.true;
      expect(pos.isLong).to.be.true;
      expect(pos.margin).to.equal(margin);
      expect(pos.size).to.equal(margin * leverage);
      expect(pos.entryPrice).to.equal(9000000000000n); // $90,000 entry

      // Locked collateral should match margin
      expect(await vault.lockedBalances(evmAccountId)).to.equal(margin);
    });

    it("Should calculate profit and settle collateral upon closing in profit", async function () {
      const evmAccountId = await vault.evmToAccountId(evmUser.address);

      await perpsManager.connect(evmUser).openPosition(
        evmAccountId,
        PYTH_BTC_USD,
        true, // Long
        margin,
        leverage
      );

      // BTC rises by 10% from $90,000 to $99,000
      // 5x leverage on 10% gain = +50% on margin = +$50 profit
      await oracleGateway.updatePrice(PYTH_BTC_USD, 9900000000000n, 5000000n, -8, Math.floor(Date.now() / 1000));

      const balanceBefore = await vault.collateralBalances(evmAccountId);
      await perpsManager.connect(evmUser).closePosition(1);
      const balanceAfter = await vault.collateralBalances(evmAccountId);

      // Profit = $500 * (99000 - 90000) / 90000 = $50
      expect(balanceAfter - balanceBefore).to.equal(ethers.parseUnits("50", 6));
      expect(await vault.lockedBalances(evmAccountId)).to.equal(0n);
    });

    it("Should allow keeper to liquidate underwater positions", async function () {
      const evmAccountId = await vault.evmToAccountId(evmUser.address);
      const keeperAccountId = await vault.evmToAccountId(liquidatorKeeper.address);

      // Open 10x Long on SOL at $200
      const solMargin = ethers.parseUnits("100", 6);
      await perpsManager.connect(evmUser).openPosition(
        evmAccountId,
        PYTH_SOL_USD,
        true, // Long
        solMargin,
        10n // 10x leverage
      );

      // SOL drops by 10% from $200 to $180
      // 10x leverage -> 100% loss (exceeds 80% maintenance margin)
      await oracleGateway.updatePrice(PYTH_SOL_USD, 18000000000n, 5000000n, -8, Math.floor(Date.now() / 1000));

      // Keeper triggers liquidation
      await perpsManager.connect(liquidatorKeeper).liquidatePosition(1, keeperAccountId);

      const pos = await perpsManager.getPosition(1);
      expect(pos.isOpen).to.be.false;

      // Keeper earned 5% reward = $5 USDC
      expect(await vault.collateralBalances(keeperAccountId)).to.equal(ethers.parseUnits("5", 6));
    });
  });
});
