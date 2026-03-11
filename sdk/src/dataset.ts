import type { Dataset } from "./types.js";
import type { CorpusConfig } from "./types.js";
import { createClient } from "./client.js";

export function datasetApi(config: CorpusConfig) {
  const client = createClient(config.apiKey, config.baseUrl);

  return {
    async uploadDataset(file: File | Blob): Promise<{ cid: string }> {
      return client.upload("/api/datasets/upload", file);
    },
    async listDatasets(): Promise<Dataset[]> {
      return client.get<Dataset[]>("/api/datasets");
    },
    async retrieveDataset(cid: string): Promise<Dataset> {
      return client.get<Dataset>(`/api/datasets/${encodeURIComponent(cid)}`);
    },
  };
}
