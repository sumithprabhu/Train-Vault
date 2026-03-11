import { expect } from "chai";
import { ethers } from "hardhat";

describe("Registry", function () {
  describe("DatasetRegistry", function () {
    it("registerDataset and getDataset", async function () {
      const DatasetRegistry = await ethers.getContractFactory("DatasetRegistry");
      const registry = await DatasetRegistry.deploy();
      await registry.waitForDeployment();

      const cid = "QmFoo123";
      await registry.registerDataset(cid);
      const [storedCid, prevCid, owner, ts] = await registry.getDataset(cid);
      expect(storedCid).to.equal(cid);
      expect(prevCid).to.equal("");
      expect(owner).to.equal((await ethers.getSigners())[0].address);
      expect(ts).to.be.gt(0);
    });

    it("registerDatasetVersion links to previous", async function () {
      const DatasetRegistry = await ethers.getContractFactory("DatasetRegistry");
      const registry = await DatasetRegistry.deploy();
      await registry.waitForDeployment();

      await registry.registerDataset("QmVersion1");
      await registry.registerDatasetVersion("QmVersion2", "QmVersion1");
      const [cid2, prev2] = await registry.getDataset("QmVersion2");
      expect(cid2).to.equal("QmVersion2");
      expect(prev2).to.equal("QmVersion1");
    });

    it("reverts if previous CID not found", async function () {
      const DatasetRegistry = await ethers.getContractFactory("DatasetRegistry");
      const registry = await DatasetRegistry.deploy();
      await registry.waitForDeployment();
      await expect(
        registry.registerDatasetVersion("QmNew", "QmNonexistent")
      ).to.be.revertedWith("DatasetRegistry: previous CID not found");
    });
  });

  describe("ModelRegistry", function () {
    it("registerModelRun and getModelRun", async function () {
      const ModelRegistry = await ethers.getContractFactory("ModelRegistry");
      const registry = await ModelRegistry.deploy();
      await registry.waitForDeployment();

      const datasetCID = "QmDataset";
      const modelCID = "QmModel";
      const configHash = ethers.keccak256(ethers.toUtf8Bytes("config"));
      const codeHash = ethers.keccak256(ethers.toUtf8Bytes("code"));
      const provenanceHash = ethers.keccak256(
        ethers.concat([
          ethers.toUtf8Bytes(datasetCID),
          ethers.toUtf8Bytes(modelCID),
          configHash,
          codeHash,
        ])
      );

      await registry.registerModelRun(
        datasetCID,
        modelCID,
        configHash,
        codeHash,
        provenanceHash
      );

      const [dCid, mCid, cHash, coHash, pHash, ts] =
        await registry.getModelRun(provenanceHash);
      expect(dCid).to.equal(datasetCID);
      expect(mCid).to.equal(modelCID);
      expect(cHash).to.equal(configHash);
      expect(coHash).to.equal(codeHash);
      expect(pHash).to.equal(provenanceHash);
      expect(ts).to.be.gt(0);
    });

    it("reverts if provenance already registered", async function () {
      const ModelRegistry = await ethers.getContractFactory("ModelRegistry");
      const registry = await ModelRegistry.deploy();
      await registry.waitForDeployment();

      const provenanceHash = ethers.keccak256(ethers.toUtf8Bytes("unique"));
      await registry.registerModelRun(
        "QmD",
        "QmM",
        ethers.ZeroHash,
        ethers.ZeroHash,
        provenanceHash
      );
      await expect(
        registry.registerModelRun(
          "QmD2",
          "QmM2",
          ethers.ZeroHash,
          ethers.ZeroHash,
          provenanceHash
        )
      ).to.be.revertedWith("ModelRegistry: provenance already registered");
    });
  });
});
