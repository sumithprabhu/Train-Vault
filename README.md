# Corpus

Dataset and model provenance on Filecoin. Upload datasets, track lineage, and anchor reproducibility hashes on-chain.

## Structure

- **frontend** — Next.js UI (upload, datasets list, provenance viewer)
- **backend** — API + Filecoin integration (upload/retrieve, provenance service)
- **sdk** — Thin client wrapping API calls
- **contracts** — Minimal registries (dataset CID, model artifact CID, provenance hash)
- **scripts** — Deploy contracts, seed data, simulate training (demo/hackathon)
- **docs** — Architecture notes and diagrams

This structure keeps:

- **Separation of concerns** — UI, API, storage, and chain logic are clearly separated.
- **Minimal surface area** — SDK is a thin wrapper; contracts store only CIDs and hashes.
- **Clear boundaries** — Key logic lives in backend services; frontend stays presentational.

## Quick start

```bash
cp .env.example .env
# Edit .env with your API key and Filecoin/IPFS config

npm install
cd frontend && npm install
cd ../backend && npm install
cd ../sdk && npm install

npm run dev
```

- Frontend: http://localhost:3000
- Backend API: http://localhost:3001

## SDK usage

```ts
import Corpus from "corpus-sdk";

const corpus = new Corpus({ apiKey: process.env.CORPUS_API_KEY });
const cid = await corpus.uploadDataset(file);
const dataset = await corpus.retrieveDataset(cid);
```

## Contracts (Hardhat)

```bash
cd contracts
npm install
npm run compile
npm test
npm run deploy        # default network
npm run deploy:local  # with `npx hardhat node` running
```

See `contracts/README.md` and `scripts/deployContracts.ts` for deployment.
