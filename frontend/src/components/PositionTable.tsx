"use client";

import React, { useState } from "react";
import { useDualLaneSigner } from "@/hooks/useDualLaneSigner";
import { useRomeOracle } from "@/hooks/useRomeOracle";
import { Layers, ArrowUpRight, ArrowDownRight, XCircle, RefreshCw } from "lucide-react";

export interface MockPosition {
  id: number;
  feedSymbol: "BTC" | "SOL";
  isLong: boolean;
  margin: number;
  size: number;
  entryPrice: number;
  leverage: number;
  openedAt: string;
}

export function PositionTable() {
  const { sessionType, accountId, closePerpPosition, isPending } = useDualLaneSigner();
  const { btcPrice, solPrice } = useRomeOracle();

  // Active positions (demonstrating cross-lane state)
  const [positions, setPositions] = useState<MockPosition[]>([
    {
      id: 1,
      feedSymbol: "BTC",
      isLong: true,
      margin: 100,
      size: 500,
      entryPrice: 91200,
      leverage: 5,
      openedAt: "10 mins ago",
    },
    {
      id: 2,
      feedSymbol: "SOL",
      isLong: false,
      margin: 50,
      size: 500,
      entryPrice: 220,
      leverage: 10,
      openedAt: "25 mins ago",
    },
  ]);

  const handleClose = async (id: number) => {
    try {
      await closePerpPosition(BigInt(id));
      setPositions((prev) => prev.filter((p) => p.id !== id));
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="bg-rome-surfaceLight/90 border border-rome-border rounded-xl overflow-hidden shadow-xl">
      <div className="px-5 py-4 border-b border-rome-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-rome-gold" />
          <h3 className="text-sm font-bold text-gray-100">
            Unified Shared-State Positions & Exposure
          </h3>
        </div>
        <div className="text-xs text-gray-400 font-mono">
          Session ID: <span className="text-rome-gold">{accountId ? `${accountId.slice(0, 10)}...${accountId.slice(-6)}` : "None"}</span>
        </div>
      </div>

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
              <th className="px-5 py-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-rome-border/60">
            {positions.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-5 py-8 text-center text-gray-500">
                  No active perpetual positions open for this account.
                </td>
              </tr>
            ) : (
              positions.map((pos) => {
                const currentPrice = pos.feedSymbol === "BTC" ? btcPrice.price : solPrice.price;
                const priceDiff = pos.isLong
                  ? currentPrice - pos.entryPrice
                  : pos.entryPrice - currentPrice;
                const pnlUsd = (pos.size * priceDiff) / pos.entryPrice;
                const pnlPct = (pnlUsd / pos.margin) * 100;
                const isProfit = pnlUsd >= 0;

                return (
                  <tr key={pos.id} className="hover:bg-black/20 transition-colors">
                    <td className="px-5 py-3.5 font-bold text-gray-200">
                      {pos.feedSymbol}/USD-PERP
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
                      ${pos.size.toLocaleString()}
                    </td>
                    <td className="px-5 py-3.5 text-gray-300 font-mono">
                      ${pos.entryPrice.toLocaleString()}
                    </td>
                    <td className="px-5 py-3.5 text-emerald-400 font-mono">
                      ${currentPrice.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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
                      <button
                        disabled={isPending}
                        onClick={() => handleClose(pos.id)}
                        className="px-2.5 py-1 text-[11px] font-semibold rounded bg-red-950/40 hover:bg-red-900/60 text-red-300 border border-red-500/30 transition-all flex items-center gap-1 ml-auto"
                      >
                        <XCircle className="w-3 h-3" />
                        Close
                      </button>
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
