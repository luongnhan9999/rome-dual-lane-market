"use client";

import "./globals.css";
import "@rainbow-me/rainbowkit/styles.css";
import "@solana/wallet-adapter-react-ui/styles.css";

import React, { useMemo } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WagmiProvider, createConfig, http } from "wagmi";
import { RainbowKitProvider, darkTheme } from "@rainbow-me/rainbowkit";
import { ConnectionProvider, WalletProvider } from "@solana/wallet-adapter-react";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import { PhantomWalletAdapter, SolflareWalletAdapter } from "@solana/wallet-adapter-wallets";
import { hadrianTestnet } from "@/config/chains";
import { ROME_CONSTANTS } from "@/config/chains";

const queryClient = new QueryClient();

const wagmiConfig = createConfig({
  chains: [hadrianTestnet],
  transports: {
    [hadrianTestnet.id]: http("https://hadrian.testnet.romeprotocol.xyz/"),
  },
});

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const solanaEndpoint = useMemo(() => ROME_CONSTANTS.SOLANA.RPC_DEVNET, []);
  const solanaWallets = useMemo(
    () => [new PhantomWalletAdapter(), new SolflareWalletAdapter()],
    []
  );

  return (
    <html lang="en" className="dark">
      <head>
        <title>Janus Market — Dual-Lane Prediction & Perps DEX</title>
        <meta
          name="description"
          content="Janus Protocol: Single-state liquidity and Pyth CPI oracle gateway uniting EVM and Solana on Rome Protocol"
        />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </head>
      <body className="min-h-screen bg-[#0B0C10] text-gray-100 antialiased selection:bg-rome-gold selection:text-black">
        <WagmiProvider config={wagmiConfig}>
          <QueryClientProvider client={queryClient}>
            <RainbowKitProvider
              theme={darkTheme({
                accentColor: "#D4AF37",
                accentColorForeground: "#000000",
                borderRadius: "medium",
              })}
            >
              <ConnectionProvider endpoint={solanaEndpoint}>
                <WalletProvider wallets={solanaWallets} autoConnect>
                  <WalletModalProvider>{children}</WalletModalProvider>
                </WalletProvider>
              </ConnectionProvider>
            </RainbowKitProvider>
          </QueryClientProvider>
        </WagmiProvider>
      </body>
    </html>
  );
}
