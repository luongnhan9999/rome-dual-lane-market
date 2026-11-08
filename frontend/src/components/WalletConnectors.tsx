"use client";

import React, { useState } from "react";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useDisconnect as useWagmiDisconnect } from "wagmi";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import { useWallet } from "@solana/wallet-adapter-react";
import { useDualLaneSigner } from "@/hooks/useDualLaneSigner";
import { Shield, Cpu, LogOut, Copy, Check, ChevronDown } from "lucide-react";

export function WalletConnectors() {
  const { sessionType, accountId, displayAddress } = useDualLaneSigner();
  const { disconnect: disconnectWagmi } = useWagmiDisconnect();
  const { setVisible: setSolanaModalVisible } = useWalletModal();
  const { connected: isSolConnected, disconnect: disconnectSolana, publicKey } = useWallet();

  const [copied, setCopied] = useState(false);

  const copyAccountId = () => {
    if (accountId) {
      navigator.clipboard.writeText(accountId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2.5">
      {/* Shared-State Account ID Badge */}
      {accountId && (
        <button
          onClick={copyAccountId}
          className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-black/50 border border-rome-border text-[11px] text-gray-400 hover:text-white hover:border-rome-gold transition"
          title="Click to copy 32-byte Rome Shared-State Account ID"
        >
          <span className="text-rome-gold font-mono">ID:</span>
          <span className="font-mono text-gray-300">
            {accountId.slice(0, 6)}...{accountId.slice(-4)}
          </span>
          {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3 text-gray-500" />}
        </button>
      )}

      {/* EVM Connector (RainbowKit) */}
      <ConnectButton.Custom>
        {({ account, chain, openAccountModal, openConnectModal, mounted }) => {
          const ready = mounted;
          const connected = ready && account && chain;

          if (!connected) {
            return (
              <button
                onClick={openConnectModal}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-blue-950/70 border border-rome-ethereum/50 text-blue-300 hover:bg-blue-900/60 transition shadow-sm"
              >
                <Cpu className="w-3.5 h-3.5 text-rome-ethereum" />
                Connect EVM
              </button>
            );
          }

          return (
            <div className="flex items-center gap-1 bg-slate-900/90 border border-rome-ethereum/40 rounded-lg p-0.5">
              <button
                onClick={openAccountModal}
                className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-gray-200 hover:text-white"
              >
                <span className="w-2 h-2 rounded-full bg-rome-ethereum" />
                <span>{account.displayName}</span>
              </button>
              <button
                onClick={() => disconnectWagmi()}
                className="p-1 text-gray-400 hover:text-rose-400 hover:bg-rose-950/40 rounded transition"
                title="Disconnect EVM Wallet"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          );
        }}
      </ConnectButton.Custom>

      {/* Solana Connector */}
      {!isSolConnected ? (
        <button
          onClick={() => setSolanaModalVisible(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-950/70 border border-rome-solana/50 text-emerald-300 hover:bg-emerald-900/60 transition shadow-sm"
        >
          <Shield className="w-3.5 h-3.5 text-rome-solana" />
          Connect Solana
        </button>
      ) : (
        <div className="flex items-center gap-1 bg-slate-900/90 border border-rome-solana/40 rounded-lg p-0.5">
          <button
            onClick={() => setSolanaModalVisible(true)}
            className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-gray-200 hover:text-white"
          >
            <span className="w-2 h-2 rounded-full bg-rome-solana" />
            <span className="font-mono">
              {publicKey?.toBase58().slice(0, 4)}...{publicKey?.toBase58().slice(-4)}
            </span>
          </button>
          <button
            onClick={() => disconnectSolana()}
            className="p-1 text-gray-400 hover:text-rose-400 hover:bg-rose-950/40 rounded transition"
            title="Disconnect Solana Wallet"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}
