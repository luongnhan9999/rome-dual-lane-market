"use client";

import React, { useState } from "react";
import { Navbar } from "@/components/Navbar";
import { MarketCard } from "@/components/MarketCard";
import { PositionTable } from "@/components/PositionTable";
import { CreateMarketModal } from "@/components/CreateMarketModal";
import { useDualLaneSigner } from "@/hooks/useDualLaneSigner";
import { useRomeOracle } from "@/hooks/useRomeOracle";
import { useOnchainData, OnchainMarket } from "@/hooks/useOnchainData";
import { ROME_CONSTANTS } from "@/config/chains";
import {
  TrendingUp,
  Sliders,
  DollarSign,
  ArrowUpRight,
  ArrowDownRight,
  ShieldCheck,
  Cpu,
  Layers,
  Sparkles,
  ExternalLink,
  PlusCircle,
  Wallet,
  Lock,
  ArrowDownToLine,
  ArrowUpFromLine,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";

export default function Home() {
  const {
    sessionType,
    accountId,
    evmAddress,
    depositCollateral,
    withdrawCollateral,
    openPerpPosition,
    isPending,
  } = useDualLaneSigner();

  const { btcPrice, solPrice } = useRomeOracle();
  const { balances, markets, isLoading, refetch } = useOnchainData(
    accountId as any,
    evmAddress as any
  );

  // Tab State
  const [activeTab, setActiveTab] = useState<"predictions" | "perps" | "vault">("predictions");

  // Modal State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // Perps Form State
  const [selectedAsset, setSelectedAsset] = useState<"BTC" | "SOL">("BTC");
  const [isLong, setIsLong] = useState(true);
  const [perpMargin, setPerpMargin] = useState("100");
  const [leverage, setLeverage] = useState(5);

  // Vault Form State
  const [vaultDepositAmount, setVaultDepositAmount] = useState("250");
  const [vaultWithdrawAmount, setVaultWithdrawAmount] = useState("50");
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);

  const handleDeposit = async () => {
    try {
      const parsed = BigInt(Math.floor(parseFloat(vaultDepositAmount) * 1e6));
      await depositCollateral(parsed);
      setFeedbackMsg(`Deposited ${vaultDepositAmount} USDC into Shared Collateral Vault!`);
      setTimeout(() => setFeedbackMsg(null), 5000);
      refetch();
    } catch (err: any) {
      console.error(err);
    }
  };

  const handleWithdraw = async () => {
    try {
      const parsed = BigInt(Math.floor(parseFloat(vaultWithdrawAmount) * 1e6));
      await withdrawCollateral(parsed);
      setFeedbackMsg(`Withdrew ${vaultWithdrawAmount} USDC to your EVM wallet!`);
      setTimeout(() => setFeedbackMsg(null), 5000);
      refetch();
    } catch (err: any) {
      console.error(err);
    }
  };

  const handleOpenPerp = async () => {
    try {
      const feedId =
        selectedAsset === "BTC"
          ? ROME_CONSTANTS.FEEDS.PYTH_BTC_USD
          : ROME_CONSTANTS.FEEDS.PYTH_SOL_USD;
      const marginParsed = BigInt(Math.floor(parseFloat(perpMargin) * 1e6));
      await openPerpPosition(feedId, isLong, marginParsed, BigInt(leverage));
      setFeedbackMsg(
        `Opened ${leverage}x ${isLong ? "LONG" : "SHORT"} on ${selectedAsset} with $${perpMargin} margin!`
      );
      setTimeout(() => setFeedbackMsg(null), 5000);
      refetch();
    } catch (err: any) {
      console.error(err);
    }
  };

  const currentAssetPrice = selectedAsset === "BTC" ? btcPrice.price : solPrice.price;
  const currentAssetPriceFmt = selectedAsset === "BTC" ? btcPrice.formatted : solPrice.formatted;
  const notionalSize = parseFloat(perpMargin || "0") * leverage;

  return (
    <div className="min-h-screen flex flex-col bg-[#0B0C10]">
      <Navbar />

      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full space-y-8">
        {/* Hero Section & Architecture Highlights */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-rome-surfaceLight via-[#1A1822] to-rome-surfaceLight border border-rome-border p-6 shadow-2xl">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 relative z-10">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rome-gold/10 border border-rome-gold/30 text-rome-gold text-xs font-semibold mb-3">
                <Sparkles className="w-3.5 h-3.5" />
                Janus Protocol • Shared State & Pyth Oracle Gateway
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                Janus Dual-Lane Terminal
              </h1>
              <p className="text-sm text-gray-400 mt-1 max-w-2xl leading-relaxed">
                Trade prediction shares and 10x leveraged perps simultaneously with MetaMask (EVM)
                and Phantom (Solana). Single unified liquidity vault with real-time Pyth CPI oracles
                on Rome Protocol.
              </p>
            </div>

            {/* Collateral Summary Pill */}
            <div className="bg-black/60 border border-rome-border/80 rounded-xl p-4 w-full lg:w-auto min-w-[320px]">
              <div className="flex items-center justify-between text-xs text-gray-300 font-semibold mb-2">
                <span className="flex items-center gap-1.5">
                  <Wallet className="w-3.5 h-3.5 text-rome-gold" />
                  Your Vault Collateral
                </span>
                <button
                  onClick={() => refetch()}
                  className="text-gray-400 hover:text-white transition"
                  title="Refresh On-Chain Data"
                >
                  <RefreshCw className={`w-3 h-3 ${isLoading ? "animate-spin text-rome-gold" : ""}`} />
                </button>
              </div>

              <div className="grid grid-cols-3 gap-2 py-2 border-y border-rome-border/60 text-center font-mono">
                <div>
                  <span className="text-[10px] text-gray-500 uppercase block">Available</span>
                  <span className="text-xs font-bold text-emerald-400">
                    ${balances.available.toFixed(2)}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-gray-500 uppercase block">Locked</span>
                  <span className="text-xs font-bold text-amber-400">
                    ${balances.locked.toFixed(2)}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-gray-500 uppercase block">Wallet USDC</span>
                  <span className="text-xs font-bold text-gray-200">
                    ${balances.walletUSDC.toFixed(2)}
                  </span>
                </div>
              </div>

              <div className="flex gap-2 mt-3">
                <input
                  type="number"
                  value={vaultDepositAmount}
                  onChange={(e) => setVaultDepositAmount(e.target.value)}
                  className="w-24 bg-rome-surface border border-rome-border rounded px-2.5 py-1 text-xs text-white"
                  placeholder="Amount"
                />
                <button
                  disabled={sessionType === "none" || isPending}
                  onClick={handleDeposit}
                  className="flex-1 px-3 py-1 bg-rome-gold hover:bg-rome-darkGold text-black font-bold rounded text-xs transition-all disabled:opacity-40"
                >
                  {isPending ? "Depositing..." : "Deposit USDC"}
                </button>
              </div>

              {feedbackMsg && (
                <p className="text-[11px] text-emerald-400 mt-2 font-medium flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 flex-shrink-0" />
                  {feedbackMsg}
                </p>
              )}
            </div>
          </div>

          {/* Dual-Lane Architecture Pill Indicator */}
          <div className="mt-6 pt-4 border-t border-rome-border/60 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div className="flex items-center gap-2 text-gray-300">
              <Cpu className="w-4 h-4 text-rome-ethereum" />
              <span>
                <strong>EVM Lane:</strong> MetaMask / Wagmi viem
              </span>
            </div>
            <div className="flex items-center gap-2 text-gray-300">
              <ShieldCheck className="w-4 h-4 text-rome-solana" />
              <span>
                <strong>Solana Lane:</strong> Phantom Ed25519 Native Keys
              </span>
            </div>
            <div className="flex items-center gap-2 text-gray-300">
              <Layers className="w-4 h-4 text-rome-gold" />
              <span>
                <strong>Oracle Gateway:</strong> Solana Pyth CPI Precompile
              </span>
            </div>
          </div>
        </div>

        {/* Tab Navigation & Create Market CTA */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-rome-border pb-3 gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setActiveTab("predictions")}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                activeTab === "predictions"
                  ? "bg-rome-gold text-black shadow-lg shadow-rome-gold/20"
                  : "bg-rome-surfaceLight text-gray-400 hover:text-white border border-rome-border"
              }`}
            >
              <TrendingUp className="w-4 h-4" />
              Prediction Markets ({markets.length})
            </button>
            <button
              onClick={() => setActiveTab("perps")}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                activeTab === "perps"
                  ? "bg-rome-gold text-black shadow-lg shadow-rome-gold/20"
                  : "bg-rome-surfaceLight text-gray-400 hover:text-white border border-rome-border"
              }`}
            >
              <Sliders className="w-4 h-4" />
              Mini-Perpetuals (10x Margin)
            </button>
            <button
              onClick={() => setActiveTab("vault")}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                activeTab === "vault"
                  ? "bg-rome-gold text-black shadow-lg shadow-rome-gold/20"
                  : "bg-rome-surfaceLight text-gray-400 hover:text-white border border-rome-border"
              }`}
            >
              <Wallet className="w-4 h-4" />
              Collateral Vault
            </button>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-amber-500/20 text-rome-gold border border-rome-gold/40 hover:bg-amber-500/30 transition shadow-md"
            >
              <PlusCircle className="w-4 h-4" />
              Create On-Chain Market
            </button>

            <div className="text-xs text-gray-400">
              Active Lane:{" "}
              <span className="font-semibold text-white">
                {sessionType === "none" ? "None (Connect Wallet)" : sessionType.toUpperCase()}
              </span>
            </div>
          </div>
        </div>

        {/* Tab 1: Prediction Markets */}
        {activeTab === "predictions" && (
          <div className="space-y-6">
            {markets.length === 0 ? (
              <div className="bg-rome-surfaceLight border border-rome-border rounded-2xl p-12 text-center space-y-4 shadow-xl">
                <TrendingUp className="w-12 h-12 text-rome-gold/60 mx-auto" />
                <h3 className="text-lg font-bold text-white">No Active Prediction Markets Found</h3>
                <p className="text-xs text-gray-400 max-w-md mx-auto leading-relaxed">
                  You are connected to Rome Hadrian Testnet. Create the very first on-chain
                  prediction market or deploy the full smart contract suite using the button in the
                  navigation bar.
                </p>
                <div className="pt-2">
                  <button
                    onClick={() => setIsCreateModalOpen(true)}
                    className="px-5 py-2.5 bg-rome-gold hover:bg-rome-darkGold text-black font-bold rounded-lg text-xs inline-flex items-center gap-2 shadow-lg"
                  >
                    <PlusCircle className="w-4 h-4" />
                    Create First Prediction Market
                  </button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {markets.map((m) => (
                  <MarketCard key={m.id} market={m} onActionSuccess={() => refetch()} />
                ))}
              </div>
            )}

            {/* Cross-lane Position Table in Prediction Tab */}
            <PositionTable />
          </div>
        )}

        {/* Tab 2: Mini-Perpetuals DEX */}
        {activeTab === "perps" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Trading Order Form */}
            <div className="lg:col-span-1 bg-rome-surfaceLight border border-rome-border rounded-xl p-5 shadow-xl space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-sm text-white">Open 10x Margin Position</h3>
                <span className="text-xs text-emerald-400 font-mono font-bold">
                  {currentAssetPriceFmt}
                </span>
              </div>

              {/* Asset Select */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setSelectedAsset("BTC")}
                  className={`py-2 rounded-lg text-xs font-bold transition-all ${
                    selectedAsset === "BTC"
                      ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                      : "bg-black/40 text-gray-400 border border-rome-border"
                  }`}
                >
                  BTC / USD
                </button>
                <button
                  onClick={() => setSelectedAsset("SOL")}
                  className={`py-2 rounded-lg text-xs font-bold transition-all ${
                    selectedAsset === "SOL"
                      ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                      : "bg-black/40 text-gray-400 border border-rome-border"
                  }`}
                >
                  SOL / USD
                </button>
              </div>

              {/* Long / Short Toggle */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setIsLong(true)}
                  className={`py-2.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                    isLong
                      ? "bg-emerald-600 text-white shadow-lg shadow-emerald-600/30"
                      : "bg-black/40 text-gray-400 border border-rome-border"
                  }`}
                >
                  <ArrowUpRight className="w-4 h-4" />
                  LONG
                </button>
                <button
                  onClick={() => setIsLong(false)}
                  className={`py-2.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                    !isLong
                      ? "bg-rose-600 text-white shadow-lg shadow-rose-600/30"
                      : "bg-black/40 text-gray-400 border border-rome-border"
                  }`}
                >
                  <ArrowDownRight className="w-4 h-4" />
                  SHORT
                </button>
              </div>

              {/* Margin Input */}
              <div>
                <div className="flex justify-between text-xs text-gray-400 mb-1 font-medium">
                  <span>Margin Collateral</span>
                  <span>
                    Avail:{" "}
                    <strong className="text-emerald-400 font-mono">
                      ${balances.available.toFixed(2)}
                    </strong>
                  </span>
                </div>
                <div className="relative">
                  <input
                    type="number"
                    value={perpMargin}
                    onChange={(e) => setPerpMargin(e.target.value)}
                    className="w-full bg-black/40 border border-rome-border rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-rome-gold"
                    placeholder="100"
                  />
                  <span className="absolute right-3 top-2 text-xs text-gray-400 font-bold">
                    USDC
                  </span>
                </div>
              </div>

              {/* Leverage Slider */}
              <div>
                <div className="flex justify-between text-xs text-gray-400 mb-1 font-medium">
                  <span>Leverage Multiplier</span>
                  <span className="text-rome-gold font-bold">{leverage}x</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="10"
                  step="1"
                  value={leverage}
                  onChange={(e) => setLeverage(parseInt(e.target.value))}
                  className="w-full accent-rome-gold cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-gray-500 mt-1">
                  <span>1x</span>
                  <span>2x</span>
                  <span>5x</span>
                  <span>10x Max</span>
                </div>
              </div>

              {/* Summary */}
              <div className="bg-black/30 p-3 rounded-lg border border-rome-border text-xs space-y-1.5 font-mono">
                <div className="flex justify-between text-gray-400">
                  <span>Notional Size:</span>
                  <span className="text-white">${notionalSize.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-gray-400">
                  <span>Entry Pyth Price:</span>
                  <span className="text-emerald-400">{currentAssetPriceFmt}</span>
                </div>
                <div className="flex justify-between text-gray-400">
                  <span>Est. Liquidation:</span>
                  <span className="text-rose-400 font-bold">
                    $
                    {(
                      currentAssetPrice *
                      (isLong ? 1 - 0.8 / leverage : 1 + 0.8 / leverage)
                    ).toLocaleString("en-US", { maximumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              {/* Submit Button */}
              <button
                disabled={sessionType === "none" || isPending}
                onClick={handleOpenPerp}
                className={`w-full py-3 rounded-lg text-xs font-bold transition-all shadow-md ${
                  sessionType === "none"
                    ? "bg-gray-800 text-gray-500 cursor-not-allowed"
                    : isLong
                    ? "bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold"
                    : "bg-rose-500 hover:bg-rose-400 text-white font-extrabold"
                }`}
              >
                {isPending
                  ? "Executing On-Chain Trade..."
                  : sessionType === "none"
                  ? "Connect Wallet to Trade"
                  : `Open ${leverage}x ${isLong ? "Long" : "Short"} Position`}
              </button>
            </div>

            {/* Market Info & Highlights */}
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-rome-surfaceLight border border-rome-border rounded-xl p-5 shadow-xl">
                <h3 className="font-bold text-sm text-white mb-2">
                  Rome Sub-Second Perpetual Settlement Engine
                </h3>
                <p className="text-xs text-gray-400 leading-relaxed mb-4">
                  Traditional perps on EVM rollups suffer from multi-second oracle latency and
                  sequencer bottlenecks. Rome allows Solidity contracts to read high-frequency Pyth
                  price updates directly from Solana L1 via CPI precompile{" "}
                  <code className="text-rome-gold bg-black/40 px-1 py-0.5 rounded font-mono">
                    0xFF00000000000000000000000000000000000008
                  </code>{" "}
                  with ~400ms finality.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div className="bg-black/30 p-3 rounded-lg border border-rome-border">
                    <span className="text-gray-400 block mb-1">Max Leverage</span>
                    <span className="text-base font-bold text-white">10x</span>
                  </div>
                  <div className="bg-black/30 p-3 rounded-lg border border-rome-border">
                    <span className="text-gray-400 block mb-1">Keeper Bounty</span>
                    <span className="text-base font-bold text-emerald-400">5.0%</span>
                  </div>
                  <div className="bg-black/30 p-3 rounded-lg border border-rome-border">
                    <span className="text-gray-400 block mb-1">Oracle Source</span>
                    <span className="text-base font-bold text-amber-400">Solana Pyth L1</span>
                  </div>
                </div>
              </div>

              {/* Positions Table */}
              <PositionTable />
            </div>
          </div>
        )}

        {/* Tab 3: Collateral Vault */}
        {activeTab === "vault" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Deposit Box */}
            <div className="bg-rome-surfaceLight border border-rome-border rounded-xl p-6 shadow-xl space-y-4">
              <div className="flex items-center gap-2">
                <ArrowDownToLine className="w-5 h-5 text-emerald-400" />
                <h3 className="font-bold text-sm text-white">Deposit Collateral</h3>
              </div>
              <p className="text-xs text-gray-400 leading-relaxed">
                Deposit USDC into the unified RomeMarketVault. Deposited funds can be used across
                both prediction markets and mini-perps positions simultaneously from both EVM and
                Solana wallets.
              </p>

              <div>
                <label className="block text-xs text-gray-400 mb-1">
                  Deposit Amount (Wallet: ${balances.walletUSDC.toFixed(2)} USDC)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={vaultDepositAmount}
                    onChange={(e) => setVaultDepositAmount(e.target.value)}
                    className="w-full bg-black/40 border border-rome-border rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-rome-gold"
                    placeholder="100"
                  />
                  <span className="absolute right-3 top-2 text-xs text-gray-400 font-bold">
                    USDC
                  </span>
                </div>
              </div>

              <button
                disabled={sessionType === "none" || isPending}
                onClick={handleDeposit}
                className="w-full py-2.5 bg-rome-gold hover:bg-rome-darkGold text-black font-bold rounded-lg text-xs transition disabled:opacity-40"
              >
                {isPending ? "Depositing..." : "Approve & Deposit USDC"}
              </button>
            </div>

            {/* Withdraw Box */}
            <div className="bg-rome-surfaceLight border border-rome-border rounded-xl p-6 shadow-xl space-y-4">
              <div className="flex items-center gap-2">
                <ArrowUpFromLine className="w-5 h-5 text-rome-gold" />
                <h3 className="font-bold text-sm text-white">Withdraw Collateral</h3>
              </div>
              <p className="text-xs text-gray-400 leading-relaxed">
                Withdraw free available collateral back to your EVM address. Locked margin tied to
                active predictions or open perp positions cannot be withdrawn until settled.
              </p>

              <div>
                <label className="block text-xs text-gray-400 mb-1">
                  Withdraw Amount (Available: ${balances.available.toFixed(2)} USDC)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={vaultWithdrawAmount}
                    onChange={(e) => setVaultWithdrawAmount(e.target.value)}
                    className="w-full bg-black/40 border border-rome-border rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-rome-gold"
                    placeholder="50"
                  />
                  <span className="absolute right-3 top-2 text-xs text-gray-400 font-bold">
                    USDC
                  </span>
                </div>
              </div>

              <button
                disabled={
                  sessionType === "none" ||
                  isPending ||
                  balances.available < parseFloat(vaultWithdrawAmount || "0")
                }
                onClick={handleWithdraw}
                className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-lg text-xs transition disabled:opacity-40"
              >
                {isPending ? "Withdrawing..." : "Withdraw to EVM Wallet"}
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Modal: Create On-Chain Market */}
      <CreateMarketModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onMarketCreated={() => refetch()}
      />

      {/* Footer */}
      <footer className="border-t border-rome-border/80 bg-black/60 py-6 mt-12 text-xs text-gray-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="text-rome-gold font-bold">Janus Market</span>
            <span>•</span>
            <span>Rome Hadrian Testnet (Chain ID: 200010)</span>
            <span>•</span>
            <span>Rubicon Mainnet (Chain ID: 7531) Ready</span>
          </div>

          <div className="flex items-center gap-4">
            <a
              href="https://arena.mainnet.romeprotocol.xyz/apps/new"
              target="_blank"
              rel="noreferrer"
              className="text-rome-gold hover:underline flex items-center gap-1 font-semibold"
            >
              Register on Arena <ExternalLink className="w-3 h-3" />
            </a>
            <a
              href="https://via-hadrian.testnet.romeprotocol.xyz/"
              target="_blank"
              rel="noreferrer"
              className="hover:text-gray-300 flex items-center gap-1"
            >
              Hadrian Explorer <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
