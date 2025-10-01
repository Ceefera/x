import { Buffer } from "buffer";
window.Buffer = Buffer;

import { createRoot } from "react-dom/client";
import React from "react";
import App from "./App.tsx";
import "./index.css";

import { ConnectionProvider, WalletProvider } from "@solana/wallet-adapter-react";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import { PhantomWalletAdapter, SolflareWalletAdapter } from "@solana/wallet-adapter-wallets";

import "@solana/wallet-adapter-react-ui/styles.css";

// ✅ Auto-detect environment
const IS_PRODUCTION = import.meta.env.PROD;

// ✅ Force mainnet in production, fallback to devnet only locally (optional)
const network = IS_PRODUCTION ? "mainnet-beta" : (import.meta.env.VITE_SOLANA_NETWORK || "devnet");

// ✅ Try user-defined RPC first, if blocked, fallback to CORS-safe Helius RPC
const endpoint = IS_PRODUCTION
  ? (import.meta.env.VITE_SOLANA_RPC || "https://rpc.helius.xyz/?api-key=anonymous")
  : (import.meta.env.VITE_SOLANA_RPC || "https://api.devnet.solana.com");

console.log("🌐 Using Solana RPC:", endpoint);

const wallets = [new PhantomWalletAdapter(), new SolflareWalletAdapter()];

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>
          <App />
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  </React.StrictMode>
);
