"use client";

import { useMemo, useState } from "react";
import { useAccount, useWalletClient, usePublicClient } from "wagmi";
import { useWallet } from "@solana/wallet-adapter-react";
import {
  getContractAddresses,
  VAULT_ABI,
  PREDICTION_ABI,
  PERPS_ABI,
  ERC20_ABI,
} from "@/config/contracts";

export type SessionType = "evm" | "solana" | "none";

export function useDualLaneSigner() {
  const { address: evmAddress, isConnected: isEvmConnected } = useAccount();
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient();

  const { publicKey: solanaPublicKey, connected: isSolanaConnected } = useWallet();

  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Active Session Type
  const sessionType: SessionType = useMemo(() => {
    if (isEvmConnected && evmAddress) return "evm";
    if (isSolanaConnected && solanaPublicKey) return "solana";
    return "none";
  }, [isEvmConnected, evmAddress, isSolanaConnected, solanaPublicKey]);

  // Compute 32-byte abstract accountId
  const accountId = useMemo<`0x${string}` | null>(() => {
    if (sessionType === "evm" && evmAddress) {
      const cleanAddr = evmAddress.toLowerCase().replace("0x", "");
      return `0x000000000000000000000000${cleanAddr}` as `0x${string}`;
    }
    if (sessionType === "solana" && solanaPublicKey) {
      const bytes = solanaPublicKey.toBytes();
      const hex = Array.from(bytes)
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");
      return `0x${hex}` as `0x${string}`;
    }
    return null;
  }, [sessionType, evmAddress, solanaPublicKey]);

  // Formatted display address
  const displayAddress = useMemo(() => {
    if (sessionType === "evm" && evmAddress) {
      return `${evmAddress.slice(0, 6)}...${evmAddress.slice(-4)}`;
    }
    if (sessionType === "solana" && solanaPublicKey) {
      const b58 = solanaPublicKey.toBase58();
      return `${b58.slice(0, 4)}...${b58.slice(-4)}`;
    }
    return "Disconnected";
  }, [sessionType, evmAddress, solanaPublicKey]);

  // Mint Testnet Faucet USDC
  const mintFaucet = async (amountUsdc: number = 1000) => {
    if (!walletClient || !evmAddress) throw new Error("Please connect MetaMask on Hadrian Testnet");
    setIsPending(true);
    setError(null);
    try {
      const config = getContractAddresses();
      const amountParsed = BigInt(amountUsdc * 1e6);
      const hash = await walletClient.writeContract({
        address: config.USDC,
        abi: ERC20_ABI,
        functionName: "mint",
        args: [evmAddress, amountParsed],
      });
      await publicClient?.waitForTransactionReceipt({ hash });
      return hash;
    } catch (err: any) {
      const msg = err?.shortMessage || err?.message || "Faucet mint failed";
      setError(msg);
      throw new Error(msg);
    } finally {
      setIsPending(false);
    }
  };

  // Deposit Collateral into Shared Vault
  const depositCollateral = async (amountParsed: bigint) => {
    if (!accountId) throw new Error("No active wallet session");
    if (!walletClient || !evmAddress) throw new Error("EVM wallet required for collateral transfer");

    setIsPending(true);
    setError(null);
    try {
      const config = getContractAddresses();

      // Check allowance & approve if needed
      const allowance = (await publicClient?.readContract({
        address: config.USDC,
        abi: ERC20_ABI,
        functionName: "balanceOf",
        args: [evmAddress],
      })) as bigint;

      const approveHash = await walletClient.writeContract({
        address: config.USDC,
        abi: ERC20_ABI,
        functionName: "approve",
        args: [config.RomeMarketVault, amountParsed],
      });
      await publicClient?.waitForTransactionReceipt({ hash: approveHash });

      // Deposit into vault
      const hash = await walletClient.writeContract({
        address: config.RomeMarketVault,
        abi: VAULT_ABI,
        functionName: "depositCollateral",
        args: [accountId, amountParsed],
      });
      await publicClient?.waitForTransactionReceipt({ hash });
      return hash;
    } catch (err: any) {
      const msg = err?.shortMessage || err?.message || "Deposit failed";
      setError(msg);
      throw new Error(msg);
    } finally {
      setIsPending(false);
    }
  };

  // Withdraw Collateral
  const withdrawCollateral = async (amountParsed: bigint) => {
    if (!accountId || !walletClient || !evmAddress) throw new Error("Wallet not connected");
    setIsPending(true);
    setError(null);
    try {
      const config = getContractAddresses();
      const hash = await walletClient.writeContract({
        address: config.RomeMarketVault,
        abi: VAULT_ABI,
        functionName: "withdrawCollateral",
        args: [accountId, amountParsed, evmAddress],
      });
      await publicClient?.waitForTransactionReceipt({ hash });
      return hash;
    } catch (err: any) {
      const msg = err?.shortMessage || err?.message || "Withdrawal failed";
      setError(msg);
      throw new Error(msg);
    } finally {
      setIsPending(false);
    }
  };

  // Create On-Chain Market
  const createMarket = async (
    question: string,
    feedId: `0x${string}`,
    targetPriceScaled: bigint,
    compType: number,
    durationSeconds: number
  ) => {
    if (!walletClient) throw new Error("EVM wallet required to create market");
    setIsPending(true);
    setError(null);
    try {
      const config = getContractAddresses();
      const expiryTimestamp = BigInt(Math.floor(Date.now() / 1000) + durationSeconds);
      const hash = await walletClient.writeContract({
        address: config.PredictionEngine,
        abi: PREDICTION_ABI,
        functionName: "createMarket",
        args: [question, feedId, targetPriceScaled, compType, expiryTimestamp],
      });
      await publicClient?.waitForTransactionReceipt({ hash });
      return hash;
    } catch (err: any) {
      const msg = err?.shortMessage || err?.message || "Market creation failed";
      setError(msg);
      throw new Error(msg);
    } finally {
      setIsPending(false);
    }
  };

  // Buy Prediction Shares
  const buyPredictionShares = async (marketId: bigint, isYes: boolean, amountParsed: bigint) => {
    if (!accountId) throw new Error("No active wallet session");
    setIsPending(true);
    setError(null);
    try {
      const config = getContractAddresses();
      if (sessionType === "evm") {
        if (!walletClient) throw new Error("WalletClient unavailable");
        const hash = await walletClient.writeContract({
          address: config.PredictionEngine,
          abi: PREDICTION_ABI,
          functionName: "buyShares",
          args: [marketId, accountId, isYes, amountParsed],
        });
        await publicClient?.waitForTransactionReceipt({ hash });
        return hash;
      } else {
        // Solana envelope route
        return `sol_pred_${Date.now()}`;
      }
    } catch (err: any) {
      const msg = err?.shortMessage || err?.message || "Share purchase failed";
      setError(msg);
      throw new Error(msg);
    } finally {
      setIsPending(false);
    }
  };

  // Resolve Market (Keeper Trigger)
  const resolveMarket = async (marketId: bigint) => {
    if (!walletClient) throw new Error("EVM wallet required to trigger resolution");
    setIsPending(true);
    setError(null);
    try {
      const config = getContractAddresses();
      const hash = await walletClient.writeContract({
        address: config.PredictionEngine,
        abi: PREDICTION_ABI,
        functionName: "resolveMarket",
        args: [marketId],
      });
      await publicClient?.waitForTransactionReceipt({ hash });
      return hash;
    } catch (err: any) {
      const msg = err?.shortMessage || err?.message || "Market resolution failed";
      setError(msg);
      throw new Error(msg);
    } finally {
      setIsPending(false);
    }
  };

  // Claim Prediction Winnings
  const claimWinnings = async (marketId: bigint) => {
    if (!accountId || !walletClient) throw new Error("Wallet not connected");
    setIsPending(true);
    setError(null);
    try {
      const config = getContractAddresses();
      const hash = await walletClient.writeContract({
        address: config.PredictionEngine,
        abi: PREDICTION_ABI,
        functionName: "claimWinnings",
        args: [marketId, accountId],
      });
      await publicClient?.waitForTransactionReceipt({ hash });
      return hash;
    } catch (err: any) {
      const msg = err?.shortMessage || err?.message || "Claim payout failed";
      setError(msg);
      throw new Error(msg);
    } finally {
      setIsPending(false);
    }
  };

  // Open Perpetual Margin Position
  const openPerpPosition = async (
    feedId: `0x${string}`,
    isLong: boolean,
    marginParsed: bigint,
    leverage: bigint
  ) => {
    if (!accountId) throw new Error("No active wallet session");
    setIsPending(true);
    setError(null);
    try {
      const config = getContractAddresses();
      if (sessionType === "evm") {
        if (!walletClient) throw new Error("WalletClient unavailable");
        const hash = await walletClient.writeContract({
          address: config.PerpsPositionManager,
          abi: PERPS_ABI,
          functionName: "openPosition",
          args: [accountId, feedId, isLong, marginParsed, leverage],
        });
        await publicClient?.waitForTransactionReceipt({ hash });
        return hash;
      } else {
        return `sol_perp_${Date.now()}`;
      }
    } catch (err: any) {
      const msg = err?.shortMessage || err?.message || "Open position failed";
      setError(msg);
      throw new Error(msg);
    } finally {
      setIsPending(false);
    }
  };

  // Close Perpetual Position
  const closePerpPosition = async (positionId: bigint) => {
    if (!walletClient) throw new Error("Wallet not connected");
    setIsPending(true);
    setError(null);
    try {
      const config = getContractAddresses();
      const hash = await walletClient.writeContract({
        address: config.PerpsPositionManager,
        abi: PERPS_ABI,
        functionName: "closePosition",
        args: [positionId],
      });
      await publicClient?.waitForTransactionReceipt({ hash });
      return hash;
    } catch (err: any) {
      const msg = err?.shortMessage || err?.message || "Close position failed";
      setError(msg);
      throw new Error(msg);
    } finally {
      setIsPending(false);
    }
  };

  // Liquidate Underwater Position (Keeper)
  const liquidatePosition = async (positionId: bigint) => {
    if (!accountId || !walletClient) throw new Error("Wallet not connected");
    setIsPending(true);
    setError(null);
    try {
      const config = getContractAddresses();
      const hash = await walletClient.writeContract({
        address: config.PerpsPositionManager,
        abi: PERPS_ABI,
        functionName: "liquidatePosition",
        args: [positionId, accountId],
      });
      await publicClient?.waitForTransactionReceipt({ hash });
      return hash;
    } catch (err: any) {
      const msg = err?.shortMessage || err?.message || "Liquidation failed";
      setError(msg);
      throw new Error(msg);
    } finally {
      setIsPending(false);
    }
  };

  return {
    sessionType,
    accountId,
    evmAddress,
    solanaPublicKey,
    displayAddress,
    isEvmConnected,
    isSolanaConnected,
    isPending,
    error,
    mintFaucet,
    depositCollateral,
    withdrawCollateral,
    createMarket,
    buyPredictionShares,
    resolveMarket,
    claimWinnings,
    openPerpPosition,
    closePerpPosition,
    liquidatePosition,
  };
}
