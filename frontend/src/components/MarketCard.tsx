"use client";

import React, { useState } from "react";
import { useDualLaneSigner } from "@/hooks/useDualLaneSigner";
import { useRomeOracle } from "@/hooks/useRomeOracle";
import { TrendingUp, Clock, AlertCircle, CheckCircle2, ArrowRight } from "lucide-react";

export interface MarketData {
  id: number;
  question: string;
  targetPrice: number;
  compType: "GREATER_OR_EQUAL" | "LESS_OR_EQUAL";
  feedSymbol: "BTC" | "SOL";
  expiryDate: string;
  totalYesShares: number;
  totalNoShares: number;
  resolved: boolean;
  outcome?: boolean;
}

interface MarketCardProps {
  market: MarketData;
}

export function MarketCard({ market }: MarketCardProps) {
  const { sessionType, buyPredictionShares, isPending } = useDualLaneSigner();
  const { btcPrice, solPrice } = useRomeOracle();
  const [collateralAmount, setCollateralAmount] = useState("50");
  const [selectedOutcome, setSelectedOutcome] = useState<"YES" | "NO">("YES");
  const [tradeSuccess, setTradeSuccess] = useState<string | null>(null);

  const currentPrice = market.feedSymbol === "BTC" ? btcPrice.price : solPrice.price;
  const currentPriceFormatted = market.feedSymbol === "BTC" ? btcPrice.formatted : solPrice.formatted;

  const totalShares = market.totalYesShares + market.totalNoShares;
  const yesPct = totalShares > 0 ? Math.round((market.totalYesShares / totalShares) * 100) : 50;
  const noPct = 100 - yesPct;

  const handleBuy = async () => {
    try {
      const amountParsed = BigInt(Math.floor(parseFloat(collateralAmount) * 1e6));
      const isYes = selectedOutcome === "YES";
      const res = await buyPredictionShares(BigInt(market.id), isYes, amountParsed);
      setTradeSuccess(`Successfully bought ${collateralAmount} USDC of ${selectedOutcome} shares!`);
      setTimeout(() => setTradeSuccess(null), 5000);
    } catch (err: any) {
      console.error(err);
    }
  };

  return (
    <div className="bg-rome-surfaceLight/80 border border-rome-border rounded-xl p-5 hover:border-rome-gold/40 transition-all duration-300 shadow-lg relative overflow-hidden flex flex-col justify-between">
      {/* Top Banner */}
      <div>
        <div className="flex items-center justify-between mb-3 text-xs">
          <span className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-amber-500/10 text-rome-gold font-medium border border-amber-500/20">
            <TrendingUp className="w-3 h-3" />
            {market.feedSymbol}/USD Pyth Oracle
          </span>
          <span className="flex items-center gap-1 text-gray-400">
            <Clock className="w-3 h-3 text-gray-500" />
            Resolves: {market.expiryDate}
          </span>
        </div>

        {/* Question */}
        <h3 className="text-base font-bold text-gray-100 mb-3">{market.question}</h3>

        {/* Target & Oracle Compare */}
        <div className="grid grid-cols-2 gap-2 mb-4 bg-black/30 p-2.5 rounded-lg border border-rome-border/50 text-xs">
          <div>
            <span className="text-gray-400 block text-[11px]">Target Price:</span>
            <span className="font-semibold text-gray-200">
              ${market.targetPrice.toLocaleString("en-US")}
            </span>
          </div>
          <div>
            <span className="text-gray-400 block text-[11px]">Current Pyth Price:</span>
            <span className="font-semibold text-emerald-400 font-mono">
              {currentPriceFormatted}
            </span>
          </div>
        </div>

        {/* Pool Probability Bar */}
        <div className="mb-4">
          <div className="flex justify-between text-xs font-semibold mb-1">
            <span className="text-emerald-400">YES {yesPct}%</span>
            <span className="text-rose-400">NO {noPct}%</span>
          </div>
          <div className="w-full h-2.5 bg-rose-950/40 rounded-full overflow-hidden flex">
            <div
              className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-500"
              style={{ width: `${yesPct}%` }}
            />
          </div>
        </div>
      </div>

      {/* Trade Controls */}
      <div>
        {tradeSuccess && (
          <div className="flex items-center gap-1.5 p-2 mb-3 bg-emerald-950/40 border border-emerald-500/40 rounded text-emerald-300 text-xs">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            <span>{tradeSuccess}</span>
          </div>
        )}

        <div className="flex gap-2 mb-3">
          <button
            onClick={() => setSelectedOutcome("YES")}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
              selectedOutcome === "YES"
                ? "bg-emerald-600 text-white shadow-[0_0_12px_rgba(16,185,129,0.3)]"
                : "bg-slate-900 text-gray-400 border border-rome-border hover:text-white"
            }`}
          >
            BUY YES
          </button>
          <button
            onClick={() => setSelectedOutcome("NO")}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
              selectedOutcome === "NO"
                ? "bg-rose-600 text-white shadow-[0_0_12px_rgba(244,63,94,0.3)]"
                : "bg-slate-900 text-gray-400 border border-rome-border hover:text-white"
            }`}
          >
            BUY NO
          </button>
        </div>

        <div className="flex items-center gap-2 mb-3">
          <div className="relative flex-1">
            <input
              type="number"
              value={collateralAmount}
              onChange={(e) => setCollateralAmount(e.target.value)}
              placeholder="Collateral (USDC)"
              className="w-full bg-black/40 border border-rome-border rounded-lg px-3 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-rome-gold"
            />
            <span className="absolute right-2.5 top-2 text-[10px] text-gray-400 font-semibold">
              USDC
            </span>
          </div>
          <button
            disabled={sessionType === "none" || isPending}
            onClick={handleBuy}
            className={`px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
              sessionType === "none"
                ? "bg-gray-800 text-gray-500 cursor-not-allowed"
                : selectedOutcome === "YES"
                ? "bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black shadow-md shadow-emerald-500/20"
                : "bg-rose-500 hover:bg-rose-400 text-white font-black shadow-md shadow-rose-500/20"
            }`}
          >
            {isPending ? "Submitting..." : "Trade"}
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <p className="text-[10px] text-gray-400 text-center">
          Settles directly into Rome Unified Vault with 400ms finality.
        </p>
      </div>
    </div>
  );
}
