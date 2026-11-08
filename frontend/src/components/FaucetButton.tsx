"use client";

import React, { useState } from "react";
import { useDualLaneSigner } from "@/hooks/useDualLaneSigner";
import { Droplet, CheckCircle2, RefreshCw } from "lucide-react";

export function FaucetButton() {
  const { isEvmConnected, mintFaucet, isPending } = useDualLaneSigner();
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleMint = async () => {
    try {
      await mintFaucet(1000);
      setSuccessMsg("1,000 USDC minted!");
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (e: any) {
      console.error(e);
    }
  };

  return (
    <div className="relative inline-flex items-center">
      <button
        disabled={!isEvmConnected || isPending}
        onClick={handleMint}
        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg bg-emerald-950/70 border border-emerald-500/50 text-emerald-300 hover:bg-emerald-900/80 hover:border-emerald-400 transition-all shadow-md shadow-emerald-900/20 disabled:opacity-40"
        title="Mint 1,000 Testnet USDC on Rome Hadrian"
      >
        {isPending ? (
          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
        ) : (
          <Droplet className="w-3.5 h-3.5 text-emerald-400" />
        )}
        Faucet 1,000 USDC
      </button>

      {successMsg && (
        <div className="absolute top-10 right-0 z-50 bg-emerald-950 border border-emerald-500 rounded-lg px-3 py-1.5 text-xs text-emerald-200 flex items-center gap-1.5 shadow-xl whitespace-nowrap animate-fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{successMsg}</span>
        </div>
      )}
    </div>
  );
}
