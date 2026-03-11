# Corpus Contracts (Hardhat)

Minimal on-chain metadata for dataset and model provenance. Data and artifacts live on **Filecoin**; contracts store only **references and hashes**.

## Layout

- **contracts/** — `DatasetRegistry.sol`, `ModelRegistry.sol`
- **scripts/** — `deploy.ts` (deploy both registries)
- **test/** — `Registry.test.ts` (dataset + model run tests)

## DatasetRegistry

- **Struct**: `datasetCID`, `previousCID`, `owner`, `timestamp`
- **Functions**:
  - `registerDataset(string datasetCID)` — first version
  - `registerDatasetVersion(string datasetCID, string previousCID)` — new version (previous must exist)
  - `getDataset(string datasetCID)` — returns (datasetCID, previousCID, owner, timestamp)
- **Events**: `DatasetRegistered(datasetId, datasetCID, previousCID, owner, timestamp)`

## ModelRegistry

- **Struct**: `datasetCID`, `modelArtifactCID`, `trainingConfigHash`, `trainingCodeHash`, `provenanceHash`, `timestamp`
- **Functions**:
  - `registerModelRun(datasetCID, modelArtifactCID, trainingConfigHash, trainingCodeHash, provenanceHash)`
  - `getModelRun(bytes32 provenanceHash)` — returns full run metadata
- **Events**: `ModelRunRegistered(provenanceHash, datasetCID, modelArtifactCID, ...)`

## Build & test

```bash
npm install
npm run compile
npm test
```

## Deploy

Local (Hardhat node):

```bash
npx hardhat node
# In another terminal:
npm run deploy:local
```

To a live network, add the network in `hardhat.config.ts` and run:

```bash
npm run deploy -- --network <network-name>
```

Then set `DATASET_REGISTRY_ADDRESS` and `MODEL_REGISTRY_ADDRESS` in backend `.env`.
