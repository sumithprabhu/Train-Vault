import { Request, Response, NextFunction } from "express";
import { User } from "../models/User.model.js";

/**
 * API key gating: validates x-api-key header, looks up user, attaches to request.
 * Rejects with 401 if missing or invalid.
 */
export async function apiKeyAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  const apiKey = req.headers["x-api-key"];
  const key = typeof apiKey === "string" ? apiKey.trim() : "";

  if (!key) {
    res.status(401).json({ success: false, error: "Missing x-api-key header" });
    return;
  }

  try {
    const user = await User.findOne({ apiKey: key });
    if (!user) {
      res.status(401).json({ success: false, error: "Invalid API key" });
      return;
    }
    req.user = user;
    next();
  } catch (err) {
    res.status(500).json({ success: false, error: "Authentication error" });
  }
}
