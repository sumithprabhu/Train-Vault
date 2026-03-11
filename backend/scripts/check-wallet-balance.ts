/**
 * Check on-chain balances for the executor wallet (Calibration).
 * - Native (gas) balance
 * - USDFC token balance in wallet
 * - Treasury internal balance (deposited into contract)
 * Usage: npx tsx scripts/check-wallet-balance.ts
 */
import "dotenv/config";
import { createPublicClient, http, parseAbi } from "viem";

const RPC = process.env.RPC_URL ?? "https://api.calibration.node.glif.io/rpc/v1";
const WALLET = (process.env.TREASURY_EXECUTOR_ADDRESS ?? "0xD91D61bd2841839eA8c37581F033C9a91Be6a5A6") as `0x${string}`;
const USDFC = (process.env.USDFC_TOKEN_ADDRESS ?? "0xb3042734b608a1B16e9e86B374A3f3e389B4cDf0") as `0x${string}`;
const TREASURY = (process.env.TREASURY_CONTRACT_ADDRESS ?? "0x85c8629306c1976C1F3635288a6fE9BBFA4453ED") as `0x${string}`;
const CHAIN_ID = parseInt(process.env.TREASURY_CHAIN_ID ?? "314159", 10);

const erc20Abi = parseAbi(["function balanceOf(address owner) view returns (uint256)"]);
const treasuryAbi = parseAbi(["function balances(address) view returns (uint256)"]);

async function main() {
  const client = createPublicClient({
    chain: { id: CHAIN_ID, name: "Calibration", nativeCurrency: { decimals: 18, name: "FIL", symbol: "FIL" }, rpcUrls: { default: { http: [RPC] } } },
    transport: http(RPC),
  });

  console.log("Checking balances on Calibration for", WALLET);
  console.log("RPC:", RPC);
  console.log("---");

  const [native, usdfcRaw, treasuryRaw] = await Promise.all([
    client.getBalance({ address: WALLET }),
    client.readContract({ address: USDFC, abi: erc20Abi, functionName: "balanceOf", args: [WALLET] }),
    client.readContract({ address: TREASURY, abi: treasuryAbi, functionName: "balances", args: [WALLET] }),
  ]);

  const nativeFormatted = (Number(native) / 1e18).toFixed(6);
  const usdfcFormatted = (Number(usdfcRaw) / 1e18).toFixed(6);
  const treasuryFormatted = (Number(treasuryRaw) / 1e18).toFixed(6);

  console.log("Native (gas / tFIL):", nativeFormatted, "FIL");
  console.log("USDFC in wallet:   ", usdfcFormatted, "USDFC");
  console.log("Treasury balance   ", treasuryFormatted, "USDFC (deposited into contract)");
  console.log("---");
  console.log("To have treasury balance > 0: approve StorageTreasury for USDFC, then call deposit(amount) on the contract.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
