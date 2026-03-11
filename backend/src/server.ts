import express from "express";
import { connectDatabase } from "./config/database.js";
import { config } from "./config/index.js";
import { datasetRoutes } from "./routes/dataset.routes.js";
import { modelRoutes } from "./routes/model.routes.js";
import { userRoutes } from "./routes/user.routes.js";
import { treasuryRoutes } from "./routes/treasury.routes.js";
import { getExecutorAddress, isTreasuryConfigured } from "./helpers/treasury.js";
import { processPendingRecords } from "./services/treasuryRetry.service.js";

const app = express();

app.use(express.json({ limit: "10mb" }));

app.use("/dataset", datasetRoutes);
app.use("/model", modelRoutes);
app.use("/user", userRoutes);
app.use("/treasury", treasuryRoutes);

app.get("/health", (_req, res) => {
  res.json({ success: true, ok: true });
});

function verifyExecutorWallet(): void {
  const expected = config.treasury.executorAddress;
  if (!expected?.trim() || !config.treasury.executorPrivateKey) return;
  const derived = getExecutorAddress();
  if (!derived) return;
  if (derived.toLowerCase() !== expected.trim().toLowerCase()) {
    console.error(
      `[startup] TREASURY_EXECUTOR_ADDRESS (${expected}) does not match address derived from TREASURY_EXECUTOR_PRIVATE_KEY (${derived})`
    );
    process.exit(1);
  }
  console.log("[startup] Treasury executor wallet verified:", derived);
}

const TREASURY_RETRY_INTERVAL_MS = 60_000; // 1 minute

async function start() {
  verifyExecutorWallet();
  await connectDatabase();

  if (isTreasuryConfigured()) {
    const result = await processPendingRecords();
    if (result.processed > 0) {
      console.log(
        `[startup] Treasury retry: ${result.succeeded} recorded, ${result.skipped} skipped (already onchain), ${result.failed} failed`
      );
    }
    setInterval(async () => {
      try {
        await processPendingRecords();
      } catch (err) {
        console.error("[treasuryRetry] interval error:", err);
      }
    }, TREASURY_RETRY_INTERVAL_MS);
  }

  app.listen(config.port, () => {
    console.log(`Corpus API listening on http://localhost:${config.port}`);
  });
}

start().catch((err) => {
  console.error(err);
  process.exit(1);
});
