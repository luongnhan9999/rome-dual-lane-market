"use client";

import React, { useState } from "react";
import { useDualLaneSigner } from "@/hooks/useDualLaneSigner";
import { Droplet, CheckCircle2, AlertTriangle, RefreshCw } from "lucide-react";

export function FaucetButton() {
  const { isEvmConnected, isWrongNetwork, switchToHadrian, mintFaucet, isPending } =
    useDualLaneSigner();
  const [feedback, setFeedback] = useState<{ text: string; isError?: boolean } | null>(null);

  const handleMint = async () => {
    if (!isEvmConnected) {
      setFeedback({ text: "Please connect MetaMask first", isError: true });
      setTimeout(() => setFeedback(null), 4000);
      return;
    }

    if (isWrongNetwork) {
      try {
        await switchToHadrian();
        return;
      } catch {
        setFeedback({ text: "Please switch to Rome Hadrian Testnet", isError: true });
        setTimeout(() => setFeedback(null), 4000);
        return;
      }
    }

    try {
      await mintFaucet(1000);
      setFeedback({ text: "1,000 USDC minted to your wallet!" });
      setTimeout(() => setFeedback(null), 4000);
    } catch (e: any) {
      setFeedback({ text: e?.message || "Faucet minting failed", isError: true });
      setTimeout(() => setFeedback(null), 4000);
    }
  };

  return (
    <div className="relative inline-flex items-center">
      <button
        disabled={isPending}
        onClick={handleMint}
        className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-all shadow-md ${
          isWrongNetwork
            ? "bg-amber-950/70 border border-amber-500/50 text-amber-300 hover:bg-amber-900/80"
            : "bg-emerald-950/70 border border-emerald-500/50 text-emerald-300 hover:bg-emerald-900/80 hover:border-emerald-400 shadow-emerald-900/20"
        } disabled:opacity-50`}
        title={
          isWrongNetwork
            ? "Click to switch to Rome Hadrian Testnet"
            : "Mint 1,000 Testnet USDC on Rome Hadrian"
        }
      >
        {isPending ? (
          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
        ) : isWrongNetwork ? (
          <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
        ) : (
          <Droplet className="w-3.5 h-3.5 text-emerald-400" />
        )}
        {isWrongNetwork ? "Switch to Hadrian" : "Faucet 1,000 USDC"}
      </button>

      {feedback && (
        <div
          className={`absolute top-10 right-0 z-50 border rounded-lg px-3 py-1.5 text-xs flex items-center gap-1.5 shadow-xl whitespace-nowrap animate-fade-in ${
            feedback.isError
              ? "bg-red-950 border-red-500 text-red-200"
              : "bg-emerald-950 border-emerald-500 text-emerald-200"
          }`}
        >
          {feedback.isError ? (
            <AlertTriangle className="w-4 h-4 text-rose-400" />
          ) : (
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          )}
          <span>{feedback.text}</span>
        </div>
      )}
    </div>
  );
}
