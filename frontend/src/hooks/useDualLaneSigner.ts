"use client";

import { useMemo, useState } from "react";
import { useAccount, useWalletClient, usePublicClient } from "wagmi";
import { useWallet } from "@solana/wallet-adapter-react";
import { CONTRACT_ADDRESSES, VAULT_ABI, PREDICTION_ABI, PERPS_ABI, ERC20_ABI } from "@/config/contracts";
import { hadrianTestnet } from "@/config/chains";

export type SessionType = "evm" | "solana" | "none";

export function useDualLaneSigner() {
  const { address: evmAddress, isConnected: isEvmConnected } = useAccount();
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient();

  const { publicKey: solanaPublicKey, connected: isSolanaConnected, signTransaction } = useWallet();

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
      // Pad 20-byte address to 32-byte hex
      const cleanAddr = evmAddress.toLowerCase().replace("0x", "");
      return `0x000000000000000000000000${cleanAddr}` as `0x${string}`;
    }
    if (sessionType === "solana" && solanaPublicKey) {
      // Convert 32-byte Ed25519 Pubkey to bytes32 hex
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

  // Approve USDC Collateral
  const approveUSDC = async (amount: bigint) => {
    if (!walletClient || !evmAddress) throw new Error("EVM wallet not connected for direct ERC20 approval");
    setIsPending(true);
    setError(null);
    try {
      const hash = await walletClient.writeContract({
        address: CONTRACT_ADDRESSES.USDC,
        abi: ERC20_ABI,
        functionName: "approve",
        args: [CONTRACT_ADDRESSES.RomeMarketVault, amount],
      });
      await publicClient?.waitForTransactionReceipt({ hash });
      return hash;
    } catch (err: any) {
      setError(err?.message || "Approve failed");
      throw err;
    } finally {
      setIsPending(false);
    }
  };

  // Deposit Collateral
  const depositCollateral = async (amount: bigint) => {
    if (!accountId) throw new Error("No active wallet session");
    setIsPending(true);
    setError(null);
    try {
      if (sessionType === "evm") {
        if (!walletClient) throw new Error("WalletClient unavailable");
        const hash = await walletClient.writeContract({
          address: CONTRACT_ADDRESSES.RomeMarketVault,
          abi: VAULT_ABI,
          functionName: "depositCollateral",
          args: [accountId, amount],
        });
        await publicClient?.waitForTransactionReceipt({ hash });
        return hash;
      } else {
        // Solana lane: wrap transaction envelope for Rome EVM
        console.log(`[Solana Lane] Submitting transaction via Solana key: ${solanaPublicKey?.toBase58()}`);
        // Simulated Rome EVM transaction envelope submission
        return `sol_tx_${Date.now()}`;
      }
    } catch (err: any) {
      setError(err?.message || "Deposit failed");
      throw err;
    } finally {
      setIsPending(false);
    }
  };

  // Buy Prediction Shares
  const buyPredictionShares = async (marketId: bigint, isYes: boolean, amount: bigint) => {
    if (!accountId) throw new Error("No active wallet session");
    setIsPending(true);
    setError(null);
    try {
      if (sessionType === "evm") {
        if (!walletClient) throw new Error("WalletClient unavailable");
        const hash = await walletClient.writeContract({
          address: CONTRACT_ADDRESSES.PredictionEngine,
          abi: PREDICTION_ABI,
          functionName: "buyShares",
          args: [marketId, accountId, isYes, amount],
        });
        await publicClient?.waitForTransactionReceipt({ hash });
        return hash;
      } else {
        console.log(`[Solana Lane] Buying prediction shares for ${accountId}`);
        return `sol_pred_${Date.now()}`;
      }
    } catch (err: any) {
      setError(err?.message || "Trade failed");
      throw err;
    } finally {
      setIsPending(false);
    }
  };

  // Open Perpetual Margin Position
  const openPerpPosition = async (
    feedId: `0x${string}`,
    isLong: boolean,
    margin: bigint,
    leverage: bigint
  ) => {
    if (!accountId) throw new Error("No active wallet session");
    setIsPending(true);
    setError(null);
    try {
      if (sessionType === "evm") {
        if (!walletClient) throw new Error("WalletClient unavailable");
        const hash = await walletClient.writeContract({
          address: CONTRACT_ADDRESSES.PerpsPositionManager,
          abi: PERPS_ABI,
          functionName: "openPosition",
          args: [accountId, feedId, isLong, margin, leverage],
        });
        await publicClient?.waitForTransactionReceipt({ hash });
        return hash;
      } else {
        console.log(`[Solana Lane] Opening perp position for ${accountId}`);
        return `sol_perp_${Date.now()}`;
      }
    } catch (err: any) {
      setError(err?.message || "Open position failed");
      throw err;
    } finally {
      setIsPending(false);
    }
  };

  // Close Perpetual Position
  const closePerpPosition = async (positionId: bigint) => {
    setIsPending(true);
    setError(null);
    try {
      if (sessionType === "evm") {
        if (!walletClient) throw new Error("WalletClient unavailable");
        const hash = await walletClient.writeContract({
          address: CONTRACT_ADDRESSES.PerpsPositionManager,
          abi: PERPS_ABI,
          functionName: "closePosition",
          args: [positionId],
        });
        await publicClient?.waitForTransactionReceipt({ hash });
        return hash;
      } else {
        console.log(`[Solana Lane] Closing perp position #${positionId}`);
        return `sol_close_${Date.now()}`;
      }
    } catch (err: any) {
      setError(err?.message || "Close position failed");
      throw err;
    } finally {
      setIsPending(false);
    }
  };

  return {
    sessionType,
    accountId,
    displayAddress,
    isEvmConnected,
    isSolanaConnected,
    isPending,
    error,
    approveUSDC,
    depositCollateral,
    buyPredictionShares,
    openPerpPosition,
    closePerpPosition,
  };
}
