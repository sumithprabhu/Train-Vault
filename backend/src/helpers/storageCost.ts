import { config } from "../config/index.js";

/**
 * Fixed storage cost per upload in wei (USDFC 18 decimals). Per-byte pricing is not used.
 */
export function getStorageCost(): bigint {
  return config.storageCostFixedWei;
}
