import type { ModelRun } from "./types.js";
import type { CorpusConfig } from "./types.js";
import { createClient } from "./client.js";

export type RegisterModelRunInput = {
  datasetCID: string;
  modelArtifactCID: string;
  trainingConfigHash?: string;
  trainingCodeHash?: string;
};

export function modelApi(config: CorpusConfig) {
  const client = createClient(config.apiKey, config.baseUrl);

  return {
    async registerModelRun(input: RegisterModelRunInput): Promise<ModelRun> {
      return client.post<ModelRun>("/api/models", input);
    },
    async listModelRuns(): Promise<ModelRun[]> {
      return client.get<ModelRun[]>("/api/models");
    },
  };
}
