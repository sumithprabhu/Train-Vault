# Environment Variables

Variables are read from the process environment (e.g. `.env` via dotenv in `corpus/backend/src/config/index.ts`). The backend does not read `.env` for the contracts package; contract deployment uses the shell environment (e.g. `USDFC_TOKEN_ADDRESS`, `TREASURY_EXECUTOR_ADDRESS` in deploy script).

Sources: `corpus/backend/src/config/index.ts`, `corpus/backend/.env.example`, and usage in services/helpers.

---

## Server

| Name | Description | Example | Required |
|------|-------------|---------|----------|
| `PORT` | HTTP server port. | `3001` | No (default 3001) |
| `API_PORT` | Alternative to PORT. | `3001` | No |

Config uses `process.env.PORT ?? process.env.API_PORT ?? "3001"`.

---

## MongoDB

| Name | Description | Example | Required |
|------|-------------|---------|----------|
| `MONGODB_URI` | MongoDB connection string. | `mongodb://localhost:27017/corpus` | No (default above) |

Used in `config/database.ts` for Mongoose connection.

---

## Encryption

| Name | Description | Example | Required |
|------|-------------|---------|----------|
| `ENCRYPTION_SECRET` | Secret for optional dataset encryption (e.g. AES-256-GCM). | `your-32-char-or-longer-secret` | No (default in code: `corpus-encryption-secret-change-in-production`) |

Used in dataset.service and encryption utils when `encrypt` is true.

---

## Filecoin / Synapse

| Name | Description | Example | Required |
|------|-------------|---------|----------|
| `FILECOIN_NETWORK` | Synapse chain: `calibration` or `mainnet`. | `calibration` | No (default calibration) |
| `SYNAPSE_OPERATOR_PRIVATE_KEY` | Operator wallet private key (hex, with or without 0x). Used for upload and download. | (hex string) | Yes for upload/retrieve (config warns if missing) |

Used in `config/index.ts` and `synapse.service.ts`.

---

## Storage treasury (backend)

| Name | Description | Example | Required |
|------|-------------|---------|----------|
| `TREASURY_CONTRACT_ADDRESS` | Deployed StorageTreasury contract address (Calibration). | `0x85c8629306c1976C1F3635288a6fE9BBFA4453ED` | Yes if using treasury features |
| `RPC_URL` | RPC URL for Filecoin Calibration. | `https://api.calibration.node.glif.io/rpc/v1` | Yes if using treasury |
| `TREASURY_EXECUTOR_PRIVATE_KEY` | Backend executor wallet private key (hex). Must match contract’s `executor`. | (hex string) | Yes if using treasury |
| `TREASURY_EXECUTOR_ADDRESS` | Optional. If set, startup verifies it equals the address derived from `TREASURY_EXECUTOR_PRIVATE_KEY`; mismatch causes process exit. | `0x...` | No |
| `TREASURY_CHAIN_ID` | Chain id for treasury (e.g. Filecoin Calibration). | `314159` | No (default 314159) |

Used in `config/index.ts` and `helpers/treasury.ts`. USDFC token on Calibration: `0xb3042734b608a1B16e9e86B374A3f3e389B4cDf0` (used at deploy time; backend does not read it from env).

---

## Storage cost

| Name | Description | Example | Required |
|------|-------------|---------|----------|
| `STORAGE_COST_FIXED_WEI` | Fixed storage cost per upload in wei (18 decimals). Only fixed cost is used; no per-byte pricing. | `1000000000000000` | No (default 1000000000000000) |

Read in `config/index.ts` and returned by `helpers/storageCost.ts` `getStorageCost()`.

---

## Contract deployment (scripts)

Used when running Hardhat deploy script on **Filecoin Calibration** (`corpus/contracts/scripts/deployStorageTreasury.ts`), not by backend config. Set in `contracts/.env`:

| Name | Description | Example | Required |
|------|-------------|---------|----------|
| `PRIVATE_KEY` | Deployer wallet private key (hex). Must have tFIL on Calibration for gas. | (hex string) | Yes for deploy |
| `RPC_URL` | Filecoin Calibration RPC. | `https://api.calibration.node.glif.io/rpc/v1` | Yes for deploy |
| `USDFC_TOKEN_ADDRESS` | ERC20 token address on Calibration for StorageTreasury constructor. | `0xb3042734b608a1B16e9e86B374A3f3e389B4cDf0` | Yes for deploy |
| `TREASURY_EXECUTOR_ADDRESS` | Executor address for StorageTreasury constructor. Defaults to deployer if unset. | `0x...` | No (defaults to deployer) |

---

## Summary table (backend)

| Variable | Required for app | Required for treasury | Default / note |
|----------|------------------|------------------------|---------------|
| PORT / API_PORT | No | — | 3001 |
| MONGODB_URI | No | — | mongodb://localhost:27017/corpus |
| ENCRYPTION_SECRET | No | — | (in-code default) |
| FILECOIN_NETWORK | No | — | calibration |
| SYNAPSE_OPERATOR_PRIVATE_KEY | Yes (for upload/retrieve) | — | — |
| STORAGE_COST_FIXED_WEI | No | — | 1000000000000000 |
| TREASURY_CONTRACT_ADDRESS | — | Yes | — |
| RPC_URL | — | Yes | — |
| TREASURY_EXECUTOR_PRIVATE_KEY | — | Yes | — |
| TREASURY_EXECUTOR_ADDRESS | — | No (optional check) | — |
| TREASURY_CHAIN_ID | — | No | 314159 |
