import mongoose, { Schema, Document, Model } from "mongoose";

export interface IPendingTreasuryRecord extends Document {
  userWalletAddress: string;
  cid: string;
  costWei: string;
  sizeBytes: number;
  datasetHash: string; // hex 0x...
  lastError?: string;
  createdAt: Date;
  updatedAt: Date;
}

const PendingTreasuryRecordSchema = new Schema<IPendingTreasuryRecord>(
  {
    userWalletAddress: { type: String, required: true, index: true },
    cid: { type: String, required: true, unique: true },
    costWei: { type: String, required: true },
    sizeBytes: { type: Number, required: true },
    datasetHash: { type: String, required: true },
    lastError: { type: String },
  },
  { timestamps: true }
);

PendingTreasuryRecordSchema.index({ createdAt: 1 });

export const PendingTreasuryRecord: Model<IPendingTreasuryRecord> =
  mongoose.models.PendingTreasuryRecord ??
  mongoose.model<IPendingTreasuryRecord>("PendingTreasuryRecord", PendingTreasuryRecordSchema);
