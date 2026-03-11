import { PendingTreasuryRecord } from "../models/PendingTreasuryRecord.model.js";
import * as treasury from "../helpers/treasury.js";
import type { Address } from "viem";

/**
 * Enqueue a failed recordAndDeduct for later retry. Call when upload succeeded but onchain record failed.
 */
export async function enqueuePendingRecord(
  userWalletAddress: string,
  cid: string,
  costWei: bigint,
  sizeBytes: number,
  datasetHash: `0x${string}`,
  lastError?: string
): Promise<void> {
  await PendingTreasuryRecord.findOneAndUpdate(
    { cid },
    {
      userWalletAddress: userWalletAddress.toLowerCase(),
      cid,
      costWei: costWei.toString(),
      sizeBytes,
      datasetHash,
      lastError: lastError ?? undefined,
    },
    { upsert: true, new: true }
  );
}

/**
 * Process pending treasury records: skip if contract paused; for each, if datasetExists(cid) remove and skip; else call recordAndDeduct.
 */
export async function processPendingRecords(): Promise<{
  processed: number;
  succeeded: number;
  skipped: number;
  failed: number;
}> {
  if (!treasury.isTreasuryConfigured()) return { processed: 0, succeeded: 0, skipped: 0, failed: 0 };

  const paused = await treasury.isTreasuryPaused();
  if (paused) return { processed: 0, succeeded: 0, skipped: 0, failed: 0 };

  const pending = await PendingTreasuryRecord.find({}).sort({ createdAt: 1 }).lean();
  let succeeded = 0;
  let skipped = 0;
  let failed = 0;

  for (const doc of pending) {
    try {
      const exists = await treasury.datasetExists(doc.cid);
      if (exists) {
        await PendingTreasuryRecord.deleteOne({ _id: doc._id });
        skipped++;
        continue;
      }
      await treasury.recordAndDeduct(
        doc.userWalletAddress as Address,
        doc.cid,
        BigInt(doc.costWei),
        doc.sizeBytes,
        doc.datasetHash as `0x${string}`
      );
      await PendingTreasuryRecord.deleteOne({ _id: doc._id });
      succeeded++;
    } catch (err) {
      failed++;
      const msg = err instanceof Error ? err.message : String(err);
      await PendingTreasuryRecord.updateOne(
        { _id: doc._id },
        { $set: { lastError: msg } }
      ).exec();
      console.error("[treasuryRetry] recordAndDeduct failed for cid:", doc.cid, msg);
    }
  }

  return { processed: pending.length, succeeded, skipped, failed };
}
