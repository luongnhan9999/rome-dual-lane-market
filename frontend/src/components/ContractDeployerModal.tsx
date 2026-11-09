"use client";

import React, { useState } from "react";
import { useWalletClient, usePublicClient, useAccount, useConnect } from "wagmi";
import { injected } from "wagmi/connectors";
import { useDualLaneSigner } from "@/hooks/useDualLaneSigner";
import bytecodesJson from "@/config/contractBytecodes.json";
import {
  getContractAddresses,
  saveContractAddresses,
  resetContractAddresses,
  ContractAddressConfig,
} from "@/config/contracts";
import { ROME_CONSTANTS } from "@/config/chains";
import {
  Rocket,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  X,
  Shield,
  ExternalLink,
  Cpu,
} from "lucide-react";

interface ContractDeployerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ContractDeployerModal({ isOpen, onClose }: ContractDeployerModalProps) {
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient();
  const { isConnected, address } = useAccount();
  const { connect: connectWagmi } = useConnect();
  const { isWrongNetwork, switchToHadrian } = useDualLaneSigner();

  const [currentStep, setCurrentStep] = useState<number>(0);
  const [logs, setLogs] = useState<string[]>([]);
  const [isDeploying, setIsDeploying] = useState<boolean>(false);
  const [deployedConfig, setDeployedConfig] = useState<ContractAddressConfig | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSwitching, setIsSwitching] = useState<boolean>(false);

  if (!isOpen) return null;

  const addLog = (msg: string) => {
    setLogs((prev) => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);
  };

  const handleDeployAll = async () => {
    if (!walletClient || !publicClient) {
      setErrorMsg("Please connect MetaMask on Rome Hadrian Testnet first.");
      return;
    }

    setIsDeploying(true);
    setErrorMsg(null);
    setLogs([]);
    setCurrentStep(1);

    try {
      addLog("Starting Janus Protocol deployment on Rome Hadrian Testnet...");

      // 1. Deploy MockUSDC
      addLog("[1/5] Deploying Collateral Token (USDC)...");
      const hashUSDC = await walletClient.deployContract({
        abi: (bytecodesJson as any).MockUSDC.abi,
        bytecode: (bytecodesJson as any).MockUSDC.bytecode as `0x${string}`,
        args: [],
      });
      addLog(`-> Tx sent: ${hashUSDC.slice(0, 14)}... Awaiting receipt...`);
      const receiptUSDC = await publicClient.waitForTransactionReceipt({ hash: hashUSDC });
      const usdcAddress = receiptUSDC.contractAddress as `0x${string}`;
      addLog(`✓ USDC Token deployed at: ${usdcAddress}`);
      setCurrentStep(2);

      // 2. Deploy RomeOracleGateway
      addLog("[2/5] Deploying RomeOracleGateway (Pyth CPI Precompile Adapter)...");
      const dummyPythProgram = "0x0000000000000000000000000000000000000000000000000000000000000001";
      const hashOracle = await walletClient.deployContract({
        abi: (bytecodesJson as any).RomeOracleGateway.abi,
        bytecode: (bytecodesJson as any).RomeOracleGateway.bytecode as `0x${string}`,
        args: [dummyPythProgram],
      });
      const receiptOracle = await publicClient.waitForTransactionReceipt({ hash: hashOracle });
      const oracleAddress = receiptOracle.contractAddress as `0x${string}`;
      addLog(`✓ RomeOracleGateway deployed at: ${oracleAddress}`);
      setCurrentStep(3);

      // Seed Initial Prices in Oracle
      addLog("-> Initializing benchmark feeds for BTC ($75,930) and SOL ($89.25)...");
      const hashSeedBtc = await walletClient.writeContract({
        address: oracleAddress,
        abi: (bytecodesJson as any).RomeOracleGateway.abi,
        functionName: "updatePrice",
        args: [
          ROME_CONSTANTS.FEEDS.PYTH_BTC_USD,
          BigInt("7593000000000"),
          BigInt("15000000"),
          -8,
          BigInt(Math.floor(Date.now() / 1000)),
        ],
      });
      await publicClient.waitForTransactionReceipt({ hash: hashSeedBtc });

      const hashSeedSol = await walletClient.writeContract({
        address: oracleAddress,
        abi: (bytecodesJson as any).RomeOracleGateway.abi,
        functionName: "updatePrice",
        args: [
          ROME_CONSTANTS.FEEDS.PYTH_SOL_USD,
          BigInt("8925000000"),
          BigInt("5000000"),
          -8,
          BigInt(Math.floor(Date.now() / 1000)),
        ],
      });
      await publicClient.waitForTransactionReceipt({ hash: hashSeedSol });
      addLog("✓ Oracle feeds initialized successfully.");

      // 3. Deploy RomeMarketVault
      addLog("[3/5] Deploying RomeMarketVault (Single Shared-State Liquidity Pool)...");
      const hashVault = await walletClient.deployContract({
        abi: (bytecodesJson as any).RomeMarketVault.abi,
        bytecode: (bytecodesJson as any).RomeMarketVault.bytecode as `0x${string}`,
        args: [usdcAddress],
      });
      const receiptVault = await publicClient.waitForTransactionReceipt({ hash: hashVault });
      const vaultAddress = receiptVault.contractAddress as `0x${string}`;
      addLog(`✓ RomeMarketVault deployed at: ${vaultAddress}`);
      setCurrentStep(4);

      // 4. Deploy PredictionEngine
      addLog("[4/5] Deploying PredictionEngine (Binary & Oracle Settled Markets)...");
      const hashPred = await walletClient.deployContract({
        abi: (bytecodesJson as any).PredictionEngine.abi,
        bytecode: (bytecodesJson as any).PredictionEngine.bytecode as `0x${string}`,
        args: [vaultAddress, oracleAddress],
      });
      const receiptPred = await publicClient.waitForTransactionReceipt({ hash: hashPred });
      const predAddress = receiptPred.contractAddress as `0x${string}`;
      addLog(`✓ PredictionEngine deployed at: ${predAddress}`);

      // 5. Deploy PerpsPositionManager
      addLog("[5/5] Deploying PerpsPositionManager (10x Leverage Margin Engine)...");
      const hashPerps = await walletClient.deployContract({
        abi: (bytecodesJson as any).PerpsPositionManager.abi,
        bytecode: (bytecodesJson as any).PerpsPositionManager.bytecode as `0x${string}`,
        args: [vaultAddress, oracleAddress],
      });
      const receiptPerps = await publicClient.waitForTransactionReceipt({ hash: hashPerps });
      const perpsAddress = receiptPerps.contractAddress as `0x${string}`;
      addLog(`✓ PerpsPositionManager deployed at: ${perpsAddress}`);
      setCurrentStep(5);

      // Authorize Market Engines in Vault
      addLog("-> Authorizing PredictionEngine & PerpsPositionManager in Vault...");
      const hashAuth1 = await walletClient.writeContract({
        address: vaultAddress,
        abi: (bytecodesJson as any).RomeMarketVault.abi,
        functionName: "setMarketAuthorization",
        args: [predAddress, true],
      });
      await publicClient.waitForTransactionReceipt({ hash: hashAuth1 });

      const hashAuth2 = await walletClient.writeContract({
        address: vaultAddress,
        abi: (bytecodesJson as any).RomeMarketVault.abi,
        functionName: "setMarketAuthorization",
        args: [perpsAddress, true],
      });
      await publicClient.waitForTransactionReceipt({ hash: hashAuth2 });
      addLog("✓ Vault authorizations confirmed.");

      // Create Flagship Prediction Market
      addLog("-> Seeding flagship prediction market: 'Will Bitcoin break $90,000?'...");
      const expiry = BigInt(Math.floor(Date.now() / 1000) + 7 * 86400);
      const hashCreate = await walletClient.writeContract({
        address: predAddress,
        abi: (bytecodesJson as any).PredictionEngine.abi,
        functionName: "createMarket",
        args: [
          "Will Bitcoin break $90,000 before resolution?",
          ROME_CONSTANTS.FEEDS.PYTH_BTC_USD,
          BigInt("9000000000000"), // $90,000 (8 decimals)
          0, // GREATER_OR_EQUAL
          expiry,
        ],
      });
      await publicClient.waitForTransactionReceipt({ hash: hashCreate });
      addLog("✓ Flagship prediction market created.");

      const newConfig: ContractAddressConfig = {
        USDC: usdcAddress,
        RomeOracleGateway: oracleAddress,
        RomeMarketVault: vaultAddress,
        PredictionEngine: predAddress,
        PerpsPositionManager: perpsAddress,
      };

      setDeployedConfig(newConfig);
      saveContractAddresses(newConfig);
      addLog("=========================================");
      addLog("ALL CONTRACTS DEPLOYED SUCCESSFULLY!");
      addLog("Active contracts updated in terminal.");
      addLog("=========================================");
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err?.shortMessage || err?.message || "Deployment failed");
      addLog(`❌ Error: ${err?.message || "Transaction aborted"}`);
    } finally {
      setIsDeploying(false);
    }
  };

  const handleReset = () => {
    resetContractAddresses();
    setDeployedConfig(null);
    setLogs([]);
    setCurrentStep(0);
  };

  const activeAddresses = getContractAddresses();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-[#12131A] border border-rome-border rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
        {/* Header */}
        <div className="px-6 py-4 border-b border-rome-border flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-rome-gold/20 flex items-center justify-center text-rome-gold border border-rome-gold/40">
              <Rocket className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Self-Deploy Protocol Suite</h2>
              <p className="text-xs text-gray-400">
                Deploy your own instance of Janus Market contracts to Rome Hadrian Testnet
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-5 text-xs flex-1">
          {errorMsg && (
            <div className="p-3 bg-red-950/50 border border-red-500/40 rounded-xl text-red-300 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Active Config */}
          <div className="bg-black/40 border border-rome-border rounded-xl p-4 space-y-2">
            <div className="flex items-center justify-between text-gray-300 font-semibold">
              <span>Active Contract Suite</span>
              <button
                onClick={handleReset}
                className="text-rome-gold hover:underline flex items-center gap-1 text-[11px]"
              >
                <RefreshCw className="w-3 h-3" />
                Reset to Default
              </button>
            </div>
            <div className="font-mono text-[11px] space-y-1 text-gray-400">
              <div className="flex justify-between">
                <span>USDC:</span>
                <span className="text-gray-200">{activeAddresses.USDC}</span>
              </div>
              <div className="flex justify-between">
                <span>Vault:</span>
                <span className="text-gray-200">{activeAddresses.RomeMarketVault}</span>
              </div>
              <div className="flex justify-between">
                <span>Prediction:</span>
                <span className="text-gray-200">{activeAddresses.PredictionEngine}</span>
              </div>
              <div className="flex justify-between">
                <span>Perps:</span>
                <span className="text-gray-200">{activeAddresses.PerpsPositionManager}</span>
              </div>
              <div className="flex justify-between">
                <span>Oracle:</span>
                <span className="text-gray-200">{activeAddresses.RomeOracleGateway}</span>
              </div>
            </div>
          </div>

          {/* Progress Console */}
          {logs.length > 0 && (
            <div className="bg-black/70 border border-rome-border rounded-xl p-3 font-mono text-[11px] text-gray-300 max-h-48 overflow-y-auto space-y-1">
              {logs.map((log, index) => (
                <div
                  key={index}
                  className={
                    log.includes("✓")
                      ? "text-emerald-400"
                      : log.includes("❌")
                      ? "text-rose-400"
                      : "text-gray-300"
                  }
                >
                  {log}
                </div>
              ))}
            </div>
          )}

          {deployedConfig && (
            <div className="p-3 bg-emerald-950/40 border border-emerald-500/40 rounded-xl text-emerald-300 flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
              <span>
                New contracts successfully active! All trades and deposits will now interact with your deployed instance.
              </span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-rome-border bg-black/40 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs text-gray-400 font-medium">
            <span>Status:</span>
            {!isConnected ? (
              <span className="text-rose-400">Not Connected</span>
            ) : isWrongNetwork || !walletClient ? (
              <span className="text-amber-400 font-semibold">Wrong Network (Need Hadrian 200010)</span>
            ) : (
              <span className="text-emerald-400 font-semibold">Ready on Rome Hadrian (200010)</span>
            )}
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-xs font-semibold bg-slate-800 text-gray-300 hover:text-white"
            >
              Close
            </button>

            {!isConnected ? (
              <button
                onClick={() => connectWagmi({ connector: injected() })}
                className="px-5 py-2 rounded-lg text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white flex items-center gap-2 transition shadow-md"
              >
                <Cpu className="w-3.5 h-3.5" />
                Connect MetaMask
              </button>
            ) : isWrongNetwork || !walletClient ? (
              <button
                disabled={isSwitching}
                onClick={async () => {
                  try {
                    setIsSwitching(true);
                    await switchToHadrian();
                  } catch (e: any) {
                    setErrorMsg(e?.message || "Failed to switch to Rome Hadrian Testnet");
                  } finally {
                    setIsSwitching(false);
                  }
                }}
                className="px-5 py-2 rounded-lg text-xs font-bold bg-amber-500 hover:bg-amber-400 text-black flex items-center gap-2 transition shadow-md"
              >
                {isSwitching ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <AlertTriangle className="w-3.5 h-3.5" />
                )}
                {isSwitching ? "Switching..." : "Switch to Rome Hadrian"}
              </button>
            ) : (
              <button
                disabled={isDeploying}
                onClick={handleDeployAll}
                className="px-5 py-2 rounded-lg text-xs font-bold bg-rome-gold hover:bg-rome-darkGold text-black flex items-center gap-2 transition disabled:opacity-50 shadow-md"
              >
                {isDeploying ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    Deploying Step {currentStep}/5...
                  </>
                ) : (
                  <>
                    <Rocket className="w-3.5 h-3.5" />
                    Deploy All Contracts
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
