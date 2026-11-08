"use client";

import React, { useState } from "react";
import { useDualLaneSigner } from "@/hooks/useDualLaneSigner";
import { useRomeOracle } from "@/hooks/useRomeOracle";
import { useOnchainData, OnchainPosition } from "@/hooks/useOnchainData";
import { ROME_CONSTANTS } from "@/config/chains";
import {
  Layers,
  ArrowUpRight,
  ArrowDownRight,
  XCircle,
  RefreshCw,
  Skull,
  ShieldAlert,
  CheckCircle2,
} from "lucide-react";

export function PositionTable() {
  const { sessionType, accountId, closePerpPosition, liquidatePosition, isPending } =
    useDualLaneSigner();
  const { btcPrice, solPrice } = useRomeOracle();
  const { positions, isLoading, refetch, lastRefreshed } = useOnchainData(accountId as any);

  const [actionMsg, setActionMsg] = useState<string | null>(null);

  const handleClose = async (positionId: number) => {
    try {
      await closePerpPosition(BigInt(positionId));
      setActionMsg(`Position #${positionId} closed successfully on-chain!`);
      setTimeout(() => setActionMsg(null), 4000);
      refetch();
    } catch (err: any) {
      console.error(err);
    }
  };

  const handleLiquidate = async (positionId: number) => {
    try {
      await liquidatePosition(BigInt(positionId));
      setActionMsg(`Liquidated Position #${positionId}! 5% keeper reward earned.`);
      setTimeout(() => setActionMsg(null), 4000);
      refetch();
    } catch (err: any) {
      console.error(err);
    }
  };

  return (
    <div className="bg-rome-surfaceLight/90 border border-rome-border rounded-xl overflow-hidden shadow-xl">
      {/* Header */}
      <div className="px-5 py-4 border-b border-rome-border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-rome-gold" />
          <h3 className="text-sm font-bold text-gray-100">
            Unified Shared-State Positions & Exposure
          </h3>
          <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-black/40 text-gray-400 border border-rome-border">
            {positions.length} Open
          </span>
        </div>

        <div className="flex items-center gap-3 text-xs">
          <button
            onClick={() => refetch()}
            disabled={isLoading}
            className="flex items-center gap-1 text-gray-400 hover:text-white transition font-mono text-[11px]"
          >
            <RefreshCw className={`w-3 h-3 ${isLoading ? "animate-spin text-rome-gold" : ""}`} />
            Sync Chain
          </button>
          <div className="text-xs text-gray-400 font-mono">
            Session:{" "}
            <span className="text-rome-gold font-semibold">
              {accountId ? `${accountId.slice(0, 8)}...${accountId.slice(-6)}` : "Disconnected"}
            </span>
          </div>
        </div>
      </div>

      {actionMsg && (
        <div className="mx-5 my-3 p-2.5 bg-emerald-950/60 border border-emerald-500/50 rounded-lg text-emerald-300 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          <span>{actionMsg}</span>
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-black/40 text-gray-400 uppercase font-semibold border-b border-rome-border text-[11px]">
            <tr>
              <th className="px-5 py-3">Market</th>
              <th className="px-5 py-3">Side & Lev</th>
              <th className="px-5 py-3">Margin (USDC)</th>
              <th className="px-5 py-3">Position Size</th>
              <th className="px-5 py-3">Entry Price</th>
              <th className="px-5 py-3">Pyth Oracle</th>
              <th className="px-5 py-3">PnL ($ / %)</th>
              <th className="px-5 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-rome-border/60">
            {positions.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-5 py-10 text-center text-gray-400">
                  <div className="max-w-md mx-auto space-y-2">
                    <p className="font-semibold text-gray-300">
                      No active perpetual positions open for this account.
                    </p>
                    <p className="text-[11px] text-gray-500 leading-relaxed">
                      Positions opened with either MetaMask or Phantom settle into this unified
                      account state. Open a BTC or SOL 10x perp position above to begin trading with
                      sub-second Rome finality.
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              positions.map((pos) => {
                const isBtc =
                  pos.feedId.toLowerCase() === ROME_CONSTANTS.FEEDS.PYTH_BTC_USD.toLowerCase();
                const feedSymbol = isBtc ? "BTC" : "SOL";
                const currentPrice = isBtc ? btcPrice.price : solPrice.price;

                const priceDiff = pos.isLong
                  ? currentPrice - pos.entryPrice
                  : pos.entryPrice - currentPrice;
                const pnlUsd = (pos.size * priceDiff) / (pos.entryPrice || 1);
                const pnlPct = (pnlUsd / (pos.margin || 1)) * 100;
                const isProfit = pnlUsd >= 0;

                // Underwater check: loss >= 80% of margin
                const isUnderwater = pnlUsd < 0 && Math.abs(pnlUsd) >= pos.margin * 0.8;

                return (
                  <tr key={pos.positionId} className="hover:bg-black/20 transition-colors">
                    <td className="px-5 py-3.5 font-bold text-gray-200">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-gray-400 text-[10px]">
                          #{pos.positionId}
                        </span>
                        <span>{feedSymbol}/USD-PERP</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <span
                        className={`inline-flex items-center gap-1 font-bold px-2 py-0.5 rounded text-[11px] ${
                          pos.isLong
                            ? "bg-emerald-950/60 text-emerald-400 border border-emerald-500/30"
                            : "bg-rose-950/60 text-rose-400 border border-rose-500/30"
                        }`}
                      >
                        {pos.isLong ? (
                          <ArrowUpRight className="w-3 h-3" />
                        ) : (
                          <ArrowDownRight className="w-3 h-3" />
                        )}
                        {pos.isLong ? "LONG" : "SHORT"} {pos.leverage}x
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-gray-200 font-mono">
                      ${pos.margin.toFixed(2)}
                    </td>
                    <td className="px-5 py-3.5 text-gray-200 font-mono">
                      ${pos.size.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-5 py-3.5 text-gray-300 font-mono">
                      ${pos.entryPrice.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-5 py-3.5 text-emerald-400 font-mono">
                      $
                      {currentPrice.toLocaleString("en-US", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </td>
                    <td className="px-5 py-3.5 font-mono">
                      <span
                        className={`font-bold ${
                          isProfit ? "text-emerald-400" : "text-rose-400"
                        }`}
                      >
                        {isProfit ? "+" : ""}${pnlUsd.toFixed(2)} ({isProfit ? "+" : ""}
                        {pnlPct.toFixed(1)}%)
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {isUnderwater && (
                          <button
                            disabled={isPending}
                            onClick={() => handleLiquidate(pos.positionId)}
                            className="px-2.5 py-1 text-[11px] font-semibold rounded bg-amber-950/60 hover:bg-amber-900/80 text-amber-300 border border-amber-500/40 transition-all flex items-center gap-1"
                            title="Liquidate underwater position to earn 5% keeper fee"
                          >
                            <Skull className="w-3 h-3" />
                            Liquidate
                          </button>
                        )}
                        <button
                          disabled={isPending}
                          onClick={() => handleClose(pos.positionId)}
                          className="px-2.5 py-1 text-[11px] font-semibold rounded bg-red-950/40 hover:bg-red-900/60 text-red-300 border border-red-500/30 transition-all flex items-center gap-1"
                        >
                          <XCircle className="w-3 h-3" />
                          Close
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
