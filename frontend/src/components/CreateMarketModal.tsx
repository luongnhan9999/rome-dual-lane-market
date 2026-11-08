"use client";

import React, { useState } from "react";
import { useDualLaneSigner } from "@/hooks/useDualLaneSigner";
import { ROME_CONSTANTS } from "@/config/chains";
import { PlusCircle, X, CheckCircle2, AlertTriangle, ArrowRight } from "lucide-react";

interface CreateMarketModalProps {
  isOpen: boolean;
  onClose: () => void;
  onMarketCreated?: () => void;
}

export function CreateMarketModal({ isOpen, onClose, onMarketCreated }: CreateMarketModalProps) {
  const { createMarket, isPending } = useDualLaneSigner();

  const [question, setQuestion] = useState("");
  const [asset, setAsset] = useState<"BTC" | "SOL">("BTC");
  const [targetPrice, setTargetPrice] = useState("80000");
  const [compType, setCompType] = useState<number>(0); // 0: >=, 1: <=
  const [durationDays, setDurationDays] = useState<number>(7);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setFeedback(null);

    if (!question.trim()) {
      setErrorMsg("Please enter a market question");
      return;
    }

    try {
      const feedId =
        asset === "BTC"
          ? ROME_CONSTANTS.FEEDS.PYTH_BTC_USD
          : ROME_CONSTANTS.FEEDS.PYTH_SOL_USD;

      const targetPriceScaled = BigInt(Math.floor(parseFloat(targetPrice) * 1e8));
      const durationSeconds = durationDays * 86400;

      await createMarket(question, feedId, targetPriceScaled, compType, durationSeconds);
      setFeedback("Market successfully created on-chain!");
      setTimeout(() => {
        onMarketCreated?.();
        onClose();
      }, 1500);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err?.message || "Failed to create market");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-[#12131A] border border-rome-border rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="px-6 py-4 border-b border-rome-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <PlusCircle className="w-5 h-5 text-rome-gold" />
            <h2 className="text-base font-bold text-white">Create On-Chain Market</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-gray-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          {errorMsg && (
            <div className="p-3 bg-red-950/40 border border-red-500/40 rounded-xl text-red-300 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {feedback && (
            <div className="p-3 bg-emerald-950/40 border border-emerald-500/40 rounded-xl text-emerald-300 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
              <span>{feedback}</span>
            </div>
          )}

          {/* Question */}
          <div>
            <label className="block text-gray-300 font-semibold mb-1">Market Question</label>
            <input
              type="text"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="e.g. Will Bitcoin break $85,000 this month?"
              className="w-full bg-black/40 border border-rome-border rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-rome-gold text-xs"
              required
            />
          </div>

          {/* Asset Selection */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-gray-300 font-semibold mb-1">Underlying Asset</label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setAsset("BTC");
                    setTargetPrice("80000");
                  }}
                  className={`flex-1 py-2 rounded-lg font-bold border transition ${
                    asset === "BTC"
                      ? "bg-amber-500/20 border-amber-500/50 text-amber-300"
                      : "bg-black/30 border-rome-border text-gray-400"
                  }`}
                >
                  BTC / USD
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAsset("SOL");
                    setTargetPrice("100");
                  }}
                  className={`flex-1 py-2 rounded-lg font-bold border transition ${
                    asset === "SOL"
                      ? "bg-emerald-500/20 border-emerald-500/50 text-emerald-300"
                      : "bg-black/30 border-rome-border text-gray-400"
                  }`}
                >
                  SOL / USD
                </button>
              </div>
            </div>

            <div>
              <label className="block text-gray-300 font-semibold mb-1">Resolution Logic</label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setCompType(0)}
                  className={`flex-1 py-2 rounded-lg font-bold border transition ${
                    compType === 0
                      ? "bg-emerald-500/20 border-emerald-500/50 text-emerald-300"
                      : "bg-black/30 border-rome-border text-gray-400"
                  }`}
                >
                  Price ≥ Target
                </button>
                <button
                  type="button"
                  onClick={() => setCompType(1)}
                  className={`flex-1 py-2 rounded-lg font-bold border transition ${
                    compType === 1
                      ? "bg-rose-500/20 border-rose-500/50 text-rose-300"
                      : "bg-black/30 border-rome-border text-gray-400"
                  }`}
                >
                  Price ≤ Target
                </button>
              </div>
            </div>
          </div>

          {/* Target Price */}
          <div>
            <label className="block text-gray-300 font-semibold mb-1">Target Strike Price ($)</label>
            <input
              type="number"
              value={targetPrice}
              onChange={(e) => setTargetPrice(e.target.value)}
              placeholder="e.g. 80000"
              className="w-full bg-black/40 border border-rome-border rounded-lg px-3 py-2 text-white focus:outline-none focus:border-rome-gold text-xs"
              required
            />
          </div>

          {/* Duration */}
          <div>
            <label className="block text-gray-300 font-semibold mb-1">Trading Period</label>
            <div className="grid grid-cols-4 gap-2">
              {[1, 3, 7, 14].map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setDurationDays(d)}
                  className={`py-1.5 rounded-lg font-semibold border text-center transition ${
                    durationDays === d
                      ? "bg-rome-gold/20 border-rome-gold text-rome-gold"
                      : "bg-black/30 border-rome-border text-gray-400"
                  }`}
                >
                  {d} {d === 1 ? "Day" : "Days"}
                </button>
              ))}
            </div>
          </div>

          {/* Submit */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={isPending}
              className="w-full py-2.5 rounded-lg font-bold bg-rome-gold hover:bg-rome-darkGold text-black flex items-center justify-center gap-2 transition disabled:opacity-50 text-xs shadow-md"
            >
              {isPending ? "Submitting to Chain..." : "Deploy Market On-Chain"}
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
