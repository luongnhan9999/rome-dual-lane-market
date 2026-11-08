"use client";

import React, { useState } from "react";
import { useDualLaneSigner } from "@/hooks/useDualLaneSigner";
import { useRomeOracle } from "@/hooks/useRomeOracle";
import { OnchainMarket } from "@/hooks/useOnchainData";
import { TrendingUp, Clock, CheckCircle2, ArrowRight, Award, Zap, AlertCircle } from "lucide-react";

interface MarketCardProps {
  market: OnchainMarket;
  onActionSuccess?: () => void;
}

export function MarketCard({ market, onActionSuccess }: MarketCardProps) {
  const { sessionType, buyPredictionShares, resolveMarket, claimWinnings, isPending } =
    useDualLaneSigner();
  const { btcPrice, solPrice } = useRomeOracle();

  const [collateralAmount, setCollateralAmount] = useState("50");
  const [selectedOutcome, setSelectedOutcome] = useState<"YES" | "NO">("YES");
  const [actionMsg, setActionMsg] = useState<string | null>(null);

  const isBtc = market.feedId.toLowerCase().includes("e62df6e0") || market.question.toLowerCase().includes("btc") || market.question.toLowerCase().includes("bitcoin");
  const currentPrice = isBtc ? btcPrice.price : solPrice.price;
  const currentPriceFormatted = isBtc ? btcPrice.formatted : solPrice.formatted;

  const totalShares = market.totalYesShares + market.totalNoShares;
  const yesPct = totalShares > 0 ? Math.round((market.totalYesShares / totalShares) * 100) : 50;
  const noPct = 100 - yesPct;

  const nowSeconds = Math.floor(Date.now() / 1000);
  const isExpired = nowSeconds >= market.expiryTimestamp;
  const timeLeftSeconds = Math.max(0, market.expiryTimestamp - nowSeconds);
  const daysLeft = Math.floor(timeLeftSeconds / 86400);
  const hoursLeft = Math.floor((timeLeftSeconds % 86400) / 3600);

  const handleBuy = async () => {
    try {
      const amountParsed = BigInt(Math.floor(parseFloat(collateralAmount) * 1e6));
      const isYes = selectedOutcome === "YES";
      await buyPredictionShares(BigInt(market.id), isYes, amountParsed);
      setActionMsg(`Purchased ${collateralAmount} USDC of ${selectedOutcome} shares!`);
      setTimeout(() => setActionMsg(null), 4000);
      onActionSuccess?.();
    } catch (err: any) {
      console.error(err);
    }
  };

  const handleResolve = async () => {
    try {
      await resolveMarket(BigInt(market.id));
      setActionMsg("Market resolved via Pyth Oracle!");
      setTimeout(() => setActionMsg(null), 4000);
      onActionSuccess?.();
    } catch (err: any) {
      console.error(err);
    }
  };

  const handleClaim = async () => {
    try {
      await claimWinnings(BigInt(market.id));
      setActionMsg("Winnings credited to your Vault balance!");
      setTimeout(() => setActionMsg(null), 4000);
      onActionSuccess?.();
    } catch (err: any) {
      console.error(err);
    }
  };

  const hasWinningShares = market.resolved && (market.outcome ? market.userYesShares > 0 : market.userNoShares > 0);

  return (
    <div className="bg-rome-surfaceLight border border-rome-border rounded-xl p-5 hover:border-rome-gold/40 transition-all duration-300 shadow-xl flex flex-col justify-between relative overflow-hidden">
      {/* Top Banner */}
      <div>
        <div className="flex items-center justify-between mb-3 text-xs">
          <span className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-amber-500/10 text-rome-gold font-medium border border-amber-500/20">
            <TrendingUp className="w-3 h-3" />
            {isBtc ? "BTC" : "SOL"} Pyth L1 Oracle
          </span>
          <span className="flex items-center gap-1 text-gray-400 font-mono text-[11px]">
            <Clock className="w-3 h-3 text-gray-500" />
            {market.resolved
              ? "Resolved"
              : isExpired
              ? "Expired (Pending Oracle)"
              : `${daysLeft}d ${hoursLeft}h left`}
          </span>
        </div>

        {/* Question */}
        <h3 className="text-sm font-bold text-gray-100 mb-3 leading-snug">{market.question}</h3>

        {/* Target & Real-Time Price Compare */}
        <div className="grid grid-cols-2 gap-2 mb-4 bg-black/40 p-2.5 rounded-lg border border-rome-border/60 text-xs font-mono">
          <div>
            <span className="text-gray-400 block text-[10px] uppercase font-sans">Target Strike:</span>
            <span className="font-semibold text-gray-200">
              ${market.targetPrice.toLocaleString("en-US")}
            </span>
          </div>
          <div>
            <span className="text-gray-400 block text-[10px] uppercase font-sans">Pyth L1 Feed:</span>
            <span className="font-semibold text-emerald-400">
              {currentPriceFormatted}
            </span>
          </div>
        </div>

        {/* Pool Probability Bar */}
        <div className="mb-4">
          <div className="flex justify-between text-xs font-semibold mb-1">
            <span className="text-emerald-400">YES {yesPct}% (${market.totalYesShares.toFixed(0)})</span>
            <span className="text-rose-400">NO {noPct}% (${market.totalNoShares.toFixed(0)})</span>
          </div>
          <div className="w-full h-2 bg-rose-950/50 rounded-full overflow-hidden flex">
            <div
              className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-500"
              style={{ width: `${yesPct}%` }}
            />
          </div>
        </div>

        {/* User Holdings */}
        {(market.userYesShares > 0 || market.userNoShares > 0) && (
          <div className="p-2 mb-3 bg-slate-900 border border-rome-border rounded-lg text-[11px] flex justify-between font-mono text-gray-300">
            <span>Your Shares:</span>
            <span className="text-rome-gold font-bold">
              YES: {market.userYesShares.toFixed(1)} | NO: {market.userNoShares.toFixed(1)}
            </span>
          </div>
        )}
      </div>

      {/* Trade or Resolution Controls */}
      <div>
        {actionMsg && (
          <div className="flex items-center gap-1.5 p-2 mb-3 bg-emerald-950/60 border border-emerald-500/50 rounded-lg text-emerald-300 text-xs">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            <span>{actionMsg}</span>
          </div>
        )}

        {/* Case 1: Market Resolved */}
        {market.resolved ? (
          <div className="space-y-2">
            <div className="p-2.5 rounded-lg bg-black/50 border border-rome-border text-center text-xs">
              <span className="text-gray-400">Outcome: </span>
              <span className={`font-bold ${market.outcome ? "text-emerald-400" : "text-rose-400"}`}>
                {market.outcome ? "YES WON" : "NO WON"}
              </span>
              <span className="text-gray-500 text-[11px] block">
                Settled at ${market.resolutionPrice.toLocaleString()}
              </span>
            </div>
            {hasWinningShares && (
              <button
                disabled={isPending}
                onClick={handleClaim}
                className="w-full py-2 bg-rome-gold hover:bg-rome-darkGold text-black font-bold rounded-lg text-xs flex items-center justify-center gap-1.5 shadow-md"
              >
                <Award className="w-4 h-4" />
                Claim Winnings to Vault
              </button>
            )}
          </div>
        ) : isExpired ? (
          /* Case 2: Market Expired - Ready for Keeper Resolution */
          <div className="space-y-2">
            <p className="text-[11px] text-amber-300 text-center">
              Trading ended. Trigger settlement with live Pyth oracle feed.
            </p>
            <button
              disabled={isPending || sessionType === "none"}
              onClick={handleResolve}
              className="w-full py-2 bg-amber-500 hover:bg-amber-400 text-black font-bold rounded-lg text-xs flex items-center justify-center gap-1.5 shadow-md"
            >
              <Zap className="w-4 h-4" />
              Resolve Market with Pyth Oracle
            </button>
          </div>
        ) : (
          /* Case 3: Market Active - Trade YES / NO */
          <div>
            <div className="flex gap-2 mb-3">
              <button
                onClick={() => setSelectedOutcome("YES")}
                className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
                  selectedOutcome === "YES"
                    ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/30"
                    : "bg-slate-900 text-gray-400 border border-rome-border hover:text-white"
                }`}
              >
                BUY YES
              </button>
              <button
                onClick={() => setSelectedOutcome("NO")}
                className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
                  selectedOutcome === "NO"
                    ? "bg-rose-600 text-white shadow-md shadow-rose-600/30"
                    : "bg-slate-900 text-gray-400 border border-rome-border hover:text-white"
                }`}
              >
                BUY NO
              </button>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <input
                  type="number"
                  value={collateralAmount}
                  onChange={(e) => setCollateralAmount(e.target.value)}
                  placeholder="USDC"
                  className="w-full bg-black/50 border border-rome-border rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-rome-gold"
                />
                <span className="absolute right-2.5 top-1.5 text-[10px] text-gray-400 font-bold">
                  USDC
                </span>
              </div>
              <button
                disabled={sessionType === "none" || isPending}
                onClick={handleBuy}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                  sessionType === "none"
                    ? "bg-gray-800 text-gray-500 cursor-not-allowed"
                    : selectedOutcome === "YES"
                    ? "bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold"
                    : "bg-rose-500 hover:bg-rose-400 text-white font-extrabold"
                }`}
              >
                {isPending ? "Executing..." : "Trade"}
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
