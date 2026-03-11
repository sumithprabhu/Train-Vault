# Deployment

This document describes how to run the system based on the implemented code: contract deployment on **Filecoin Calibration**, backend configuration, required environment variables, starting the backend, and retry worker behavior.

## Deployed addresses (Filecoin Calibration)

| Contract / Token | Address |
|------------------|---------|
| **StorageTreasury** | `0x85c8629306c1976C1F3635288a6fE9BBFA4453ED` |
| **USDFC (ERC20)** | `0xb3042734b608a1B16e9e86B374A3f3e389B4cDf0` |

Chain: Filecoin Calibration. RPC: `https://api.calibration.node.glif.io/rpc/v1`. Chain ID: `314159`.

## Contract deployment

**Location:** `corpus/contracts/`

Treasury and token are deployed on **Filecoin Calibration only** (no Sepolia). The USDFC token and StorageTreasury must be on the same network.

### Prerequisites

- Node.js and npm (or equivalent).
- Hardhat and dependencies installed (`npm install`).
- In `contracts/.env`: `PRIVATE_KEY` (Calibration-funded deployer), `RPC_URL` (Calibration), `USDFC_TOKEN_ADDRESS`.

### Environment for deploy script

The deploy script `scripts/deployStorageTreasury.ts` reads:

- **USDFC_TOKEN_ADDRESS** (required): ERC20 token address on Calibration to pass to the StorageTreasury constructor (e.g. `0xb3042734b608a1B16e9e86B374A3f3e389B4cDf0`).
- **TREASURY_EXECUTOR_ADDRESS** (optional): Executor address. If not set, the deployer address is used.

### Deploy command

From the contracts directory (Calibration only):

```bash
cd corpus/contracts
# Ensure .env has PRIVATE_KEY, RPC_URL, USDFC_TOKEN_ADDRESS for Calibration
npx hardhat run scripts/deployStorageTreasury.ts --network calibration
```

The script prints the deployed contract address. Set in backend `.env`:

- `TREASURY_CONTRACT_ADDRESS=<printed address>`
- `RPC_URL=https://api.calibration.node.glif.io/rpc/v1`
- `TREASURY_CHAIN_ID=314159`
- `TREASURY_EXECUTOR_PRIVATE_KEY=<executor wallet private key on Calibration>`

### Constructor arguments

- `_token`: ERC20 token address.
- `_executor`: Address that may call `recordAndDeduct` (typically the backend executor wallet).

---

## Backend configuration

**Location:** `corpus/backend/`

### Prerequisites

- Node.js 20+.
- MongoDB (local or remote) for API keys, dataset metadata, pending treasury records, model runs.
- For dataset upload/retrieve: Synapse operator key and Filecoin network (calibration/mainnet).
- For treasury: deployed StorageTreasury, RPC, executor private key.

### Required environment variables

- **MONGODB_URI** — used for all MongoDB connectivity (default in code: `mongodb://localhost:27017/corpus`).
- **SYNAPSE_OPERATOR_PRIVATE_KEY** — required for Synapse upload and retrieve (config warns if missing).

For **treasury features** (balance checks, recordAndDeduct, retry worker, GET /treasury/balance, GET /treasury/datasets with treasuryRecorded):

- **TREASURY_CONTRACT_ADDRESS**
- **RPC_URL**
- **TREASURY_EXECUTOR_PRIVATE_KEY**

Optional:

- **TREASURY_EXECUTOR_ADDRESS** — if set, startup verifies it matches the address derived from the executor private key and exits on mismatch.
- **PORT** or **API_PORT** (default 3001).
- **ENCRYPTION_SECRET**, **FILECOIN_NETWORK**, **STORAGE_COST_FIXED_WEI**, **TREASURY_CHAIN_ID** — see [Environment](environment.md).

### Example .env

Copy from `.env.example` and fill in:

```bash
cd corpus/backend
cp .env.example .env
# Edit .env: MONGODB_URI, SYNAPSE_OPERATOR_PRIVATE_KEY, and if using treasury:
# TREASURY_CONTRACT_ADDRESS, RPC_URL, TREASURY_EXECUTOR_PRIVATE_KEY, optionally TREASURY_EXECUTOR_ADDRESS
```

---

## Starting the backend

### Install and build

```bash
cd corpus/backend
npm install
npm run build
```

### Run

Development (if script exists):

```bash
npm run dev
```

Or run the compiled server:

```bash
node dist/server.js
```

Or with ts-node/tsx if configured:

```bash
npx tsx src/server.ts
```

Startup order in code:

1. **verifyExecutorWallet()** — if `TREASURY_EXECUTOR_ADDRESS` and `TREASURY_EXECUTOR_PRIVATE_KEY` are set, checks derived address matches; on mismatch logs and `process.exit(1)`.
2. **connectDatabase()** — Mongoose connect to `MONGODB_URI`.
3. **processPendingRecords()** (if treasury configured) — one-time retry of pending treasury records; logs recorded/skipped/failed if any processed.
4. **setInterval(processPendingRecords, 60000)** (if treasury configured) — every 60 seconds, run the same retry logic.
5. **app.listen(port)** — HTTP server starts.

---

## Retry worker behavior

- **When:** Runs once at startup (after DB connect) and every 60 seconds, only when treasury is configured (`isTreasuryConfigured()`).
- **If paused:** Calls `isTreasuryPaused()`; if true, returns without processing.
- **Processing:** Loads all `PendingTreasuryRecord` documents in `createdAt` order. For each: if `datasetExists(cid)` then delete document and count skipped; else call `recordAndDeduct`, then delete on success or update `lastError` on failure.
- **Logging:** Startup logs only when `processed > 0`: `[startup] Treasury retry: X recorded, Y skipped (already onchain), Z failed`. Interval errors are logged as `[treasuryRetry] interval error:`.

See [Retry system](retry-system.md) for full detail.

---

## Example commands summary

```bash
# Deploy contract on Calibration (from corpus/contracts)
# Set USDFC_TOKEN_ADDRESS in contracts/.env (e.g. 0xb3042734b608a1B16e9e86B374A3f3e389B4cDf0)
npx hardhat run scripts/deployStorageTreasury.ts --network calibration

# Backend (from corpus/backend)
cp .env.example .env
# Set TREASURY_CONTRACT_ADDRESS=0x85c8629306c1976C1F3635288a6fE9BBFA4453ED, RPC_URL, TREASURY_EXECUTOR_PRIVATE_KEY, etc.
npm install && npm run build
npm run dev
# Or: node dist/server.js
```

No other deployment steps (e.g. frontend or external indexers) are implied by the current codebase; this doc covers only what is implemented.
