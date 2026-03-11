# Database Models

The backend uses MongoDB with Mongoose. Connection is configured via `MONGODB_URI` in `corpus/backend/src/config/index.ts`. All models live in `corpus/backend/src/models/`.

---

## Dataset

**File:** `models/Dataset.model.ts`  
**Collection:** Documents describing uploaded datasets. File content is not stored here; it is on Filecoin via Synapse. CID is the piece CID returned by Synapse. Each document is one **version**; named datasets (e.g. `railway`, `bus`) have multiple documents with the same `name` and one of them has `isDefault: true`.

### Fields

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `cid` | String | Yes | — | Piece CID (unique). Used as dataset identifier. |
| `ownerApiKey` | String | Yes | — | API key of the owner (indexed). |
| `ownerWalletAddress` | String | Yes | — | Owner wallet address (indexed). |
| `name` | String | No | null | Optional human-readable name; unique per user for the first version. Multiple versions share the same name. |
| `isDefault` | Boolean | No | false | For named datasets: exactly one version per (owner, name) has isDefault true. Used when downloading by name without a version. |
| `previousCID` | String | No | null | CID of previous version for versioned datasets. |
| `encrypted` | Boolean | No | false | Whether the stored file is encrypted. |
| `encryptionType` | String | No | "aes-256-gcm" | Encryption algorithm label. |
| `compressed` | Boolean | No | false | Whether the stored content is gzip-compressed. |
| `compressionFormat` | String | No | "" | Compression format (e.g. "gzip") when compressed. |
| `storageCost` | String | No | "0" | Cost in wei as string (for precision). |
| `uploadTimestamp` | Date | No | new Date() | When the upload was recorded. |
| `createdAt` | Date | No | new Date() | Document creation (timestamps: true adds updatedAt). |

### Indexes

- `cid`: unique.
- `ownerApiKey`: index.
- `ownerWalletAddress`: index.
- Compound: `{ ownerApiKey: 1, createdAt: -1 }`.
- Compound: `{ ownerApiKey: 1, name: 1, createdAt: -1 }` (for listing versions by name).

### Relationships

- No formal references to other collections. Ownership is by `ownerApiKey` and `ownerWalletAddress`. `previousCID` references another Dataset’s `cid` logically. Named datasets are grouped by `(ownerApiKey, name)`; one version per name has `isDefault: true`.

### Usage

- Created by `dataset.service` after successful upload (with optional `name`; if name is provided it must be new for that user). New named dataset gets `isDefault: true`. Adding a version by name (POST /dataset/by-name/:name/version) creates a new document with the same `name` and sets `isDefault: true` for it and `false` for others with that name. Read for get-by-CID, get-by-name (default or specific version), metadata, list-by-owner, list-versions-by-name, and version chain (previousCID).

---

## PendingTreasuryRecord

**File:** `models/PendingTreasuryRecord.model.ts`  
**Collection:** Queue of failed onchain recordAndDeduct calls. When an upload succeeds but the treasury transaction fails, a record is enqueued here and processed by the retry worker (startup + every 60s).

### Fields

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `userWalletAddress` | String | Yes | — | Wallet address of the user (indexed). |
| `cid` | String | Yes | — | Piece CID (unique). |
| `costWei` | String | Yes | — | Cost in wei as string. |
| `sizeBytes` | Number | Yes | — | Dataset size in bytes. |
| `datasetHash` | String | Yes | — | Hex string (e.g. 0x...) keccak256 of file content. |
| `lastError` | String | No | — | Last error message from recordAndDeduct failure. |
| `createdAt` | Date | — | — | Set by timestamps: true. |
| `updatedAt` | Date | — | — | Set by timestamps: true. |

### Indexes

- `userWalletAddress`: index.
- `cid`: unique.
- `createdAt`: index (for ordered processing).

### Relationships

- No foreign keys. `cid` corresponds to a Dataset’s `cid` and to the contract’s dataset id (keccak256(abi.encodePacked(cid))).

### Usage

- Written by `treasuryRetry.service.enqueuePendingRecord` when recordAndDeduct fails after upload. Read and updated/deleted by `processPendingRecords` (delete on success or when datasetExists; update lastError on failure).

---

## User

**File:** `models/User.model.ts`  
**Collection:** Users identified by wallet address; each has an API key for authenticating requests.

### Fields

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `walletAddress` | String | Yes | — | EVM wallet address (unique, trimmed). |
| `apiKey` | String | Yes | — | API key (unique), format `tv_` + 48 hex chars. |
| `createdAt` | Date | No | new Date() | Creation time. |

### Indexes

- `walletAddress`: unique.
- `apiKey`: unique.
- `apiKey`: index for lookup.

### Usage

- Created/read by user controller (POST /user/create). Looked up by `apiKey` in apiKeyAuth middleware and attached to `req.user`.

---

## ModelRun

**File:** `models/ModelRun.model.ts`  
**Collection:** Model run provenance: links dataset CID, model artifact CID, and training hashes; stores a unique provenance hash.

### Fields

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `datasetCID` | String | Yes | — | Dataset piece CID used for training. |
| `modelArtifactCID` | String | Yes | — | Model artifact CID. |
| `trainingConfigHash` | String | Yes | — | Hash of training config. |
| `trainingCodeHash` | String | Yes | — | Hash of training code. |
| `provenanceHash` | String | Yes | — | Unique hash derived from dataset + config + code (see utils/hash). |
| `createdAt` | Date | No | new Date() | Creation time. |

### Indexes

- `provenanceHash`: unique; index.
- `datasetCID`: index.

### Usage

- Created by model.service on POST /model/register. Read for GET /model and GET /model/:provenanceHash.
