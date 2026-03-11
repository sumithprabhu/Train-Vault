import { Request, Response } from "express";
import { User, generateApiKey } from "../models/User.model.js";

/**
 * POST /user/create
 * Body: walletAddress.
 * Returns: apiKey (store securely; used as x-api-key for all other endpoints).
 */
export async function create(req: Request, res: Response): Promise<void> {
  try {
    const { walletAddress } = req.body;
    if (!walletAddress || typeof walletAddress !== "string") {
      res.status(400).json({ success: false, error: "walletAddress required" });
      return;
    }
    const trimmed = walletAddress.trim().toLowerCase();
    if (!trimmed) {
      res.status(400).json({ success: false, error: "walletAddress required" });
      return;
    }
    let user = await User.findOne({ walletAddress: trimmed });
    if (user) {
      res.json({
        success: true,
        walletAddress: user.walletAddress,
        apiKey: user.apiKey,
        message: "Existing user",
      });
      return;
    }
    const apiKey = generateApiKey();
    user = await User.create({
      walletAddress: trimmed,
      apiKey,
      createdAt: new Date(),
    });
    res.status(201).json({
      success: true,
      walletAddress: user.walletAddress,
      apiKey: user.apiKey,
    });
  } catch (e) {
    res.status(500).json({
      success: false,
      error: e instanceof Error ? e.message : "Create user failed",
    });
  }
}
