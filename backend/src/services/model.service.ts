import { ModelRun } from "../models/ModelRun.model.js";
import { generateProvenanceHash } from "../utils/hash.js";

export type RegisterModelRunInput = {
  datasetCID: string;
  modelArtifactCID: string;
  trainingConfigHash: string;
  trainingCodeHash: string;
};

/**
 * Compute provenance hash and store model run metadata.
 */
export async function registerModelRun(input: RegisterModelRunInput) {
  const { datasetCID, modelArtifactCID, trainingConfigHash, trainingCodeHash } = input;
  const provenanceHash = generateProvenanceHash(datasetCID, trainingConfigHash, trainingCodeHash);
  const run = await ModelRun.create({
    datasetCID,
    modelArtifactCID,
    trainingConfigHash,
    trainingCodeHash,
    provenanceHash,
    createdAt: new Date(),
  });
  return {
    id: run._id.toString(),
    datasetCID: run.datasetCID,
    modelArtifactCID: run.modelArtifactCID,
    trainingConfigHash: run.trainingConfigHash,
    trainingCodeHash: run.trainingCodeHash,
    provenanceHash: run.provenanceHash,
    createdAt: run.createdAt,
  };
}

/**
 * Get model run by provenance hash.
 */
export async function getModelRunByProvenanceHash(provenanceHash: string) {
  const run = await ModelRun.findOne({ provenanceHash }).lean();
  if (!run) throw new Error("Model run not found");
  return {
    id: run._id.toString(),
    datasetCID: run.datasetCID,
    modelArtifactCID: run.modelArtifactCID,
    trainingConfigHash: run.trainingConfigHash,
    trainingCodeHash: run.trainingCodeHash,
    provenanceHash: run.provenanceHash,
    createdAt: run.createdAt,
  };
}

/**
 * List model runs (e.g. by dataset CID or all).
 */
export async function listModelRuns(options?: { datasetCID?: string }) {
  const filter = options?.datasetCID ? { datasetCID: options.datasetCID } : {};
  const list = await ModelRun.find(filter).sort({ createdAt: -1 }).lean();
  return list.map((r) => ({
    id: r._id.toString(),
    datasetCID: r.datasetCID,
    modelArtifactCID: r.modelArtifactCID,
    provenanceHash: r.provenanceHash,
    createdAt: r.createdAt,
  }));
}
