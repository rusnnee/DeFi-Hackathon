import "dotenv/config";
import express from "express";
import { BridgeKit } from "@circle-fin/bridge-kit";
import { createCircleWalletsAdapter } from "@circle-fin/adapter-circle-wallets";

const app = express();
app.use(express.json());

const API_KEY = process.env.CIRCLE_API_KEY!;
const ENTITY_SECRET = process.env.CIRCLE_ENTITY_SECRET!;
const TREASURY_WALLET_ADDRESS = process.env.TREASURY_WALLET_ADDRESS!;

const kit = new BridgeKit();

// Chain name mapping — Bridge Kit uses different names than Circle Wallets API
const CHAIN_MAP: Record<string, string> = {
  "ETH-SEPOLIA": "Ethereum_Sepolia",
  "BASE-SEPOLIA": "Base_Sepolia",
  "ARC-TESTNET": "Arc_Testnet",
};

// POST /bridge
// Body: { destinationAddress: "0x...", destinationChain: "ETH-SEPOLIA", amount: "0.01" }
app.post("/bridge", async (req, res) => {
  const { destinationAddress, destinationChain, amount } = req.body;

  if (!destinationAddress || !destinationChain || !amount) {
    return res.status(400).json({ error: "Missing destinationAddress, destinationChain, or amount" });
  }

  const destChain = CHAIN_MAP[destinationChain];
  if (!destChain) {
    return res.status(400).json({ error: `Unsupported chain: ${destinationChain}. Use ETH-SEPOLIA or BASE-SEPOLIA.` });
  }

  console.log(`Bridging ${amount} USDC → ${destinationChain} → ${destinationAddress}`);

  try {
    const adapter = createCircleWalletsAdapter({
      apiKey: API_KEY,
      entitySecret: ENTITY_SECRET,
    });

    const steps: any[] = [];

    const result = await kit.bridge({
      from: {
        adapter,
        chain: "Arc_Testnet",
        address: TREASURY_WALLET_ADDRESS,
      },
      to: {
        adapter,
        chain: destChain,
        address: destinationAddress,
      },
      amount,
      onStep: (step: any) => {
        console.log(`Step: ${step.name} | state: ${step.state}`);
        if (step.txHash) console.log(`  txHash: ${step.txHash}`);
        if (step.explorerUrl) console.log(`  explorer: ${step.explorerUrl}`);
        steps.push({
          name: step.name,
          state: step.state,
          txHash: step.txHash ?? null,
          explorerUrl: step.explorerUrl ?? null,
        });
      },
    });

    res.json({ status: "success", steps });
  } catch (err: any) {
    console.error("Bridge error:", err.message);
    res.status(500).json({ status: "failed", error: err.message });
  }
});

app.get("/health", (_, res) => res.json({ status: "ok" }));

app.listen(3001, () => console.log("Bridge service running on http://localhost:3001"));