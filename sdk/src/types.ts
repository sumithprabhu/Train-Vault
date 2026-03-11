export type Dataset = {
  id: string;
  cid: string;
  previousCID: string | null;
  encrypted: boolean;
  createdAt: string;
};

export type ModelRun = {
  id: string;
  datasetCID: string;
  modelArtifactCID: string;
  trainingConfigHash: string | null;
  trainingCodeHash: string | null;
  provenanceHash: string;
  createdAt: string;
};

export type CorpusConfig = {
  apiKey?: string;
  baseUrl?: string;
};
