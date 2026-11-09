"use client";

import React from "react";
import { WalletConnectors } from "./WalletConnectors";
import { FaucetButton } from "./FaucetButton";
import { useRomeOracle } from "@/hooks/useRomeOracle";
import { Zap, Activity } from "lucide-react";

export function Navbar() {
  const { btcPrice, solPrice } = useRomeOracle();

  return (
    <>
      <header className="border-b border-rome-border bg-rome-surface/90 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          {/* Brand Logo & Name */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-rome-red via-rome-crimson to-rome-gold flex items-center justify-center shadow-lg shadow-rome-red/30 flex-shrink-0">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-black text-lg tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-yellow-400 to-amber-500">
                  JANUS
                </span>
                <span className="text-[10px] uppercase px-1.5 py-0.5 rounded bg-rome-gold/15 text-rome-gold font-bold tracking-wider border border-rome-gold/30">
                  Dual-Lane
                </span>
              </div>
              <p className="text-[10px] text-gray-400">Prediction & Perps Protocol</p>
            </div>

            {/* Network Badge */}
            <div className="hidden xl:flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-stone-900 border border-stone-800 text-[11px] ml-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-stone-300 font-medium">Hadrian (200010)</span>
              <span className="text-stone-600">|</span>
              <span className="text-stone-400">Gas: USDC</span>
            </div>
          </div>

          {/* Pyth Oracle Live Feeds */}
          <div className="hidden lg:flex items-center gap-3 px-3 py-1 bg-black/40 rounded-lg border border-rome-border/60 text-xs font-mono">
            <div className="flex items-center gap-1.5 text-gray-400">
              <Activity className="w-3.5 h-3.5 text-rome-gold animate-pulse" />
              <span className="text-gray-500 text-[11px]">Pyth L1:</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="font-semibold text-gray-400">BTC</span>
              <span className="text-emerald-400 font-medium">{btcPrice.formatted}</span>
            </div>
            <div className="w-px h-3 bg-rome-border" />
            <div className="flex items-center gap-1">
              <span className="font-semibold text-gray-400">SOL</span>
              <span className="text-emerald-400 font-medium">{solPrice.formatted}</span>
            </div>
          </div>

          {/* Action Tools & Connectors */}
          <div className="flex items-center gap-2.5">
            {/* Faucet Button */}
            <FaucetButton />

            {/* Dual-Lane Connectors with Disconnect */}
            <WalletConnectors />
          </div>
        </div>
      </header>
    </>
  );
}
