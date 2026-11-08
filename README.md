# Rome Dual-Lane Prediction & Perps Market (Single State & Oracle Gateway)

A production-grade, Rome-native Dual-Lane Prediction Market & Mini-Perpetuals protocol built for **Rome Protocol's Hadrian Testnet** (Chain ID: `200010`) and migrating to **Rubicon Mainnet** (Chain ID: `7531`).

---

## 1. Project Overview & Value Proposition

- **Single Shared State:** A unified collateral pool and market accounting structure where positions and balances are tracked via an abstract `mapping(bytes32 => uint256)`. Both 20-byte EVM addresses (`address`) and 32-byte Solana public keys (`bytes32`) trade against the exact same liquidity pool without bridging or wrapped tokens.
- **Dual-Lane Wallet Access:** MetaMask/Rabby (EVM lane via wagmi/viem) and Phantom/Solflare/Backpack (Solana lane via Solana Wallet Adapters) trade side-by-side in real-time.
- **Oracle Gateway via Precompiles:** Leverages Rome's Cross-Program-Invocation (CPI) precompile (`0xFF00000000000000000000000000000000000008`) to read low-latency Pyth Network / Switchboard oracle state natively from Solana L1 with ~400ms finality.

---

## 2. Architecture & Monorepo Layout

```text
rome-dual-lane-market/
├── contracts/
│   ├── interfaces/
│   │   ├── IRomeCPI.sol               # Precompile 0xFF...08 (CPI dispatcher)
│   │   ├── IRomeOracleGateway.sol     # Interface for Pyth/Switchboard feeds
│   │   └── IERC20.sol                 # Standard ERC20 token interface
│   ├── core/
│   │   ├── RomeMarketVault.sol        # Unified liquidity pool & collateral accounting
│   │   ├── PredictionEngine.sol       # Binary & multi-outcome prediction logic
│   │   ├── PerpsPositionManager.sol   # Mini-perpetual margin (10x) & PnL settlement
│   │   └── RomeOracleGateway.sol      # Pyth oracle bridge contract
│   └── test/
│       ├── MockUSDC.sol               # Mock collateral for testing
│       └── RomeMarket.test.ts         # Hardhat unit tests (7 passing tests)
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── WalletConnectors.tsx   # Dual-connector (wagmi for EVM + Solana Wallet Adapter)
│   │   │   ├── Navbar.tsx             # Live Pyth ticker & session badge
│   │   │   ├── MarketCard.tsx         # Betting & prediction trading interface
│   │   │   └── PositionTable.tsx      # Unified cross-lane position visualizer
│   │   ├── hooks/
│   │   │   ├── useDualLaneSigner.ts   # Unified signing abstraction for EVM/Solana keys
│   │   │   └── useRomeOracle.ts       # Real-time Pyth price hook
│   │   ├── config/
│   │   │   ├── chains.ts              # Registry-driven network setup
│   │   │   └── contracts.ts           # Deployed contract addresses & ABIs
│   │   └── app/
│   │       ├── layout.tsx             # Wagmi & Solana Wallet Adapter Providers
│   │       ├── page.tsx               # Dual-lane trading terminal
│   │       └── globals.css            # Cyberpunk/dark-mode theme
│   ├── package.json
│   ├── tsconfig.json
│   ├── tailwind.config.js
│   └── next.config.mjs
├── scripts/
│   └── deploy.ts                      # Deployment script for Hadrian & Localhost
├── hardhat.config.ts                  # Hardhat configuration (Hadrian 200010)
├── foundry.toml                       # Foundry configuration
├── package.json
└── README.md
```

---

## 3. Network Configuration & Precompiles

| Parameter | Hadrian Testnet | Rubicon Mainnet |
|---|---|---|
| **Chain ID** | `200010` | `7531` |
| **RPC URL** | `https://hadrian.testnet.romeprotocol.xyz/` | `https://rubicon.mainnet.romeprotocol.xyz/` |
| **Block Explorer** | `https://via-hadrian.testnet.romeprotocol.xyz/` | `https://via.mainnet.romeprotocol.xyz/` |
| **Gas Token** | **USDC** (6 decimals) | **ROME** |
| **CPI Precompile** | `0xFF00000000000000000000000000000000000008` | `0xFF00000000000000000000000000000000000008` |
| **System Precompile** | `0xFF00000000000000000000000000000000000007` | `0xFF00000000000000000000000000000000000007` |
| **Helper Precompile** | `0xFF00000000000000000000000000000000000009` | `0xFF00000000000000000000000000000000000009` |

---

## 4. Smart Contract Mechanics

### A. Dual-Lane Shared State (`RomeMarketVault.sol`)
In Rome Protocol, user positions and balances are identified by `bytes32 accountId`:
```solidity
// EVM Address to AccountId (padded to 32 bytes)
function evmToAccountId(address evmAddr) public pure returns (bytes32) {
    return bytes32(uint256(uint160(evmAddr)));
}

// Collateral accounting for EVM and Solana accounts
mapping(bytes32 => uint256) public collateralBalances;
mapping(bytes32 => uint256) public lockedBalances;
```
- EVM users deposit via standard ERC20 `transferFrom`.
- Solana users deposit via Rome SDK / bridge relayer envelope directly credited to their 32-byte Ed25519 public key.
- Available collateral is immediately usable across **Prediction Markets** and **Perpetuals Margin**.

### B. Prediction Engine (`PredictionEngine.sol`)
- Creates markets with expiry timestamps and price conditions (e.g. `BTC >= $100,000`).
- Users buy YES or NO shares from unified collateral.
- Resolves at expiry by fetching Pyth oracle prices from `RomeOracleGateway`.
- Winners claim proportional shares from the total pool.

### C. Mini-Perps Position Manager (`PerpsPositionManager.sol`)
- Leveraged trading up to **10x** on BTC/USD and SOL/USD.
- Validates Pyth benchmark prices via `IRomeOracleGateway`.
- Calculates unrealized and realized PnL in real-time.
- Keeper liquidation bot incentives (5% reward for liquidating positions exceeding 80% maintenance margin loss).

---

## 5. Quickstart & Deployment Guide

### Step 1: Install Dependencies & Run Tests
```bash
# Install root dependencies
npm install

# Compile contracts
node ./node_modules/hardhat/internal/cli/cli.js compile

# Run Hardhat test suite (7 passing tests)
node ./node_modules/hardhat/internal/cli/cli.js test
```

### Step 2: Preflight Check with Rome CLI
```bash
npx github:rome-protocol/rome-cli doctor hadrian
```

### Step 3: Deploy to Hadrian Testnet
1. Create a `.env` file with your deployer private key funded with testnet USDC gas:
   ```env
   PRIVATE_KEY="0xYOUR_HADRIAN_FUNDED_PRIVATE_KEY"
   ```
2. Run deployment:
   ```bash
   node ./node_modules/hardhat/internal/cli/cli.js run scripts/deploy.ts --network hadrian
   ```
3. The script will automatically output contract addresses to `deployed-addresses.json` and sync them into `frontend/src/config/contracts.json`.

### Step 4: Verify Deployment on Rome
Run works-gate validation using the Rome CLI:
```bash
rome verify hadrian --path solidity
```

### Step 5: Launch the Dual-Lane Frontend
```bash
cd frontend
npm install
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser:
- Connect **MetaMask** on the EVM lane.
- Connect **Phantom** on the Solana lane.
- Experience seamless dual-lane deposits, prediction betting, and 10x leveraged perps.

---

## 6. Registering on Rome Arena

1. Visit [https://arena.mainnet.romeprotocol.xyz/apps/new](https://arena.mainnet.romeprotocol.xyz/apps/new).
2. Connect your wallet (Builder role).
3. Fill in your App details:
   - **App Name:** Rome Dual-Lane Prediction & Perps Market
   - **Category:** EVM and Solana wallets (one app, both wallet types) / Solana programs for EVM users
   - **Network:** Hadrian Testnet (`200010`)
   - **Contract Addresses:**
     - `RomeMarketVault`: (from `deployed-addresses.json`)
     - `PredictionEngine`: (from `deployed-addresses.json`)
     - `PerpsPositionManager`: (from `deployed-addresses.json`)
     - `RomeOracleGateway`: (from `deployed-addresses.json`)
4. Submit and start completing milestones to earn **Laurels**, climb ranking tiers (Legionary → Patrician → Pontifex Maximus), and apply for discretionary grants!
