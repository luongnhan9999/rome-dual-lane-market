import contractsJson from "./contracts.json";

export interface ContractAddressConfig {
  USDC: `0x${string}`;
  RomeMarketVault: `0x${string}`;
  PredictionEngine: `0x${string}`;
  PerpsPositionManager: `0x${string}`;
  RomeOracleGateway: `0x${string}`;
}

const DEFAULT_ADDRESSES: ContractAddressConfig = {
  USDC: (contractsJson.contracts?.USDC || "0x3c6876c01406217ba81f35169a082b75107a8ef1") as `0x${string}`,
  RomeMarketVault: (contractsJson.contracts?.RomeMarketVault || "0x270f0738793c5c958a95bb823720f82b45147a29") as `0x${string}`,
  PredictionEngine: (contractsJson.contracts?.PredictionEngine || "0x16bcdc218f5fc823ebcf895acd602061a1a0f3f9") as `0x${string}`,
  PerpsPositionManager: (contractsJson.contracts?.PerpsPositionManager || "0x0e5dfca3fbbd3c66f4731a23c665acac0d56e284") as `0x${string}`,
  RomeOracleGateway: (contractsJson.contracts?.RomeOracleGateway || "0x3904e125387e5231a58a6b6398bcb7610010fc8b") as `0x${string}`,
};

export function getContractAddresses(): ContractAddressConfig {
  if (typeof window !== "undefined") {
    try {
      const stored = localStorage.getItem("JANUS_CONTRACT_ADDRESSES");
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      console.error("Failed to load custom contract addresses from localStorage", e);
    }
  }
  return DEFAULT_ADDRESSES;
}

export function saveContractAddresses(newAddresses: ContractAddressConfig): void {
  if (typeof window !== "undefined") {
    localStorage.setItem("JANUS_CONTRACT_ADDRESSES", JSON.stringify(newAddresses));
    window.dispatchEvent(new Event("janus_contracts_updated"));
  }
}

export function resetContractAddresses(): void {
  if (typeof window !== "undefined") {
    localStorage.removeItem("JANUS_CONTRACT_ADDRESSES");
    window.dispatchEvent(new Event("janus_contracts_updated"));
  }
}

export const CONTRACT_ADDRESSES = DEFAULT_ADDRESSES;

export const VAULT_ABI = [
  {
    inputs: [{ internalType: "address", name: "_collateralToken", type: "address" }],
    stateMutability: "nonpayable",
    type: "constructor",
  },
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
    inputs: [{ internalType: "uint256", name: "amount", type: "uint256" }],
    name: "deposit",
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
    name: "lockedBalances",
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
  {
    inputs: [
      { internalType: "address", name: "market", type: "address" },
      { internalType: "bool", name: "authorized", type: "bool" },
    ],
    name: "setMarketAuthorization",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
] as const;

export const PREDICTION_ABI = [
  {
    inputs: [
      { internalType: "address", name: "_vault", type: "address" },
      { internalType: "address", name: "_oracleGateway", type: "address" },
    ],
    stateMutability: "nonpayable",
    type: "constructor",
  },
  {
    inputs: [],
    name: "nextMarketId",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "string", name: "question", type: "string" },
      { internalType: "bytes32", name: "feedId", type: "bytes32" },
      { internalType: "int64", name: "targetPrice", type: "int64" },
      { internalType: "uint8", name: "compType", type: "uint8" },
      { internalType: "uint256", name: "expiryTimestamp", type: "uint256" },
    ],
    name: "createMarket",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "nonpayable",
    type: "function",
  },
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
    inputs: [
      { internalType: "uint256", name: "marketId", type: "uint256" },
      { internalType: "bool", name: "isYes", type: "bool" },
      { internalType: "uint256", name: "collateralAmount", type: "uint256" },
    ],
    name: "buySharesDirect",
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
      { internalType: "address", name: "_vault", type: "address" },
      { internalType: "address", name: "_oracleGateway", type: "address" },
    ],
    stateMutability: "nonpayable",
    type: "constructor",
  },
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
    inputs: [{ internalType: "bytes32", name: "_pythProgramId", type: "bytes32" }],
    stateMutability: "nonpayable",
    type: "constructor",
  },
  {
    inputs: [
      { internalType: "bytes32", name: "feedId", type: "bytes32" },
      { internalType: "int64", name: "price", type: "int64" },
      { internalType: "uint64", name: "conf", type: "uint64" },
      { internalType: "int32", name: "expo", type: "int32" },
      { internalType: "uint256", name: "publishTime", type: "uint256" },
    ],
    name: "updatePrice",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
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
    inputs: [],
    stateMutability: "nonpayable",
    type: "constructor",
  },
  {
    inputs: [
      { internalType: "address", name: "to", type: "address" },
      { internalType: "uint256", name: "amount", type: "uint256" },
    ],
    name: "mint",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
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
