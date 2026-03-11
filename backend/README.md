# Corpus Backend

Node.js + Express + MongoDB backend for dataset and model provenance. **Datasets are stored on Filecoin Calibration Testnet via Synapse SDK**; MongoDB holds only API keys, user wallet mapping, and dataset ownership/encryption metadata.

## Architecture

| Layer | Role |
|-------|------|
| **server.ts** | Starts Express, connects MongoDB, loads env, registers routes |
| **config/** | `index.ts` (env, Synapse operator key, network), `database.ts` (MongoDB connection) |
| **models/** | Mongoose: User (walletAddress, apiKey), Dataset (cid = pieceCID, ownerApiKey, ownerWalletAddress, …), ModelRun |
| **middleware/** | `apiKeyAuth` (validates `x-api-key`, attaches user), `upload` (multer memory) |
| **utils/** | `encryption.ts` (AES-256), `hash.ts` (provenance SHA256) |
| **services/** | `synapse.service` (upload/retrieve on Filecoin via Synapse), `dataset.service`, `model.service` |
| **helpers/** | `treasury.ts` (balance, recordAndDeduct, getDatasetId, executor verification), `storageCost.ts` (fixed cost) |
| **routes/** | dataset, model, user, treasury |
| **controllers/** | Handlers for each route set |

## Env (see `.env.example`)

- **MONGODB_URI** — MongoDB connection (API keys, wallet mapping, dataset metadata only).
- **ENCRYPTION_SECRET** — Used for optional dataset encryption before upload.
- **FILECOIN_NETWORK** — `calibration` (default) or `mainnet` for Synapse SDK.
- **SYNAPSE_OPERATOR_PRIVATE_KEY** — Operator wallet private key (hex). Required for Synapse storage operations.
- **Treasury (optional)** — When set, uploads use contract-based custody: **TREASURY_CONTRACT_ADDRESS**, **RPC_URL**, **TREASURY_EXECUTOR_PRIVATE_KEY**, **USDFC_TOKEN_ADDRESS**, **TREASURY_CHAIN_ID**. **STORAGE_COST_FIXED_WEI** defines the cost per upload. Optional **TREASURY_EXECUTOR_ADDRESS** is verified at startup against the address derived from the executor private key; if it does not match, the server exits. Users deposit to the contract (frontend calls `deposit(amount)`); backend only reads balances and calls **recordAndDeduct** (single atomic call) after a successful upload.

### Configuring Synapse (Filecoin Calibration)

1. **Operator wallet**: Create or use an EVM-style wallet for the backend operator. Fund it with test tFIL (gas) and test USDFC on Calibration (e.g. [Calibration Faucet](https://faucet.calibnet.chainsafe-fil.io/), [USDFC Faucet](https://forest-explorer.chainsafe.dev/faucet/calibnet_usdfc)).
2. Set **SYNAPSE_OPERATOR_PRIVATE_KEY** in `.env` (hex, with or without `0x`). This key is used only for storage operations; users approve this operator from their own wallet.
3. **User flow**: Users connect their wallet (e.g. MetaMask), deposit USDFC and call `synapse.payments.depositWithPermitAndApproveOperator()` client-side to approve the storage service. The backend then uses the operator to upload/retrieve on their behalf; ownership is tracked by `ownerWalletAddress` and `ownerApiKey` in MongoDB.

### How datasets are stored (Synapse SDK + optional Treasury)

- **Upload (with treasury)**:
  1. Backend checks user’s balance in **StorageTreasury** contract.
  2. Storage cost is **STORAGE_COST_FIXED_WEI** (fixed per upload).
  3. If balance &lt; cost → returns **402 INSUFFICIENT_STORAGE_BALANCE**.
  4. Uploads via **Synapse SDK** to Filecoin; on success calls contract **recordAndDeduct(user, cid, cost, size, datasetHash)** (single atomic transaction; contract derives datasetId from cid). If the transaction fails, the record is enqueued for retry (startup + every 60s) so accounting stays consistent.
  5. Saves metadata (including **storageCost**, **uploadTimestamp**) in MongoDB.
- **Upload (without treasury)**:
  Same as before: optional encrypt → Synapse upload → save metadata (storageCost can be 0).
- **Deposit**: Users deposit ERC20 (USDFC) by calling the **StorageTreasury** contract’s `deposit(amount)` from the frontend (after approving the token). Backend does not hold funds; it only reads balances and calls **recordAndDeduct** as the contract executor.
- **Retrieval**: Unchanged: metadata by CID → Synapse `storage.download({ pieceCid })` → optional decrypt → return buffer.

## API (all dataset/model routes require `x-api-key`)

- **POST /user/create** — Body: `{ "walletAddress": "0x..." }`. Returns `apiKey`. No auth.
- **GET /treasury/balance** — Returns `{ success, balance }` for the authenticated user's wallet (requires `x-api-key`). 503 if treasury is not configured.
- **GET /treasury/datasets** — Returns `{ success, datasets }` listing all datasets owned by the authenticated user (from database; requires `x-api-key`).
- **POST /dataset/upload** — Multipart: `file`; optional `encrypt`, `previousCID`. If treasury enabled: checks balance ≥ estimated cost; returns **402 INSUFFICIENT_STORAGE_BALANCE** otherwise. Returns `{ pieceCID, cid, storageCost }`.
- **GET /dataset** — List datasets for the API key.
- **GET /dataset/:cid** — Retrieve file by piece CID (or `?metadata=1` for metadata only).
- **POST /dataset/version** — Multipart: `file`, `previousCID` (required). Returns `{ pieceCID, cid, storageCost }`.
- **POST /model/register** — Body: `datasetCID`, `modelArtifactCID`, `trainingConfigHash`, `trainingCodeHash`. Returns run + `provenanceHash`.
- **GET /model** — List runs; optional `?datasetCID=`.
- **GET /model/:provenanceHash** — Get one run.

## Dependencies

```bash
npm install @filoz/synapse-sdk viem
```

Requires Node.js 20+.

## Run

```bash
cp .env.example .env
# Set MONGODB_URI, ENCRYPTION_SECRET, SYNAPSE_OPERATOR_PRIVATE_KEY
npm install
npm run dev
```
