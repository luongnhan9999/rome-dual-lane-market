const fs = require('fs');
const path = require('path');

const contracts = [
  { name: 'MockUSDC', path: 'artifacts/contracts/test/MockUSDC.sol/MockUSDC.json' },
  { name: 'RomeOracleGateway', path: 'artifacts/contracts/core/RomeOracleGateway.sol/RomeOracleGateway.json' },
  { name: 'RomeMarketVault', path: 'artifacts/contracts/core/RomeMarketVault.sol/RomeMarketVault.json' },
  { name: 'PredictionEngine', path: 'artifacts/contracts/core/PredictionEngine.sol/PredictionEngine.json' },
  { name: 'PerpsPositionManager', path: 'artifacts/contracts/core/PerpsPositionManager.sol/PerpsPositionManager.json' },
];

const result = {};

for (const c of contracts) {
  const artifactPath = path.join(__dirname, '..', c.path);
  if (fs.existsSync(artifactPath)) {
    const data = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));
    result[c.name] = {
      abi: data.abi,
      bytecode: data.bytecode,
    };
    console.log(`Exported ${c.name}: bytecode length ${data.bytecode.length}`);
  } else {
    console.error(`Missing artifact: ${artifactPath}`);
  }
}

const outDir = path.join(__dirname, '..', 'frontend', 'src', 'config');
fs.writeFileSync(path.join(outDir, 'contractBytecodes.json'), JSON.stringify(result, null, 2));
console.log('Saved to frontend/src/config/contractBytecodes.json');
