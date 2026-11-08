"use client";

import React from "react";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import { useWallet } from "@solana/wallet-adapter-react";
import { useDualLaneSigner } from "@/hooks/useDualLaneSigner";
import { Shield, Cpu, ExternalLink, KeyRound } from "lucide-react";

export function WalletConnectors() {
  const { sessionType, accountId, displayAddress } = useDualLaneSigner();
  const { setVisible: setSolanaModalVisible } = useWalletModal();
  const { connected: isSolConnected, disconnect: disconnectSolana, publicKey } = useWallet();

  return (
    <div className="flex flex-wrap items-center gap-3">
      {/* Active Session Status Badge */}
      {sessionType !== "none" && (
        <div className="flex items-center gap-2 bg-rome-surfaceLight border border-rome-border px-3 py-1.5 rounded-lg text-xs">
          <div
            className={`w-2.5 h-2.5 rounded-full animate-pulse ${
              sessionType === "evm" ? "bg-rome-ethereum shadow-[0_0_8px_#627EEA]" : "bg-rome-solana shadow-[0_0_8px_#14F195]"
            }`}
          />
          <span className="font-semibold text-gray-300">
            Lane: <span className={sessionType === "evm" ? "text-rome-ethereum" : "text-rome-solana"}>{sessionType.toUpperCase()}</span>
          </span>
          <span className="text-gray-400 font-mono">({displayAddress})</span>
        </div>
      )}

      {/* EVM Connector (RainbowKit / MetaMask) */}
      <ConnectButton.Custom>
        {({ account, chain, openAccountModal, openChainModal, openConnectModal, mounted }) => {
          const ready = mounted;
          const connected = ready && account && chain;

          return (
            <div
              {...(!ready && {
                "aria-hidden": true,
                style: {
                  opacity: 0,
                  pointerEvents: "none",
                  userSelect: "none",
                },
              })}
            >
              {(() => {
                if (!connected) {
                  return (
                    <button
                      onClick={openConnectModal}
                      className="flex items-center gap-2 px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-blue-950/60 border border-rome-ethereum/40 text-blue-300 hover:bg-blue-900/50 hover:border-rome-ethereum transition-all duration-200"
                    >
                      <Cpu className="w-3.5 h-3.5 text-rome-ethereum" />
                      Connect EVM
                    </button>
                  );
                }

                if (chain.unsupported) {
                  return (
                    <button
                      onClick={openChainModal}
                      className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-red-950/60 border border-red-500/50 text-red-400"
                    >
                      Wrong Network
                    </button>
                  );
                }

                return (
                  <button
                    onClick={openAccountModal}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-900 border border-rome-ethereum/30 text-gray-200 hover:border-rome-ethereum"
                  >
                    <span className="w-2 h-2 rounded-full bg-rome-ethereum" />
                    {account.displayName}
                  </button>
                );
              })()}
            </div>
          );
        }}
      </ConnectButton.Custom>

      {/* Solana Connector (Phantom / Solflare) */}
      {!isSolConnected ? (
        <button
          onClick={() => setSolanaModalVisible(true)}
          className="flex items-center gap-2 px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-emerald-950/60 border border-rome-solana/40 text-emerald-300 hover:bg-emerald-900/50 hover:border-rome-solana transition-all duration-200"
        >
          <Shield className="w-3.5 h-3.5 text-rome-solana" />
          Connect Solana
        </button>
      ) : (
        <button
          onClick={() => disconnectSolana()}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-900 border border-rome-solana/30 text-gray-200 hover:border-rome-solana"
          title="Click to disconnect Solana"
        >
          <span className="w-2 h-2 rounded-full bg-rome-solana" />
          {publicKey?.toBase58().slice(0, 4)}...{publicKey?.toBase58().slice(-4)}
        </button>
      )}
    </div>
  );
}
