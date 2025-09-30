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

const network = import.meta.env.VITE_SOLANA_NETWORK || "devnet";
const endpoint = import.meta.env.VITE_SOLANA_RPC || "https://api.devnet.solana.com";

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
