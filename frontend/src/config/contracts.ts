import contractsJson from "./contracts.json";

export const CONTRACT_ADDRESSES = {
  USDC: contractsJson.contracts.USDC as `0x${string}`,
  RomeMarketVault: contractsJson.contracts.RomeMarketVault as `0x${string}`,
  PredictionEngine: contractsJson.contracts.PredictionEngine as `0x${string}`,
  PerpsPositionManager: contractsJson.contracts.PerpsPositionManager as `0x${string}`,
  RomeOracleGateway: contractsJson.contracts.RomeOracleGateway as `0x${string}`,
};

export const VAULT_ABI = [
  {
    inputs: [
      { internalType: "bytes32", name: "accountId", type: "bytes32" },
      { internalType: "uint256", name: "amount", type: "uint256" },
    ],
    name: "depositCollateral",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "bytes32", name: "accountId", type: "bytes32" },
      { internalType: "uint256", name: "amount", type: "uint256" },
      { internalType: "address", name: "recipient", type: "address" },
    ],
    name: "withdrawCollateral",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ internalType: "bytes32", name: "accountId", type: "bytes32" }],
    name: "collateralBalances",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "bytes32", name: "accountId", type: "bytes32" }],
    name: "getAvailableCollateral",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "evmAddr", type: "address" }],
    name: "evmToAccountId",
    outputs: [{ internalType: "bytes32", name: "", type: "bytes32" }],
    stateMutability: "pure",
    type: "function",
  },
] as const;

export const PREDICTION_ABI = [
  {
    inputs: [
      { internalType: "uint256", name: "marketId", type: "uint256" },
      { internalType: "bytes32", name: "accountId", type: "bytes32" },
      { internalType: "bool", name: "isYes", type: "bool" },
      { internalType: "uint256", name: "collateralAmount", type: "uint256" },
    ],
    name: "buyShares",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint256", name: "marketId", type: "uint256" }],
    name: "resolveMarket",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "uint256", name: "marketId", type: "uint256" },
      { internalType: "bytes32", name: "accountId", type: "bytes32" },
    ],
    name: "claimWinnings",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint256", name: "marketId", type: "uint256" }],
    name: "getMarket",
    outputs: [
      {
        components: [
          { internalType: "uint256", name: "id", type: "uint256" },
          { internalType: "string", name: "question", type: "string" },
          { internalType: "bytes32", name: "feedId", type: "bytes32" },
          { internalType: "int64", name: "targetPrice", type: "int64" },
          { internalType: "uint8", name: "compType", type: "uint8" },
          { internalType: "uint256", name: "expiryTimestamp", type: "uint256" },
          { internalType: "bool", name: "resolved", type: "bool" },
          { internalType: "bool", name: "outcome", type: "bool" },
          { internalType: "int64", name: "resolutionPrice", type: "int64" },
          { internalType: "uint256", name: "totalYesShares", type: "uint256" },
          { internalType: "uint256", name: "totalNoShares", type: "uint256" },
          { internalType: "uint256", name: "totalPool", type: "uint256" },
        ],
        internalType: "struct PredictionEngine.Market",
        name: "",
        type: "tuple",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "uint256", name: "", type: "uint256" },
      { internalType: "bytes32", name: "", type: "bytes32" },
    ],
    name: "yesShares",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "uint256", name: "", type: "uint256" },
      { internalType: "bytes32", name: "", type: "bytes32" },
    ],
    name: "noShares",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

export const PERPS_ABI = [
  {
    inputs: [
      { internalType: "bytes32", name: "accountId", type: "bytes32" },
      { internalType: "bytes32", name: "feedId", type: "bytes32" },
      { internalType: "bool", name: "isLong", type: "bool" },
      { internalType: "uint256", name: "margin", type: "uint256" },
      { internalType: "uint256", name: "leverage", type: "uint256" },
    ],
    name: "openPosition",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint256", name: "positionId", type: "uint256" }],
    name: "closePosition",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "uint256", name: "positionId", type: "uint256" },
      { internalType: "bytes32", name: "keeperAccountId", type: "bytes32" },
    ],
    name: "liquidatePosition",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint256", name: "positionId", type: "uint256" }],
    name: "getPosition",
    outputs: [
      {
        components: [
          { internalType: "uint256", name: "positionId", type: "uint256" },
          { internalType: "bytes32", name: "accountId", type: "bytes32" },
          { internalType: "bytes32", name: "feedId", type: "bytes32" },
          { internalType: "bool", name: "isLong", type: "bool" },
          { internalType: "uint256", name: "margin", type: "uint256" },
          { internalType: "uint256", name: "size", type: "uint256" },
          { internalType: "int64", name: "entryPrice", type: "int64" },
          { internalType: "uint256", name: "leverage", type: "uint256" },
          { internalType: "uint256", name: "openedAt", type: "uint256" },
          { internalType: "bool", name: "isOpen", type: "bool" },
        ],
        internalType: "struct PerpsPositionManager.Position",
        name: "",
        type: "tuple",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "bytes32", name: "accountId", type: "bytes32" }],
    name: "getUserPositions",
    outputs: [{ internalType: "uint256[]", name: "", type: "uint256[]" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

export const ORACLE_ABI = [
  {
    inputs: [{ internalType: "bytes32", name: "feedId", type: "bytes32" }],
    name: "getLatestPrice",
    outputs: [
      { internalType: "int64", name: "price", type: "int64" },
      { internalType: "uint64", name: "conf", type: "uint64" },
      { internalType: "uint256", name: "publishTime", type: "uint256" },
    ],
    stateMutability: "view",
    type: "function",
  },
] as const;

export const ERC20_ABI = [
  {
    inputs: [
      { internalType: "address", name: "spender", type: "address" },
      { internalType: "uint256", name: "amount", type: "uint256" },
    ],
    name: "approve",
    outputs: [{ internalType: "bool", name: "", type: "bool" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "account", type: "address" }],
    name: "balanceOf",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
] as const;
