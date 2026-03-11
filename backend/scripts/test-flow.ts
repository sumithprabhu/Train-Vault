/**
 * End-to-end flow test against a running backend.
 * Usage: npx tsx scripts/test-flow.ts
 * Requires: backend running (e.g. npm run dev on port 3001).
 * If treasury is configured, the script deposits 1 USDFC into the treasury so upload can succeed.
 */
import "dotenv/config";
import {
  createPublicClient,
  createWalletClient,
  http,
  parseAbi,
  type Address,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";

const BASE = process.env.API_BASE_URL ?? "http://localhost:3001";
const TEST_WALLET = (process.env.TREASURY_EXECUTOR_ADDRESS ?? "0xD91D61bd2841839eA8c37581F033C9a91Be6a5A6") as `0x${string}`;

const DEPOSIT_AMOUNT = BigInt(process.env.TEST_DEPOSIT_WEI ?? "1000000000000000000"); // 1 USDFC (18 decimals)

const ERC20_ABI = parseAbi([
  "function approve(address spender, uint256 amount) returns (bool)",
  "function allowance(address owner, address spender) view returns (uint256)",
]);
const TREASURY_ABI = parseAbi([
  "function deposit(uint256 amount)",
  "function balances(address) view returns (uint256)",
]);

async function depositIntoTreasury(): Promise<boolean> {
  const rpc = process.env.RPC_URL;
  const key = process.env.TREASURY_EXECUTOR_PRIVATE_KEY;
  const treasury = process.env.TREASURY_CONTRACT_ADDRESS as Address | undefined;
  const usdfc = process.env.USDFC_TOKEN_ADDRESS as Address | undefined;
  const chainId = parseInt(process.env.TREASURY_CHAIN_ID ?? "314159", 10);

  if (!rpc || !key || !treasury || !usdfc) {
    console.log("SKIP: deposit (set RPC_URL, TREASURY_EXECUTOR_PRIVATE_KEY, TREASURY_CONTRACT_ADDRESS, USDFC_TOKEN_ADDRESS)");
    return false;
  }

  const pk = key.startsWith("0x") ? key : `0x${key}`;
  const account = privateKeyToAccount(pk as `0x${string}`);
  const chain = {
    id: chainId,
    name: "Calibration",
    nativeCurrency: { name: "FIL", symbol: "FIL", decimals: 18 },
    rpcUrls: { default: { http: [rpc] } },
  };

  const walletClient = createWalletClient({
    account,
    chain,
    transport: http(rpc),
  });
  const publicClient = createPublicClient({ chain, transport: http(rpc) });

  const currentBalance = await publicClient.readContract({
    address: treasury,
    abi: TREASURY_ABI,
    functionName: "balances",
    args: [account.address],
  });
  if (currentBalance >= DEPOSIT_AMOUNT) {
    console.log("OK: Treasury already has enough balance, skip deposit");
    return true;
  }

  const allowance = await publicClient.readContract({
    address: usdfc,
    abi: ERC20_ABI,
    functionName: "allowance",
    args: [account.address, treasury],
  });
  if (allowance < DEPOSIT_AMOUNT) {
    const approveHash = await walletClient.writeContract({
      address: usdfc,
      abi: ERC20_ABI,
      functionName: "approve",
      args: [treasury, DEPOSIT_AMOUNT],
      account,
    });
    await publicClient.waitForTransactionReceipt({ hash: approveHash });
    console.log("OK: USDFC.approve(treasury, 1 USDFC)");
  }

  const depositHash = await walletClient.writeContract({
    address: treasury,
    abi: TREASURY_ABI,
    functionName: "deposit",
    args: [DEPOSIT_AMOUNT],
    account,
  });
  await publicClient.waitForTransactionReceipt({ hash: depositHash });
  console.log("OK: Treasury.deposit(1 USDFC)");
  return true;
}

async function main() {
  console.log("Testing backend flow at", BASE);
  console.log("---");

  // 1. Health
  const healthRes = await fetch(`${BASE}/health`);
  const health = (await healthRes.json()) as { success?: boolean; ok?: boolean };
  if (!health?.ok) {
    console.error("FAIL: /health", health);
    process.exit(1);
  }
  console.log("OK: GET /health");

  // 2. Create user (or get existing)
  const createRes = await fetch(`${BASE}/user/create`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ walletAddress: TEST_WALLET }),
  });
  const createData = (await createRes.json()) as {
    success?: boolean;
    apiKey?: string;
    walletAddress?: string;
    error?: string;
  };
  if (!createData.success || !createData.apiKey) {
    console.error("FAIL: POST /user/create", createData);
    process.exit(1);
  }
  const apiKey = createData.apiKey;
  console.log("OK: POST /user/create -> apiKey:", apiKey.slice(0, 12) + "...");

  // 3. Deposit into treasury (so upload can succeed)
  await depositIntoTreasury();

  // 4. Treasury balance
  const balanceRes = await fetch(`${BASE}/treasury/balance`, {
    headers: { "x-api-key": apiKey },
  });
  const balanceData = (await balanceRes.json()) as { success?: boolean; balance?: string; error?: string };
  if (balanceRes.status === 503) {
    console.log("SKIP: GET /treasury/balance (treasury not configured)");
  } else if (!balanceData.success) {
    console.error("FAIL: GET /treasury/balance", balanceData);
  } else {
    console.log("OK: GET /treasury/balance ->", balanceData.balance ?? "0");
  }

  const preview = (buf: Buffer, max = 80) =>
    buf.length <= max ? buf.toString("hex") : buf.subarray(0, 40).toString("hex") + "..." + buf.subarray(-20).toString("hex");

  // --- 5. Named dataset "railway" (first type) ---
  const FILE_SIZE = 20 * 1024; // 20 KB
  const railwayFile = Buffer.alloc(FILE_SIZE, "x");
  const uniqueSuffix = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  railwayFile.write(uniqueSuffix, FILE_SIZE - 56);

  console.log("---");
  console.log("5a. Upload named dataset 'railway' (encrypted):");
  console.log("  size:", railwayFile.length, "bytes, preview:", preview(railwayFile));

  const formRailway = new FormData();
  formRailway.append("file", new Blob([railwayFile]), "railway.bin");
  formRailway.append("name", "railway");
  formRailway.append("encrypt", "true");

  const t0 = performance.now();
  const uploadRailway = await fetch(`${BASE}/dataset/upload`, {
    method: "POST",
    headers: { "x-api-key": apiKey },
    body: formRailway,
    signal: AbortSignal.timeout(300_000),
  });
  const uploadRailwayMs = performance.now() - t0;
  const railwayData = (await uploadRailway.json()) as { success?: boolean; pieceCID?: string; error?: string };

  if (!railwayData.success) {
    if (uploadRailway.status === 409) console.log("  (railway already exists this run, skip or use version endpoint)");
    console.error("  FAIL: POST /dataset/upload (railway)", uploadRailway.status, railwayData);
  } else {
    console.log("  OK: cid:", railwayData.pieceCID, "| time:", (uploadRailwayMs / 1000).toFixed(2), "s");
    const cidRailway = railwayData.pieceCID!;
    const rawRes = await fetch(`${BASE}/dataset/${encodeURIComponent(cidRailway)}/raw`, { headers: { "x-api-key": apiKey } });
    if (rawRes.ok) {
      const raw = Buffer.from(await rawRes.arrayBuffer());
      console.log("  Raw on Filecoin:", raw.length, "bytes, encrypted?", !railwayFile.equals(raw));
    }
    const dlRes = await fetch(`${BASE}/dataset/${encodeURIComponent(cidRailway)}`, { headers: { "x-api-key": apiKey } });
    if (dlRes.ok) {
      const dl = Buffer.from(await dlRes.arrayBuffer());
      console.log("  Download match:", railwayFile.equals(dl) ? "OK" : "FAIL");
    }
  }

  // --- 6. Named dataset "bus" (second type) ---
  let busFile = Buffer.from("bus dataset content " + Date.now() + " " + Math.random().toString(36).slice(2));
  if (busFile.length < 127) busFile = Buffer.concat([busFile, Buffer.alloc(127 - busFile.length, "x")]);

  console.log("---");
  console.log("5b. Upload named dataset 'bus':");
  console.log("  size:", busFile.length, "bytes");

  const formBus = new FormData();
  formBus.append("file", new Blob([busFile]), "bus.bin");
  formBus.append("name", "bus");

  const t1 = performance.now();
  const uploadBus = await fetch(`${BASE}/dataset/upload`, {
    method: "POST",
    headers: { "x-api-key": apiKey },
    body: formBus,
    signal: AbortSignal.timeout(300_000),
  });
  const uploadBusMs = performance.now() - t1;
  const busData = (await uploadBus.json()) as { success?: boolean; pieceCID?: string; error?: string };

  if (!busData.success) {
    if (uploadBus.status === 409) console.log("  (bus already exists this run)");
    console.error("  FAIL: POST /dataset/upload (bus)", uploadBus.status, busData);
  } else {
    console.log("  OK: cid:", busData.pieceCID, "| time:", (uploadBusMs / 1000).toFixed(2), "s");
  }

  // --- 7. Add a new version to "railway" ---
  let railwayV2 = Buffer.from("railway v2 updated " + Date.now());
  if (railwayV2.length < 127) railwayV2 = Buffer.concat([railwayV2, Buffer.alloc(127 - railwayV2.length, "x")]);

  console.log("---");
  console.log("7. Add new version to 'railway':");
  console.log("  size:", railwayV2.length, "bytes");

  const formRailwayV2 = new FormData();
  formRailwayV2.append("file", new Blob([railwayV2]), "railway-v2.bin");

  const t2 = performance.now();
  const versionRes = await fetch(`${BASE}/dataset/by-name/railway/version`, {
    method: "POST",
    headers: { "x-api-key": apiKey },
    body: formRailwayV2,
    signal: AbortSignal.timeout(300_000),
  });
  const versionMs = performance.now() - t2;
  const versionData = (await versionRes.json()) as { success?: boolean; pieceCID?: string; error?: string };

  if (!versionData.success) {
    console.error("  FAIL: POST /dataset/by-name/railway/version", versionRes.status, versionData);
  } else {
    console.log("  OK: new cid:", versionData.pieceCID, "| time:", (versionMs / 1000).toFixed(2), "s");
  }

  // --- 8. List all datasets (show all files user has) ---
  console.log("---");
  console.log("8. All datasets for user:");

  const listRes = await fetch(`${BASE}/dataset`, { headers: { "x-api-key": apiKey } });
  const listData = (await listRes.json()) as {
    success?: boolean;
    datasets?: Array<{
      cid?: string;
      name?: string;
      isDefault?: boolean;
      previousCID?: string | null;
      uploadTimestamp?: string;
      createdAt?: string;
    }>;
    error?: string;
  };

  if (!listData.success) {
    console.error("FAIL: GET /dataset", listData);
  } else {
    const datasets = listData.datasets ?? [];
    console.log("  Total count:", datasets.length);
    datasets.forEach((d, i) => {
      console.log(`  [${i + 1}] name: ${d.name ?? "(unnamed)"} | cid: ${(d.cid ?? "").slice(0, 20)}... | default: ${d.isDefault ?? false} | uploaded: ${d.uploadTimestamp ?? d.createdAt ?? ""}`);
    });
  }

  // --- 9. Treasury datasets ---
  console.log("---");
  const treasuryListRes = await fetch(`${BASE}/treasury/datasets`, { headers: { "x-api-key": apiKey } });
  const treasuryListData = (await treasuryListRes.json()) as {
    success?: boolean;
    datasets?: Array<{ cid?: string; treasuryRecorded?: boolean }>;
    error?: string;
  };
  if (!treasuryListData.success) {
    console.error("FAIL: GET /treasury/datasets", treasuryListData);
  } else {
    console.log("OK: GET /treasury/datasets -> count:", (treasuryListData.datasets ?? []).length);
  }

  console.log("---");
  console.log("Flow test done.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
