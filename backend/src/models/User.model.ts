import mongoose, { Schema, Document, Model } from "mongoose";
import crypto from "crypto";

export interface IUser extends Document {
  walletAddress: string;
  apiKey: string;
  createdAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    walletAddress: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    apiKey: {
      type: String,
      required: true,
      unique: true,
    },
    createdAt: {
      type: Date,
      default: () => new Date(),
    },
  },
  { timestamps: true }
);

export function generateApiKey(): string {
  return `tv_${crypto.randomBytes(24).toString("hex")}`;
}

export const User: Model<IUser> = mongoose.models.User ?? mongoose.model<IUser>("User", UserSchema);
