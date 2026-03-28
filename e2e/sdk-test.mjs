/**
 * Corpus SDK Test Suite
 * Run: node e2e/sdk-test.mjs
 *
 * Tests all SDK methods against a running backend.
 * Set BASE_URL env to override (default: http://localhost:3001)
 * Set WALLET_ADDRESS env to use a funded wallet (needed for uploads)
 */

import { createRequire } from "node:module";
import { readFileSync } from "node:fs";

const require = createRequire(import.meta.url);
const sdkModule = await import("../sdk/dist/index.js");
const Corpus = sdkModule.default?.default ?? sdkModule.default;
const CorpusApiError = sdkModule.CorpusApiError ?? sdkModule.default?.CorpusApiError;

const BASE_URL = process.env.BASE_URL || "http://localhost:3001";
const WALLET_ADDRESS = process.env.WALLET_ADDRESS || "0xD91D61bd2841839eA8c37581F033C9a91Be6a5A6";
const WALLET_ADDRESS_2 = "0x" + Array.from({ length: 40 }, () => Math.floor(Math.random() * 16).toString(16)).join("");

// ── Helpers ──────────────────────────────────────────────────────────────────

let passed = 0, failed = 0, skipped = 0;
const failures = [];

function ok(label) { passed++; console.log(`  ✓  ${label}`); }
function fail(label, reason) { failed++; failures.push({ label, reason }); console.log(`  ✗  ${label}\n     └─ ${reason}`); }
function skip(label, reason) { skipped++; console.log(`  ⚠  ${label} (skipped: ${reason})`); }
function section(title) { console.log(`\n── ${title} ${"─".repeat(Math.max(0, 55 - title.length))}`); }
function assert(label, condition, detail = "") {
  condition ? ok(label) : fail(label, detail || "assertion failed");
}

// ── State ─────────────────────────────────────────────────────────────────────

let apiKey = null;
let uploadedCid = null;
let datasetName = `sdk-test-${Date.now()}`;

console.log(`\nCorpus SDK Test Suite`);
console.log(`BASE_URL:        ${BASE_URL}`);
console.log(`WALLET_ADDRESS:  ${WALLET_ADDRESS.toLowerCase()}`);
console.log(`SDK version:     0.2.0`);
console.log(`Started at:      ${new Date().toISOString()}`);

// ── Health (no auth) ──────────────────────────────────────────────────────────

section("Health");

const anonClient = new Corpus({ baseUrl: BASE_URL });
try {
  const res = await anonClient.health.check();
  assert("health.check() returns ok:true", res.ok === true);
} catch (e) { fail("health.check()", e.message); }

// ── User ──────────────────────────────────────────────────────────────────────

section("User: create / get");

try {
  const res = await anonClient.user.create({ walletAddress: WALLET_ADDRESS });
  assert("user.create() returns apiKey", !!res.apiKey);
  assert("user.create() returns walletAddress", !!res.walletAddress);
  apiKey = res.apiKey;
} catch (e) { fail("user.create()", e.message); }

try {
  const res2 = await anonClient.user.create({ walletAddress: WALLET_ADDRESS });
  assert("user.create() idempotent → same apiKey", res2.apiKey === apiKey);
  assert("user.create() idempotent → message 'Existing user'", res2.message === "Existing user");
} catch (e) { fail("user.create() idempotency", e.message); }

try {
  await anonClient.user.create({ walletAddress: "not-a-valid-address" });
  fail("user.create() with invalid address should throw", "no error thrown");
} catch (e) {
  assert("user.create() invalid address → error thrown", e instanceof CorpusApiError || e instanceof Error);
}

// Authenticated client
const client = new Corpus({ apiKey, baseUrl: BASE_URL });

// ── API Key Management ─────────────────────────────────────────────────────────

section("User: API key management");

let newKeyId = null;
let newKeyFull = null;

try {
  const res = await client.user.listKeys();
  assert("user.listKeys() returns array", Array.isArray(res.keys));
  assert("at least 1 key exists", res.keys.length >= 1);
  assert("key item has id + prefix", !!res.keys[0].id && !!res.keys[0].prefix);
} catch (e) { fail("user.listKeys()", e.message); }

try {
  const res = await client.user.createKey({ name: "SDK Test Key" });
  assert("user.createKey() returns id", !!res.id);
  assert("user.createKey() returns key string", !!res.key);
  newKeyId = res.id;
  newKeyFull = res.key;
} catch (e) { fail("user.createKey()", e.message); }

if (newKeyFull) {
  try {
    const altClient = new Corpus({ apiKey: newKeyFull, baseUrl: BASE_URL });
    const res = await altClient.datasets.list();
    assert("new key authenticates successfully", res.success !== false);
  } catch (e) { fail("new key auth check", e.message); }
}

// ── Dataset: Prepare ──────────────────────────────────────────────────────────

section("Dataset: prepare");

try {
  const res = await client.datasets.prepare();
  assert("datasets.prepare() returns debitPerUploadWei", !!res.debitPerUploadWei);
  assert("datasets.prepare() returns debitPerMonthWei", !!res.debitPerMonthWei);
  console.log(`     debitPerUploadWei: ${res.debitPerUploadWei}`);
} catch (e) { fail("datasets.prepare()", e.message); }

// ── Dataset: Upload ────────────────────────────────────────────────────────────

section("Dataset: upload");

try {
  const buf = Buffer.from(`SDK test dataset ${Date.now()} ` + "x".repeat(150));
  // Use Blob — Node.js 25 undici has a known hang with File+FormData in native fetch
  const file = new Blob([new Uint8Array(buf)], { type: "text/plain" });

  console.log(`     Uploading (may take a minute for on-chain TX)…`);
  const res = await client.datasets.upload(file, { name: datasetName });
  assert("datasets.upload() returns cid", !!res.cid);
  assert("datasets.upload() returns name", res.name === datasetName);
  uploadedCid = res.cid;
  console.log(`     CID: ${uploadedCid}`);
} catch (e) {
  const msg = e.message || String(e);
  if (msg.includes("INSUFFICIENT_STORAGE_BALANCE")) {
    skip("datasets.upload()", "treasury configured but wallet has 0 balance");
  } else {
    fail("datasets.upload()", msg);
  }
}

// ── Dataset: List ──────────────────────────────────────────────────────────────

section("Dataset: list");

try {
  const datasets = await client.datasets.list();
  assert("datasets.list() returns array", Array.isArray(datasets));
  if (uploadedCid) {
    assert("uploaded dataset appears in list", datasets.some(d => d.cid === uploadedCid));
  }
  console.log(`     dataset count: ${datasets.length}`);
} catch (e) { fail("datasets.list()", e.message); }

// ── Dataset: Get by CID ────────────────────────────────────────────────────────

section("Dataset: get by CID");

if (!uploadedCid) {
  skip("datasets.get() / getMetadata()", "upload skipped");
} else {
  try {
    const meta = await client.datasets.getMetadata(uploadedCid);
    assert("datasets.getMetadata() returns cid", meta.cid === uploadedCid);
  } catch (e) { fail("datasets.getMetadata()", e.message); }

  try {
    const bytes = await client.datasets.get(uploadedCid);
    assert("datasets.get() returns ArrayBuffer", bytes instanceof ArrayBuffer);
    assert("downloaded bytes non-empty", bytes.byteLength > 0);
    console.log(`     file size: ${bytes.byteLength} bytes`);
  } catch (e) { fail("datasets.get()", e.message); }
}

// ── Dataset: Named + Versions ─────────────────────────────────────────────────

section("Dataset: named access + versions");

if (!uploadedCid) {
  skip("named dataset tests", "upload skipped");
} else {
  try {
    const bytes = await client.datasets.getByName(datasetName);
    assert("datasets.getByName() returns bytes", bytes instanceof ArrayBuffer && bytes.byteLength > 0);
  } catch (e) { fail("datasets.getByName()", e.message); }

  try {
    const res = await client.datasets.listVersionsByName(datasetName);
    assert("datasets.listVersionsByName() returns array", Array.isArray(res.versions));
    assert("at least 1 version", res.versions.length >= 1);
  } catch (e) { fail("datasets.listVersionsByName()", e.message); }

  let versionCid = null;
  try {
    const buf2 = Buffer.from(`SDK version 2 ${Date.now()} ` + "x".repeat(150));
    const file2 = new Blob([new Uint8Array(buf2)], { type: "text/plain" });
    console.log(`     Uploading version 2…`);
    const res = await client.datasets.addVersionByName(datasetName, file2);
    assert("datasets.addVersionByName() returns cid", !!res.cid);
    versionCid = res.cid;
  } catch (e) { fail("datasets.addVersionByName()", e.message); }

  if (versionCid) {
    try {
      const res = await client.datasets.setDefault(datasetName, versionCid);
      assert("datasets.setDefault() returns defaultCid", res.defaultCid === versionCid);
    } catch (e) { fail("datasets.setDefault()", e.message); }
  }
}

// ── Dataset: Sharing ──────────────────────────────────────────────────────────

section("Dataset: sharing (ACL)");

if (!uploadedCid) {
  skip("sharing tests", "upload skipped");
} else {
  try {
    const res = await client.datasets.listShares(uploadedCid);
    assert("datasets.listShares() returns array", Array.isArray(res.shares));
  } catch (e) { fail("datasets.listShares()", e.message); }

  try {
    const res = await client.datasets.share(uploadedCid, WALLET_ADDRESS_2);
    assert("datasets.share() returns sharedWith", res.sharedWith?.toLowerCase() === WALLET_ADDRESS_2.toLowerCase());
  } catch (e) { fail("datasets.share()", e.message); }

  try {
    const res = await client.datasets.revokeShare(uploadedCid, WALLET_ADDRESS_2);
    assert("datasets.revokeShare() returns revoked:true", res.revoked === true);
  } catch (e) { fail("datasets.revokeShare()", e.message); }
}

// ── Models ────────────────────────────────────────────────────────────────────

section("Models: register + get");

if (!uploadedCid) {
  skip("model tests", "upload skipped — need a real datasetCID");
} else {
  let provenanceHash = null;
  try {
    const res = await client.models.register({
      datasetCID: uploadedCid,
      modelArtifactCID: `bafySDKArtifact${Date.now()}`,
      trainingConfigHash: "0xconfig" + Date.now(),
      trainingCodeHash: "0xcode" + Date.now(),
    });
    assert("models.register() returns provenanceHash", !!res.provenanceHash);
    assert("models.register() returns anchorStatus", !!res.anchorStatus);
    provenanceHash = res.provenanceHash;
    console.log(`     provenanceHash: ${provenanceHash}`);
    console.log(`     anchorStatus:   ${res.anchorStatus}`);
  } catch (e) { fail("models.register()", e.message); }

  if (provenanceHash) {
    try {
      const res = await client.models.get(provenanceHash);
      assert("models.get() returns matching provenanceHash", res.provenanceHash === provenanceHash);
    } catch (e) { fail("models.get()", e.message); }
  }

  try {
    const runs = await client.models.list({ datasetCID: uploadedCid });
    assert("models.list() returns array", Array.isArray(runs));
    assert("registered run appears in list", runs.some(r => r.datasetCID === uploadedCid));
  } catch (e) { fail("models.list()", e.message); }
}

// ── Treasury ──────────────────────────────────────────────────────────────────

section("Treasury");

try {
  const res = await client.treasury.getBalance();
  assert("treasury.getBalance() returns balance string", typeof res.balance === "string");
  console.log(`     balance: ${res.balance} wei`);
} catch (e) { fail("treasury.getBalance()", e.message); }

try {
  const res = await client.treasury.getDatasets();
  assert("treasury.getDatasets() returns array", Array.isArray(res.datasets));
  console.log(`     treasury-tracked datasets: ${res.datasets.length}`);
} catch (e) { fail("treasury.getDatasets()", e.message); }

// ── Cleanup ───────────────────────────────────────────────────────────────────

section("Cleanup");

if (newKeyId) {
  try {
    const res = await client.user.revokeKey(newKeyId);
    assert("user.revokeKey() returns revoked:true", res.revoked === true);
  } catch (e) { fail("user.revokeKey()", e.message); }
}

if (uploadedCid) {
  try {
    const res = await client.datasets.deleteByName(datasetName);
    assert("datasets.deleteByName() returns deletedCount >= 1", res.deletedCount >= 1);
    console.log(`     deleted ${res.deletedCount} version(s)`);
  } catch (e) { fail("datasets.deleteByName()", e.message); }
}

// ── Results ───────────────────────────────────────────────────────────────────

console.log(`\n${"═".repeat(60)}`);
if (failures.length > 0) {
  console.log(`Results: ${passed}/${passed + failed} passed  (${skipped} skipped)\n`);
  console.log(`Failed tests:`);
  failures.forEach(({ label, reason }) => console.log(`  ✗  ${label}\n     └─ ${reason}`));
} else {
  console.log(`Results: ${passed}/${passed} passed${skipped ? `  (${skipped} skipped)` : ""}`);
}
console.log(`${"═".repeat(60)}\n`);

if (failed > 0) process.exit(1);
