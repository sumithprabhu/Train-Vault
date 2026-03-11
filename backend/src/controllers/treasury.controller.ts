import { Request, Response } from "express";
import * as treasury from "../helpers/treasury.js";
import { listDatasets } from "../services/dataset.service.js";

/**
 * GET /treasury/balance — Return treasury balance for the authenticated user's wallet.
 */
export async function getBalance(req: Request, res: Response): Promise<void> {
  try {
    if (!treasury.isTreasuryConfigured()) {
      res.status(503).json({ success: false, error: "Treasury not configured" });
      return;
    }
    const walletAddress = req.user!.walletAddress as `0x${string}`;
    const balance = await treasury.getUserBalance(walletAddress);
    res.json({ success: true, balance: balance.toString() });
  } catch (e) {
    res.status(500).json({
      success: false,
      error: e instanceof Error ? e.message : "Failed to get balance",
    });
  }
}

/**
 * GET /treasury/datasets — List datasets owned by the authenticated user (from database), with treasuryRecorded from contract.
 */
export async function getDatasets(req: Request, res: Response): Promise<void> {
  try {
    const ownerApiKey = req.user!.apiKey;
    const list = await listDatasets(ownerApiKey);
    const datasets =
      treasury.isTreasuryConfigured()
        ? await Promise.all(
            list.map(async (d) => ({
              ...d,
              treasuryRecorded: await treasury.datasetExists(d.cid),
            }))
          )
        : list.map((d) => ({ ...d, treasuryRecorded: false }));
    res.json({ success: true, datasets });
  } catch (e) {
    res.status(500).json({
      success: false,
      error: e instanceof Error ? e.message : "Failed to list datasets",
    });
  }
}
