import { config } from "../config/index.js";

/**
 * Fixed storage cost per upload in wei (USDFC 18 decimals).
 */
export function getStorageCost(): bigint {
  return config.storageCostFixedWei;
}

/**
 * Storage cost per month in wei. Storage is billed per month; access is not permanent.
 */
export function getStorageCostPerMonth(): bigint {
  return config.storageCostPerMonthWei;
}
