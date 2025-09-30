import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { api } from "@/lib/api";
import { PublicKey, SystemProgram, Transaction, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { useWallet, useConnection } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import { Send, Link as LinkIcon } from "lucide-react"; // ✅ Icons added
import { MessageCircle, Twitter } from "lucide-react"; // Telegram & X Icons

export function HeroSection() {
  const [xHandle, setXHandle] = useState("");
  const [selectedAmount, setSelectedAmount] = useState<string | null>(null);
  const [customAmount, setCustomAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  const amounts = ["0.5", "1", "2.5", "5", "10", "MAX"];

  const { publicKey, sendTransaction, connected } = useWallet();
  const { connection } = useConnection();
  const { setVisible } = useWalletModal();

  const RECEIVER_ADDRESS = import.meta.env.VITE_RECEIVER_ADDRESS || "REPLACE_WITH_RECEIVER_PUBKEY";

  const handleConnectWallet = () => setVisible(true);

  const getFinalAmount = () => {
    if (selectedAmount === "MAX") {
      if (!publicKey || !connection) return null;
      return "MAX";
    }
    return customAmount && !isNaN(Number(customAmount)) ? customAmount : selectedAmount;
  };

  const handleBuy = async () => {
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
        lamports = Math.round(parseFloat(finalAmount) * LAMPORTS_PER_SOL);
      }

      const tx = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: publicKey,
          toPubkey: new PublicKey(RECEIVER_ADDRESS),
          lamports,
        })
      );

      const signature = await sendTransaction(tx, connection);
      setStatus(`⏳ Transaction submitted: ${signature}`);
      await connection.confirmTransaction(signature, "confirmed");

      const payload = {
        x_handle: xHandle,
        wallet_address: publicKey.toBase58(),
        amount: finalAmount === "MAX" ? lamports / LAMPORTS_PER_SOL : finalAmount,
        signature
      };
      const res = await api.post("/contributions/", payload);

      if (res.status === 201) {
        const cluster = import.meta.env.VITE_SOLANA_NETWORK || "devnet";
        const explorerUrl = `https://explorer.solana.com/tx/${signature}?cluster=${cluster}`;
        const solscanUrl = `https://solscan.io/tx/${signature}?cluster=${cluster}`;

        setStatus(`🎉 Transaction successful! <br/>
          <a href="${explorerUrl}" target="_blank" class="underline text-electric-blue">View on Explorer</a> |
          <a href="${solscanUrl}" target="_blank" class="underline text-electric-blue">View on Solscan</a>`);
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

  return (
    <section className="container mx-auto px-4 py-20">
      <Card className="max-w-2xl mx-auto p-10 bg-card/90 backdrop-blur-sm border-border shadow-intense hover:shadow-intense">
        <div className="text-center space-y-10">
          <div className="space-y-3">
            <h2 className="text-2xl md:text-3xl font-bold gradient-text">
              Enter Mother App (V1)
            </h2>
            <h3 className="text-3xl md:text-4xl font-bold gradient-text-accent">
              Join Our Community Sale to gain GTD access to Vault 2 during MotherApp(V2) Launch
            </h3>
          </div>

          {/* ✅ Social Buttons Added Here */}
          <div className="flex flex-col md:flex-row gap-4 justify-center">
            <Button variant="outline" className="h-12 text-lg font-semibold" asChild>
              <a href="https://t.me/xarmeofficialbot" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2">
                <MessageCircle className="w-5 h-5" /> MotherApp (V1)
              </a>
            </Button>

            <Button variant="outline" className="h-12 text-lg font-semibold" asChild>
              <a href="https://x.com/xarmebot" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2">
                <Twitter className="w-5 h-5" /> Follow on X
              </a>
            </Button>
          </div>

          {/* Rest of UI remains the same */}

          <div className="space-y-3 text-left">
            <label htmlFor="x-handle" className="text-sm font-medium text-foreground block">
              X Handle
            </label>
            <Input
              id="x-handle"
              type="text"
              placeholder="@your_handle"
              value={xHandle}
              onChange={(e) => setXHandle(e.target.value)}
              className="bg-input/50 backdrop-blur-sm border-border text-foreground h-12 text-center text-lg"
            />
          </div>

          <Button
            variant="web3"
            size="lg"
            className="w-full h-14 text-lg font-semibold"
            onClick={handleConnectWallet}
          >
            {connected ? `Connected: ${publicKey?.toBase58().slice(0, 6)}...` : "Connect Wallet"}
          </Button>

          {/* ...rest of the component */}

          <Button
            variant="web3"
            size="lg"
            className="w-full h-14 text-lg font-semibold"
            onClick={handleBuy}
            disabled={loading}
          >
            {loading ? "Processing..." : "BUY"}
          </Button>

          {status && <p className="mt-4 text-base font-medium text-electric-blue" dangerouslySetInnerHTML={{ __html: status }} />}
        </div>
      </Card>
    </section>
  );
}
