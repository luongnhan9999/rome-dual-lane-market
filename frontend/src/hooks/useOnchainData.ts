"use client";

import { useState, useEffect, useCallback } from "react";
import { usePublicClient } from "wagmi";
import {
  getContractAddresses,
  VAULT_ABI,
  PREDICTION_ABI,
  PERPS_ABI,
  ERC20_ABI,
} from "@/config/contracts";

export interface OnchainMarket {
  id: number;
  question: string;
  feedId: string;
  targetPrice: number;
  compType: number; // 0: GREATER_OR_EQUAL, 1: LESS_OR_EQUAL
  expiryTimestamp: number;
  resolved: boolean;
  outcome: boolean;
  resolutionPrice: number;
  totalYesShares: number;
  totalNoShares: number;
  totalPool: number;
  userYesShares: number;
  userNoShares: number;
}

export interface OnchainPosition {
  positionId: number;
  accountId: string;
  feedId: string;
  isLong: boolean;
  margin: number;
  size: number;
  entryPrice: number;
  leverage: number;
  openedAt: number;
  isOpen: boolean;
}

export interface VaultBalances {
  total: number;
  locked: number;
  available: number;
  walletUSDC: number;
}

export function useOnchainData(accountId: `0x${string}` | null, evmAddress?: `0x${string}`) {
  const publicClient = usePublicClient();

  const [balances, setBalances] = useState<VaultBalances>({
    total: 0,
    locked: 0,
    available: 0,
    walletUSDC: 0,
  });

  const [markets, setMarkets] = useState<OnchainMarket[]>([]);
  const [positions, setPositions] = useState<OnchainPosition[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState<number>(Date.now());

  const fetchAllOnchainData = useCallback(async () => {
    if (!publicClient) return;
    setIsLoading(true);

    try {
      const config = getContractAddresses();

      // 1. Fetch Balances
      if (accountId) {
        const [totalBal, lockedBal, availBal] = await Promise.all([
          publicClient.readContract({
            address: config.RomeMarketVault,
            abi: VAULT_ABI,
            functionName: "collateralBalances",
            args: [accountId],
          }).catch(() => 0n),
          publicClient.readContract({
            address: config.RomeMarketVault,
            abi: VAULT_ABI,
            functionName: "lockedBalances",
            args: [accountId],
          }).catch(() => 0n),
          publicClient.readContract({
            address: config.RomeMarketVault,
            abi: VAULT_ABI,
            functionName: "getAvailableCollateral",
            args: [accountId],
          }).catch(() => 0n),
        ]);

        let walletBal = 0n;
        if (evmAddress) {
          walletBal = await publicClient.readContract({
            address: config.USDC,
            abi: ERC20_ABI,
            functionName: "balanceOf",
            args: [evmAddress],
          }).catch(() => 0n);
        }

        setBalances({
          total: Number(totalBal) / 1e6,
          locked: Number(lockedBal) / 1e6,
          available: Number(availBal) / 1e6,
          walletUSDC: Number(walletBal) / 1e6,
        });
      }

      // 2. Fetch Prediction Markets
      try {
        const nextId = (await publicClient.readContract({
          address: config.PredictionEngine,
          abi: PREDICTION_ABI,
          functionName: "nextMarketId",
        })) as bigint;

        const totalMarkets = Number(nextId) - 1;
        const loadedMarkets: OnchainMarket[] = [];

        for (let i = 1; i <= totalMarkets; i++) {
          try {
            const m = (await publicClient.readContract({
              address: config.PredictionEngine,
              abi: PREDICTION_ABI,
              functionName: "getMarket",
              args: [BigInt(i)],
            })) as any;

            let uYes = 0n;
            let uNo = 0n;
            if (accountId) {
              [uYes, uNo] = await Promise.all([
                publicClient.readContract({
                  address: config.PredictionEngine,
                  abi: PREDICTION_ABI,
                  functionName: "yesShares",
                  args: [BigInt(i), accountId],
                }).catch(() => 0n),
                publicClient.readContract({
                  address: config.PredictionEngine,
                  abi: PREDICTION_ABI,
                  functionName: "noShares",
                  args: [BigInt(i), accountId],
                }).catch(() => 0n),
              ]);
            }

            loadedMarkets.push({
              id: Number(m.id),
              question: m.question,
              feedId: m.feedId,
              targetPrice: Number(m.targetPrice) / 1e8,
              compType: Number(m.compType),
              expiryTimestamp: Number(m.expiryTimestamp),
              resolved: m.resolved,
              outcome: m.outcome,
              resolutionPrice: Number(m.resolutionPrice) / 1e8,
              totalYesShares: Number(m.totalYesShares) / 1e6,
              totalNoShares: Number(m.totalNoShares) / 1e6,
              totalPool: Number(m.totalPool) / 1e6,
              userYesShares: Number(uYes) / 1e6,
              userNoShares: Number(uNo) / 1e6,
            });
          } catch (e) {
            console.warn(`Could not load market #${i}`, e);
          }
        }
        setMarkets(loadedMarkets);
      } catch (e) {
        console.warn("No prediction engine found or call failed", e);
      }

      // 3. Fetch User Perps Positions
      if (accountId) {
        try {
          const posIds = (await publicClient.readContract({
            address: config.PerpsPositionManager,
            abi: PERPS_ABI,
            functionName: "getUserPositions",
            args: [accountId],
          })) as bigint[];

          const loadedPositions: OnchainPosition[] = [];
          for (const pid of posIds) {
            try {
              const pos = (await publicClient.readContract({
                address: config.PerpsPositionManager,
                abi: PERPS_ABI,
                functionName: "getPosition",
                args: [pid],
              })) as any;

              if (pos.isOpen) {
                loadedPositions.push({
                  positionId: Number(pos.positionId),
                  accountId: pos.accountId,
                  feedId: pos.feedId,
                  isLong: pos.isLong,
                  margin: Number(pos.margin) / 1e6,
                  size: Number(pos.size) / 1e6,
                  entryPrice: Number(pos.entryPrice) / 1e8,
                  leverage: Number(pos.leverage),
                  openedAt: Number(pos.openedAt),
                  isOpen: pos.isOpen,
                });
              }
            } catch (e) {
              console.warn(`Could not load position #${pid}`, e);
            }
          }
          setPositions(loadedPositions);
        } catch (e) {
          console.warn("Could not load user positions", e);
        }
      }

      setLastRefreshed(Date.now());
    } catch (e) {
      console.error("Error refreshing onchain data:", e);
    } finally {
      setIsLoading(false);
    }
  }, [publicClient, accountId, evmAddress]);

  useEffect(() => {
    fetchAllOnchainData();
    const interval = setInterval(fetchAllOnchainData, 5000);

    const handleContractUpdate = () => fetchAllOnchainData();
    window.addEventListener("janus_contracts_updated", handleContractUpdate);

    return () => {
      clearInterval(interval);
      window.removeEventListener("janus_contracts_updated", handleContractUpdate);
    };
  }, [fetchAllOnchainData]);

  return {
    balances,
    markets,
    positions,
    isLoading,
    lastRefreshed,
    refetch: fetchAllOnchainData,
  };
}
