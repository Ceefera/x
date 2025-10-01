import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { api } from "@/lib/api";
import { PublicKey, SystemProgram, Transaction, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { useWallet, useConnection } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import { Send, Twitter } from "lucide-react";

/**
 * Robust HeroSection:
 * - Diagnoses connection + wallet network
 * - Attempts a best-effort auto-switch (if wallet supports it)
 * - Uses status area for all messages (so UX is consistent)
 */

export function HeroSection() {
  const [xHandle, setXHandle] = useState("");
  const [selectedAmount, setSelectedAmount] = useState<string | null>(null);
  const [customAmount, setCustomAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  const amounts = ["0.5", "1", "2.5", "5", "10", "MAX"];

  const { publicKey, sendTransaction, connected, wallet } = useWallet();
  const { connection } = useConnection();
  const { setVisible } = useWalletModal();

  const RECEIVER_ADDRESS = import.meta.env.VITE_RECEIVER_ADDRESS || "REPLACE_WITH_RECEIVER_PUBKEY";

  // runtime network detection state
  const [isMainnet, setIsMainnet] = useState<boolean | null>(null);
  const [diagnostics, setDiagnostics] = useState<any>(null);

  const handleConnectWallet = () => setVisible(true);

  // --- Utility: best-effort auto-switch for some wallets (Phantom/Solflare may support requests)
  // This will try several common methods and silently fail if unsupported.
  async function attemptAutoSwitchToMainnet(): Promise<boolean> {
    const win: any = window as any;
    if (!win?.solana) return false;
    try {
      // Try a generic "wallet_switchNetwork" request (may be unsupported)
      if (win.solana.request) {
        await win.solana.request({
          method: "wallet_switchNetwork",
          params: { network: "mainnet-beta" },
        });
        return true;
      }
    } catch (e) {
      // ignore and continue to other attempts
      console.warn("wallet_switchNetwork attempt failed:", e);
    }

    try {
      // Try a more conservative connect request (this may prompt user)
      if (win.solana.connect) {
        await win.solana.connect();
        return true;
      }
    } catch (e) {
      console.warn("solana.connect attempt failed:", e);
    }

    // Not supported or user rejected — return false
    return false;
  }

  // --- Detect and diagnose the network by inspecting connection.rpcEndpoint and probing the RPC
  useEffect(() => {
    let mounted = true;
    async function detectNetwork() {
      try {
        const endpoint = (connection as any)?.rpcEndpoint || "";
        // quick heuristic based on endpoint string (Helius/Ankr/mainnet)
        const endpointIsMain = /mainnet|helius|ankr|solana\.com/i.test(endpoint);

        // probe RPC for additional info (version + genesis hash)
        let version = null;
        let genesisHash = null;
        try {
          version = await connection.getVersion();
        } catch (vErr) {
          console.warn("getVersion failed:", vErr);
        }
        try {
          genesisHash = await connection.getGenesisHash();
        } catch (gErr) {
          console.warn("getGenesisHash failed:", gErr);
        }

        const diag = {
          endpoint,
          endpointIsMain,
          version,
          genesisHash,
          publicKey: publicKey?.toBase58?.() ?? null,
          hasWindowSolana: typeof (window as any).solana !== "undefined",
        };

        if (!mounted) return;
        setDiagnostics(diag);

        // Decide mainnet-ness:
        // - if endpoint string suggests mainnet, trust that
        // - otherwise, if genesisHash exists, we can't reliably map to cluster here; we still show it for debugging
        setIsMainnet(Boolean(endpointIsMain));
      } catch (err) {
        console.error("detectNetwork error:", err);
        if (mounted) {
          setDiagnostics({ error: String(err) });
          setIsMainnet(false);
        }
      }
    }

    if (connection) detectNetwork();

    return () => {
      mounted = false;
    };
  }, [connection, publicKey]);

  const getFinalAmount = () => {
    if (selectedAmount === "MAX") {
      if (!publicKey || !connection) return null;
      return "MAX";
    }
    return customAmount && !isNaN(Number(customAmount)) ? customAmount : selectedAmount;
  };

  // --- full handleBuy with auto-switch attempt and diagnostics
  const handleBuy = async () => {
    // re-check before proceeding, if not mainnet try auto-switch once
    if (!isMainnet) {
      setStatus("⚠️ Detected non-mainnet RPC/wallet. Attempting to switch your wallet to MAINNET...");
      const switched = await attemptAutoSwitchToMainnet();
      // small delay to allow wallet to update/prompt
      await new Promise((r) => setTimeout(r, 900));
      // re-run detection (quick check: connection.rpcEndpoint should already be mainnet from your app)
      const endpoint = (connection as any)?.rpcEndpoint || "";
      const endpointIsMain = /mainnet|helius|ankr|solana\.com/i.test(endpoint);
      if (!endpointIsMain) {
        setStatus("⚠️ Please switch your wallet to MAINNET to continue.");
        return;
      }
      // If the above passes, mark mainnet true and continue
      setIsMainnet(true);
      setStatus(null);
    }

    const finalAmount = getFinalAmount();
    if (!xHandle || !finalAmount) return setStatus("⚠️ Fill X handle and choose or enter amount.");
    if (!publicKey) return setStatus("⚠️ Please connect your wallet.");
    if (RECEIVER_ADDRESS === "REPLACE_WITH_RECEIVER_PUBKEY") return setStatus("⚠️ Receiver address not configured in env.");

    setLoading(true);
    setStatus(null);

    try {
      let lamports: number;

      if (finalAmount === "MAX") {
        const balance = await connection.getBalance(publicKey);
        const feeBuffer = 5000;
        if (balance <= feeBuffer) {
          setStatus("⚠️ Not enough SOL to cover network fees.");
          setLoading(false);
          return;
        }
        lamports = balance - feeBuffer;
      } else {
        lamports = Math.round(parseFloat(String(finalAmount)) * LAMPORTS_PER_SOL);
      }

      const tx = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: publicKey as PublicKey,
          toPubkey: new PublicKey(RECEIVER_ADDRESS),
          lamports,
        })
      );

      const signature = await sendTransaction(tx, connection);
      setStatus(`⏳ Transaction submitted: ${signature}`);
      await connection.confirmTransaction(signature, "confirmed");

      const payload = {
        x_handle: xHandle,
        wallet_address: publicKey?.toBase58(),
        amount: finalAmount === "MAX" ? lamports / LAMPORTS_PER_SOL : finalAmount,
        signature,
      };

      const res = await api.post("/contributions/", payload);

      if (res.status === 201) {
        const explorerUrl = `https://explorer.solana.com/tx/${signature}`;
        const solscanUrl = `https://solscan.io/tx/${signature}`;
        setStatus(`🎉 Transaction successful! <br/>
          <a href="${explorerUrl}" target="_blank" rel="noopener noreferrer" class="underline text-electric-blue">View on Explorer</a> |
          <a href="${solscanUrl}" target="_blank" rel="noopener noreferrer" class="underline text-electric-blue">View on Solscan</a>`);
      } else {
        setStatus(res.data?.message || "Transaction recorded. Verification in progress.");
      }
    } catch (err: any) {
      console.error("Transaction error", err);
      setStatus(`❌ ${err?.message || "Transaction failed or rejected."}`);
    } finally {
      setLoading(false);
    }
  };

  // -> optional small dev-only diagnostics UI in console (remove later)
  useEffect(() => {
    console.log("Wallet diagnostics:", diagnostics);
  }, [diagnostics]);

  return (
    <section className="container mx-auto px-4 py-20">
      <Card className="max-w-2xl mx-auto p-10 bg-card/90 backdrop-blur-sm border-border shadow-intense hover:shadow-intense">
        <div className="text-center space-y-10">
          {/* Network warning shown inside same status area if not mainnet */}
          {isMainnet === false && connected && (
            <p className="text-red-500 font-bold">⚠️ Please switch your wallet to MAINNET to continue.</p>
          )}

          {/* Social + headline */}
          <div className="space-y-3">
            <div className="flex flex-col md:flex-row gap-4 justify-center">
              <Button variant="outline" className="h-12 text-lg font-semibold" asChild>
                <a href="https://t.me/xarmeofficialbot" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2">
                  <Send className="w-5 h-5" /> MotherApp (V1)
                </a>
              </Button>

              <Button variant="outline" className="h-12 text-lg font-semibold" asChild>
                <a href="https://x.com/xarmebot" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2">
                  <Twitter className="w-5 h-5" /> Follow on X
                </a>
              </Button>
            </div>

            <h3 className="text-3xl md:text-4xl font-bold gradient-text-accent">
              Join Our Community Sale to gain GTD access to Vault 2 during MotherApp(V2) Launch
            </h3>
          </div>

          {/* X Handle input */}
          <div className="space-y-3 text-left">
            <label htmlFor="x-handle" className="text-sm font-medium text-foreground block">
              X Handle
            </label>
            <Input id="x-handle" type="text" placeholder="@your_handle" value={xHandle} onChange={(e) => setXHandle(e.target.value)} className="bg-input/50 backdrop-blur-sm border-border text-foreground h-12 text-center text-lg" />
          </div>

          {/* Connect wallet */}
          <Button variant="web3" size="lg" className="w-full h-14 text-lg font-semibold" onClick={handleConnectWallet}>
            {connected ? `Connected: ${publicKey?.toBase58().slice(0, 6)}...` : "Connect Wallet"}
          </Button>

          {/* Amount selectors */}
          <div className="space-y-6 w-full">
            <p className="text-sm font-medium text-foreground text-center">Select Contribution Amount</p>

            <div className="flex flex-wrap gap-3 justify-center">
              {amounts.map((amount) => (
                <Button key={amount} variant="amount" size="sm" onClick={() => { setSelectedAmount(amount); if (amount !== "MAX") setCustomAmount(""); }} className={`h-12 px-6 font-semibold ${selectedAmount === amount ? "border-electric-blue text-electric-blue shadow-intense" : ""}`}>
                  {amount === "MAX" ? "MAX" : `${amount} SOL`}
                </Button>
              ))}
            </div>

            <div className="flex gap-2 items-center justify-center">
              <Input type="number" placeholder="Enter custom amount" value={customAmount} onChange={(e) => { setCustomAmount(e.target.value); setSelectedAmount(null); }} className="bg-input/50 backdrop-blur-sm border-border text-foreground h-12 text-center w-40" />
              <span className="text-electric-blue font-semibold text-lg">SOL</span>
            </div>
          </div>

          {/* Buy button */}
          <Button variant="web3" size="lg" className="w-full h-14 text-lg font-semibold" onClick={handleBuy} disabled={loading || !isMainnet || !connected}>
            {loading ? "Processing..." : "BUY"}
          </Button>

          {/* Status / feedback */}
          {status && (
            <p className="mt-4 text-base font-medium text-electric-blue" dangerouslySetInnerHTML={{ __html: status }} />
          )}
        </div>
      </Card>
    </section>
  );
}
