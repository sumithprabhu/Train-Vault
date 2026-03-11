import type { CorpusConfig, Dataset, ModelRun } from "./types.js";
import { datasetApi } from "./dataset.js";
import { modelApi } from "./model.js";

export type { CorpusConfig, Dataset, ModelRun };

export default class Corpus {
  private config: CorpusConfig;
  private dataset = () => datasetApi(this.config);
  private model = () => modelApi(this.config);

  constructor(config: CorpusConfig = {}) {
    this.config = config;
  }

  async uploadDataset(file: File | Blob): Promise<string> {
    const { cid } = await this.dataset().uploadDataset(file);
    return cid;
  }

  async retrieveDataset(cid: string): Promise<Dataset> {
    return this.dataset().retrieveDataset(cid);
  }

  async listDatasets(): Promise<Dataset[]> {
    return this.dataset().listDatasets();
  }

  async registerModelRun(input: {
    datasetCID: string;
    modelArtifactCID: string;
    trainingConfigHash?: string;
    trainingCodeHash?: string;
  }) {
    return this.model().registerModelRun(input);
  }

  async listModelRuns(): Promise<ModelRun[]> {
    return this.model().listModelRuns();
  }
}
