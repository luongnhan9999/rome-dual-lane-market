import { defineChain } from "viem";

export const hadrianTestnet = defineChain({
  id: 200010,
  name: "Rome Hadrian Testnet",
  nativeCurrency: {
    decimals: 6,
    name: "USD Coin",
    symbol: "USDC",
  },
  rpcUrls: {
    default: {
      http: ["https://hadrian.testnet.romeprotocol.xyz/"],
    },
    public: {
      http: ["https://hadrian.testnet.romeprotocol.xyz/"],
    },
  },
  blockExplorers: {
    default: {
      name: "Via Hadrian Explorer",
      url: "https://via-hadrian.testnet.romeprotocol.xyz/",
    },
  },
  testnet: true,
});

export const rubiconMainnet = defineChain({
  id: 7531,
  name: "Rome Rubicon Mainnet",
  nativeCurrency: {
    decimals: 18,
    name: "Rome",
    symbol: "ROME",
  },
  rpcUrls: {
    default: {
      http: ["https://rubicon.mainnet.romeprotocol.xyz/"],
    },
    public: {
      http: ["https://rubicon.mainnet.romeprotocol.xyz/"],
    },
  },
  blockExplorers: {
    default: {
      name: "Via Rubicon Explorer",
      url: "https://via.mainnet.romeprotocol.xyz/",
    },
  },
  testnet: false,
});

export const ROME_CONSTANTS = {
  PRECOMPILES: {
    CPI_PROGRAM: "0xFF00000000000000000000000000000000000008" as const,
    SYSTEM_PROGRAM: "0xFF00000000000000000000000000000000000007" as const,
    HELPER_PROGRAM: "0xFF00000000000000000000000000000000000009" as const,
  },
  FEEDS: {
    PYTH_BTC_USD: "0xe62df6e07101a35b130e9d8b2e63d773c0a37e4647f0e37b138bee4e9e8c616c" as const,
    PYTH_SOL_USD: "0xef0d8b6fda2ceba41da15d4095d1da392a0d2f8ed0c6c7bc0f4cfac8c280b56d" as const,
  },
  SOLANA: {
    RPC_DEVNET: "https://api.devnet.solana.com",
    ROME_PROGRAM_ID: "RPTWwELXAY4KC9ZPHhaxp7Sq1hHtU3HNEgLbSegCcWf",
  },
};
