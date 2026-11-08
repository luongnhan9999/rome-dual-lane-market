const https = require("https");
const http = require("http");

async function rpcCall(method, params = []) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method,
      params,
    });

    const req = https.request(
      "https://hadrian.testnet.romeprotocol.xyz/",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(data),
        },
        timeout: 10000,
      },
      (res) => {
        let body = "";
        res.on("data", (chunk) => (body += chunk));
        res.on("end", () => {
          try {
            resolve(JSON.parse(body));
          } catch (e) {
            reject(new Error("Failed to parse RPC response: " + body));
          }
        });
      }
    );

    req.on("error", (e) => reject(e));
    req.write(data);
    req.end();
  });
}

async function fetchUrl(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { timeout: 15000 }, (res) => {
      let body = "";
      res.on("data", (chunk) => (body += chunk));
      res.on("end", () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body,
        });
      });
    }).on("error", (e) => reject(e));
  });
}

async function runTests() {
  console.log("============================================================");
  console.log("🚀 STARTING AUTOMATED TEST SUITE: ON-CHAIN & LIVE WEB APP");
  console.log("============================================================\n");

  let totalTests = 0;
  let passedTests = 0;

  function assert(condition, testName, details = "") {
    totalTests++;
    if (condition) {
      passedTests++;
      console.log(`  ✅ [PASS] ${testName} ${details ? `(${details})` : ""}`);
    } else {
      console.error(`  ❌ [FAIL] ${testName} ${details ? `(${details})` : ""}`);
    }
  }

  // --- SECTION 1: HADRIAN TESTNET RPC CONNECTIVITY ---
  console.log("--- 1. Testing Rome Hadrian Testnet RPC Connectivity ---");
  try {
    const chainIdRes = await rpcCall("eth_chainId");
    const chainIdNum = parseInt(chainIdRes.result, 16);
    assert(chainIdNum === 200010, "Hadrian Chain ID Validation", `Expected 200010, got ${chainIdNum}`);

    const blockNumRes = await rpcCall("eth_blockNumber");
    const blockNum = parseInt(blockNumRes.result, 16);
    assert(blockNum > 0, "Hadrian Block Production Check", `Current Block #${blockNum}`);

    const gasPriceRes = await rpcCall("eth_gasPrice");
    const gasPriceGwei = parseInt(gasPriceRes.result, 16) / 1e9;
    assert(gasPriceGwei >= 0, "Hadrian Gas Price Metric", `Gas price: ${gasPriceGwei} Gwei`);
  } catch (err) {
    assert(false, "Hadrian RPC Connectivity", err.message);
  }

  // --- SECTION 2: LIVE WEB APPLICATION & UI ASSETS ---
  console.log("\n--- 2. Testing Live Production Web App (janus-rome.vercel.app) ---");
  try {
    const liveWeb = await fetchUrl("https://janus-rome.vercel.app");
    assert(liveWeb.statusCode === 200, "Vercel Web Response Status", `HTTP ${liveWeb.statusCode}`);

    const hasTitle = liveWeb.body.includes("Janus") || liveWeb.body.includes("Rome");
    assert(hasTitle, "Page Brand / Title Validation", "Janus / Rome detected");

    const hasPredictionModule = liveWeb.body.includes("Prediction Markets");
    assert(hasPredictionModule, "Prediction Markets Tab Loaded in HTML", "Found 'Prediction Markets'");

    const hasPerpsModule = liveWeb.body.includes("Mini-Perpetuals");
    assert(hasPerpsModule, "Mini-Perpetuals (10x Margin) Module Loaded", "Found 'Mini-Perpetuals'");

    const hasVaultModule = liveWeb.body.includes("Collateral Vault");
    assert(hasVaultModule, "Shared Collateral Vault Interface Loaded", "Found 'Collateral Vault'");

    const hasDualLane = liveWeb.body.includes("MetaMask") && liveWeb.body.includes("Phantom");
    assert(hasDualLane, "Dual-Lane Wallets (MetaMask + Phantom) UI Elements", "Found MetaMask and Phantom references");

    const hasDeployer = liveWeb.body.includes("Deploy Suite") || liveWeb.body.includes("Deploy");
    assert(hasDeployer, "1-Click Contract Suite Deployer Button Present", "Found Contract Deployer trigger");

    const hasFaucet = liveWeb.body.includes("Faucet");
    assert(hasFaucet, "USDC Faucet Button Present", "Found Faucet trigger");

    const hasOracleGateway = liveWeb.body.includes("0xFF00000000000000000000000000000000000008") || liveWeb.body.includes("Pyth");
    assert(hasOracleGateway, "Solana Pyth CPI Precompile / Oracle Gateway Reference", "Found Pyth/CPI reference");
  } catch (err) {
    assert(false, "Live Web App Fetch", err.message);
  }

  // --- SECTION 3: CONTRACT BYTECODES & ABIS AVAILABILITY ---
  console.log("\n--- 3. Testing Browser Deployer Bytecodes & ABIs ---");
  try {
    const bytecodes = require("../frontend/src/config/contractBytecodes.json");
    assert(!!bytecodes.MockUSDC && !!bytecodes.MockUSDC.bytecode, "MockUSDC Bytecode Available", `${bytecodes.MockUSDC.bytecode.length} bytes`);
    assert(!!bytecodes.RomeOracleGateway && !!bytecodes.RomeOracleGateway.bytecode, "RomeOracleGateway Bytecode Available", `${bytecodes.RomeOracleGateway.bytecode.length} bytes`);
    assert(!!bytecodes.RomeMarketVault && !!bytecodes.RomeMarketVault.bytecode, "RomeMarketVault Bytecode Available", `${bytecodes.RomeMarketVault.bytecode.length} bytes`);
    assert(!!bytecodes.PredictionEngine && !!bytecodes.PredictionEngine.bytecode, "PredictionEngine Bytecode Available", `${bytecodes.PredictionEngine.bytecode.length} bytes`);
    assert(!!bytecodes.PerpsPositionManager && !!bytecodes.PerpsPositionManager.bytecode, "PerpsPositionManager Bytecode Available", `${bytecodes.PerpsPositionManager.bytecode.length} bytes`);
  } catch (err) {
    assert(false, "Contract Bytecodes Integrity", err.message);
  }

  console.log("\n============================================================");
  console.log(`📊 TEST SUITE SUMMARY: ${passedTests} / ${totalTests} TESTS PASSED (${((passedTests/totalTests)*100).toFixed(1)}%)`);
  console.log("============================================================\n");

  if (passedTests !== totalTests) {
    process.exit(1);
  }
}

runTests();
