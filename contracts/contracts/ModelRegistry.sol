// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/// @title ModelRegistry
/// @notice Records model training runs and provenance for reproducibility (artifacts on Filecoin).
contract ModelRegistry {
    struct ModelRun {
        string datasetCID;
        string modelArtifactCID;
        bytes32 trainingConfigHash;
        bytes32 trainingCodeHash;
        bytes32 provenanceHash;
        uint256 timestamp;
    }

    /// provenanceHash => ModelRun
    mapping(bytes32 => ModelRun) public modelRuns;

    event ModelRunRegistered(
        bytes32 indexed provenanceHash,
        string datasetCID,
        string modelArtifactCID,
        bytes32 trainingConfigHash,
        bytes32 trainingCodeHash,
        address indexed owner,
        uint256 timestamp
    );

    /// @notice Register a model training run and its provenance.
    /// @param datasetCID Dataset CID used for training.
    /// @param modelArtifactCID Model artifact CID (stored on Filecoin).
    /// @param trainingConfigHash Hash of training configuration.
    /// @param trainingCodeHash Hash of training code.
    /// @param provenanceHash Reproducibility hash (computed off-chain from dataset + config + code + artifact).
    function registerModelRun(
        string memory datasetCID,
        string memory modelArtifactCID,
        bytes32 trainingConfigHash,
        bytes32 trainingCodeHash,
        bytes32 provenanceHash
    ) external {
        require(provenanceHash != bytes32(0), "ModelRegistry: zero provenance hash");
        require(modelRuns[provenanceHash].timestamp == 0, "ModelRegistry: provenance already registered");
        require(bytes(datasetCID).length > 0, "ModelRegistry: empty dataset CID");
        require(bytes(modelArtifactCID).length > 0, "ModelRegistry: empty model artifact CID");

        modelRuns[provenanceHash] = ModelRun({
            datasetCID: datasetCID,
            modelArtifactCID: modelArtifactCID,
            trainingConfigHash: trainingConfigHash,
            trainingCodeHash: trainingCodeHash,
            provenanceHash: provenanceHash,
            timestamp: block.timestamp
        });
        emit ModelRunRegistered(
            provenanceHash,
            datasetCID,
            modelArtifactCID,
            trainingConfigHash,
            trainingCodeHash,
            msg.sender,
            block.timestamp
        );
    }

    /// @notice Get model run by provenance hash.
    /// @param provenanceHash The provenance hash of the run.
    function getModelRun(bytes32 provenanceHash)
        external
        view
        returns (
            string memory datasetCID,
            string memory modelArtifactCID,
            bytes32 trainingConfigHash,
            bytes32 trainingCodeHash,
            bytes32 provHash,
            uint256 timestamp
        )
    {
        ModelRun storage r = modelRuns[provenanceHash];
        require(r.timestamp != 0, "ModelRegistry: not found");
        return (
            r.datasetCID,
            r.modelArtifactCID,
            r.trainingConfigHash,
            r.trainingCodeHash,
            r.provenanceHash,
            r.timestamp
        );
    }
}
