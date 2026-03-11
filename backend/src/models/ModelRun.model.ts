import mongoose, { Schema, Document, Model } from "mongoose";

export interface IModelRun extends Document {
  datasetCID: string;
  modelArtifactCID: string;
  trainingConfigHash: string;
  trainingCodeHash: string;
  provenanceHash: string;
  createdAt: Date;
}

const ModelRunSchema = new Schema<IModelRun>(
  {
    datasetCID: {
      type: String,
      required: true,
    },
    modelArtifactCID: {
      type: String,
      required: true,
    },
    trainingConfigHash: {
      type: String,
      required: true,
    },
    trainingCodeHash: {
      type: String,
      required: true,
    },
    provenanceHash: {
      type: String,
      required: true,
      unique: true,
    },
    createdAt: {
      type: Date,
      default: () => new Date(),
    },
  },
  { timestamps: true }
);

ModelRunSchema.index({ datasetCID: 1 });

export const ModelRun: Model<IModelRun> =
  mongoose.models.ModelRun ?? mongoose.model<IModelRun>("ModelRun", ModelRunSchema);
