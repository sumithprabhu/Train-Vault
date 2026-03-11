# API Endpoints

All endpoints are served by the Express backend in `corpus/backend/src`. Base path is `/` (e.g. `http://localhost:3001/dataset/upload`). Routes under `/dataset`, `/model`, and `/treasury` use `apiKeyAuth`: request must include header `x-api-key` with a valid API key (from POST /user/create). Missing or invalid key returns 401.

---

## Health

### GET /health

- **Description:** Liveness check. No auth.
- **Response:** `200` — `{ "success": true, "ok": true }`

**Example response:**

```json
{ "success": true, "ok": true }
```

---

## User

### POST /user/create

- **Method:** POST  
- **Path:** `/user/create`  
- **Description:** Create or get user by wallet address. Returns API key to use as `x-api-key` for other endpoints. No auth required.  
- **Request body:** JSON with `walletAddress` (string, required).  
- **Response:**  
  - `201`: New user — `{ "success": true, "walletAddress": "...", "apiKey": "..." }`  
  - `200`: Existing user — `{ "success": true, "walletAddress": "...", "apiKey": "...", "message": "Existing user" }`  
  - `400`: Missing/invalid walletAddress — `{ "success": false, "error": "walletAddress required" }`  
  - `500`: Server error — `{ "success": false, "error": "..." }`

**Example request:**

```json
{ "walletAddress": "0x1234567890123456789012345678901234567890" }
```

**Example response (201):**

```json
{
  "success": true,
  "walletAddress": "0x1234...",
  "apiKey": "tv_..."
}
```

---

## Dataset

All dataset routes require `x-api-key`.

Datasets can be **unnamed** (identified only by CID) or **named** (e.g. `railway`, `bus`). Names are unique per user: two users can each have a dataset named `railway`; one user cannot have two datasets both named `railway`. For named datasets, one version is the **default** (by default the latest upload); download by name returns the default unless `?version=<cid>` is specified.

### POST /dataset/upload

- **Method:** POST  
- **Path:** `/dataset/upload`  
- **Description:** Upload a new dataset. For a **new named dataset**, include `name` (unique per user). For an unnamed or version-by-CID upload, omit `name` and optionally pass `previousCID`. Multipart form: `file` (required). Optional: `name`, `encrypt`, `previousCID`. If treasury is configured, balance must be >= fixed storage cost or returns 402.  
- **Authentication:** Required (`x-api-key`).  
- **Request:** Multipart form: `file` (required). Optional: `name` (string, unique per user for new dataset), `encrypt`, `previousCID`.  
- **Response:**  
  - `201`: `{ "success": true, "pieceCID": "...", "cid": "...", "name": "..." (if provided), "storageCost": "..." }`  
  - `400`: No file — `{ "success": false, "error": "No file provided" }`  
  - `402`: Insufficient balance — `{ "success": false, "error": "INSUFFICIENT_STORAGE_BALANCE" }`  
  - `409`: Name already exists — `{ "success": false, "error": "Dataset name \"...\" already exists. Use POST /dataset/by-name/:name/version to add a new version." }`  
  - `500`: Other — `{ "success": false, "error": "..." }`

**Example response (201) with name:**

```json
{
  "success": true,
  "pieceCID": "baga6ea4...",
  "cid": "baga6ea4...",
  "name": "railway",
  "storageCost": "1000000000000000"
}
```

### POST /dataset/version

- **Method:** POST  
- **Path:** `/dataset/version`  
- **Description:** Create a new dataset version linked to `previousCID` (by CID). For **named** datasets, use `POST /dataset/by-name/:name/version` instead. Multipart: `file`, body `previousCID` (required).  
- **Authentication:** Required (`x-api-key`).  
- **Request:** Multipart: `file`; body/field `previousCID` (required). Optional: `encrypt`.  
- **Response:**  
  - `201`: Same shape as upload — `{ "success": true, "pieceCID", "cid", "storageCost }`  
  - `400`: No file or missing previousCID — `{ "success": false, "error": "..." }`  
  - `402`: INSUFFICIENT_STORAGE_BALANCE (when treasury configured)  
  - `500`: e.g. "Previous CID not found" or other

### GET /dataset

- **Method:** GET  
- **Path:** `/dataset`  
- **Description:** List all dataset versions for the authenticated user. Each item includes `cid`, optional `name`, `isDefault` (for named datasets), `ownerWalletAddress`, `previousCID`, `encrypted`, `encryptionType`, `compressed`, `compressionFormat`, `storageCost`, `uploadTimestamp`, `createdAt`.  
- **Authentication:** Required (`x-api-key`).  
- **Response:**  
  - `200`: `{ "success": true, "datasets": [ { "cid", "name", "isDefault", "ownerWalletAddress", "previousCID", "encrypted", "encryptionType", "compressed", "compressionFormat", "storageCost", "uploadTimestamp", "createdAt" }, ... ] }`  
  - `500`: `{ "success": false, "error": "..." }`

**Example response (200):**

```json
{
  "success": true,
  "datasets": [
    {
      "cid": "baga6ea4...",
      "name": "railway",
      "isDefault": true,
      "ownerWalletAddress": "0x...",
      "previousCID": "baga6ea3...",
      "encrypted": false,
      "encryptionType": "aes-256-gcm",
      "compressed": false,
      "compressionFormat": "",
      "storageCost": "1000000000000000",
      "uploadTimestamp": "2025-03-09T...",
      "createdAt": "2025-03-09T..."
    }
  ]
}
```

### GET /dataset/by-name/:name

- **Method:** GET  
- **Path:** `/dataset/by-name/:name`  
- **Description:** Download the **default** version of a named dataset. Use query `?version=<cid>` to download a specific version (must be a version of this named dataset). Returns file as `application/octet-stream`.  
- **Authentication:** Required (`x-api-key`).  
- **Response:**  
  - `200`: Body = file buffer; `Content-Type: application/octet-stream`.  
  - `404`: Dataset not found or version not found — `{ "success": false, "error": "Dataset not found" }` or `"Dataset version not found"`  
  - `500`: `{ "success": false, "error": "..." }`

### GET /dataset/by-name/:name/versions

- **Method:** GET  
- **Path:** `/dataset/by-name/:name/versions`  
- **Description:** List all versions of a named dataset for the authenticated user (newest first). Each version includes `cid`, `name`, `isDefault`, `previousCID`, `encrypted`, `encryptionType`, `compressed`, `compressionFormat`, `storageCost`, `uploadTimestamp`, `createdAt`.  
- **Authentication:** Required (`x-api-key`).  
- **Response:**  
  - `200`: `{ "success": true, "name": "...", "versions": [ ... ] }`  
  - `500`: `{ "success": false, "error": "..." }`

### POST /dataset/by-name/:name/version

- **Method:** POST  
- **Path:** `/dataset/by-name/:name/version`  
- **Description:** Add a new version to an existing named dataset. The new version becomes the **default**. Multipart: `file` (required). Optional: `encrypt`.  
- **Authentication:** Required (`x-api-key`).  
- **Response:**  
  - `201`: `{ "success": true, "pieceCID", "cid", "name", "storageCost" }`  
  - `400`: No file — `{ "success": false, "error": "No file provided" }`  
  - `402`: INSUFFICIENT_STORAGE_BALANCE  
  - `404`: Dataset not found — `{ "success": false, "error": "Dataset not found" }`  
  - `500`: `{ "success": false, "error": "..." }`

### PUT /dataset/by-name/:name/default

- **Method:** PUT  
- **Path:** `/dataset/by-name/:name/default`  
- **Description:** Set which version is the default for this named dataset. When downloading by name without `?version=`, the default is returned. Body: `{ "cid": "<pieceCID>" }`.  
- **Authentication:** Required (`x-api-key`).  
- **Request body:** JSON with `cid` (string, required) — must be a version of this named dataset.  
- **Response:**  
  - `200`: `{ "success": true, "name": "...", "defaultCid": "..." }`  
  - `400`: Missing cid — `{ "success": false, "error": "cid required in body" }`  
  - `404`: Dataset version not found — `{ "success": false, "error": "Dataset version not found" }`  
  - `500`: `{ "success": false, "error": "..." }`

### GET /dataset/:cid

- **Method:** GET  
- **Path:** `/dataset/:cid`  
- **Description:** Retrieve dataset by piece CID (any version, named or unnamed). If query `metadata=1` or `metadata=true`, returns metadata only (JSON). Otherwise returns file as `application/octet-stream`.  
- **Authentication:** Required (`x-api-key`).  
- **Response:**  
  - `200` (file): Body = file buffer; `Content-Type: application/octet-stream`.  
  - `200` (metadata): `{ "success": true, "cid", "name", "isDefault", "ownerWalletAddress", "previousCID", "encrypted", "encryptionType", "compressed", "compressionFormat", "storageCost", "uploadTimestamp", "createdAt" }`  
  - `404`: Dataset not found or unauthorized — `{ "success": false, "error": "Dataset not found" }` or `"Unauthorized"`  
  - `500`: `{ "success": false, "error": "..." }`

### GET /dataset/:cid/raw

- **Method:** GET  
- **Path:** `/dataset/:cid/raw`  
- **Description:** Retrieve raw bytes from Filecoin for this CID (no decompress, no decrypt). Owner-only. Useful to verify what is stored on-chain.  
- **Authentication:** Required (`x-api-key`).  
- **Response:**  
  - `200`: Body = raw stored buffer; `Content-Type: application/octet-stream`.  
  - `404`: Dataset not found or unauthorized  
  - `500`: `{ "success": false, "error": "..." }`

### DELETE /dataset/:cid

- **Method:** DELETE  
- **Path:** `/dataset/:cid`  
- **Description:** Delete one dataset version by CID. Owner-only. Removes only the MongoDB record; data on Filecoin remains immutable.  
- **Authentication:** Required (`x-api-key`).  
- **Response:**  
  - `200`: `{ "success": true, "cid": "...", "deleted": true }`  
  - `404`: Dataset not found or unauthorized — `{ "success": false, "error": "Dataset not found" }`  
  - `500`: `{ "success": false, "error": "..." }`

### DELETE /dataset/by-name/:name

- **Method:** DELETE  
- **Path:** `/dataset/by-name/:name`  
- **Description:** Delete all versions of a named dataset. Owner-only. Removes only MongoDB records; data on Filecoin remains.  
- **Authentication:** Required (`x-api-key`).  
- **Response:**  
  - `200`: `{ "success": true, "name": "...", "deletedCount": <number> }`  
  - `500`: `{ "success": false, "error": "..." }`

---

## Treasury

All treasury routes require `x-api-key`. User is identified by the wallet address associated with the API key.

### GET /treasury/balance

- **Method:** GET  
- **Path:** `/treasury/balance`  
- **Description:** Return treasury balance for the authenticated user's wallet.  
- **Authentication:** Required (`x-api-key`).  
- **Response:**  
  - `200`: `{ "success": true, "balance": "<bigint as string>" }`  
  - `503`: Treasury not configured — `{ "success": false, "error": "Treasury not configured" }`  
  - `500`: `{ "success": false, "error": "..." }`

**Example response (200):**

```json
{ "success": true, "balance": "1000000000000000000" }
```

### GET /treasury/datasets

- **Method:** GET  
- **Path:** `/treasury/datasets`  
- **Description:** List datasets owned by the authenticated user (same as GET /dataset) with an extra field `treasuryRecorded`: when treasury is configured, each dataset is checked onchain via `datasetExists(cid)`; when not configured, `treasuryRecorded` is false. Items include `name`, `isDefault` when present.  
- **Authentication:** Required (`x-api-key`).  
- **Response:**  
  - `200`: `{ "success": true, "datasets": [ { "cid", "name", "isDefault", "ownerWalletAddress", "previousCID", "encrypted", "encryptionType", "storageCost", "uploadTimestamp", "createdAt", "treasuryRecorded": true|false }, ... ] }`  
  - `500`: `{ "success": false, "error": "..." }`

---

## Model

All model routes require `x-api-key`.

### POST /model/register

- **Method:** POST  
- **Path:** `/model/register`  
- **Description:** Register a model run with dataset and artifact CIDs and hashes.  
- **Authentication:** Required (`x-api-key`).  
- **Request body:** JSON — `datasetCID`, `modelArtifactCID`, `trainingConfigHash`, `trainingCodeHash` (all required).  
- **Response:**  
  - `201`: `{ "success": true, "id", "datasetCID", "modelArtifactCID", "trainingConfigHash", "trainingCodeHash", "provenanceHash", "createdAt" }`  
  - `400`: Missing field — `{ "success": false, "error": "datasetCID, modelArtifactCID, trainingConfigHash, trainingCodeHash required" }`  
  - `500`: `{ "success": false, "error": "..." }`

### GET /model

- **Method:** GET  
- **Path:** `/model`  
- **Description:** List model runs. Optional query `datasetCID` to filter.  
- **Authentication:** Required (`x-api-key`).  
- **Response:**  
  - `200`: `{ "success": true, "modelRuns": [ { "id", "datasetCID", "modelArtifactCID", "provenanceHash", "createdAt" }, ... ] }`  
  - `500`: `{ "success": false, "error": "..." }`

### GET /model/:provenanceHash

- **Method:** GET  
- **Path:** `/model/:provenanceHash`  
- **Description:** Get a single model run by provenance hash. (Same controller as GET /model; presence of `provenanceHash` param returns one run.)  
- **Authentication:** Required (`x-api-key`).  
- **Response:**  
  - `200`: `{ "success": true, "id", "datasetCID", "modelArtifactCID", "trainingConfigHash", "trainingCodeHash", "provenanceHash", "createdAt" }`  
  - `404`: `{ "success": false, "error": "Model run not found" }`  
  - `500`: `{ "success": false, "error": "..." }`

---

## Authentication (401)

For routes protected by `apiKeyAuth`:

- Missing header: `{ "success": false, "error": "Missing x-api-key header" }`  
- Invalid key: `{ "success": false, "error": "Invalid API key" }`
