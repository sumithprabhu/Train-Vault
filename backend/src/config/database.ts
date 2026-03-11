import mongoose from "mongoose";
import { config } from "./index.js";

/**
 * Connect to MongoDB. Called from server.ts at startup.
 */
export async function connectDatabase(): Promise<void> {
  await mongoose.connect(config.mongodbUri);
  console.log("MongoDB connected");
}
