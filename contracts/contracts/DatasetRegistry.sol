// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/// @title DatasetRegistry
/// @notice Decentralized registry of dataset CIDs and version lineage (Filecoin storage references).
contract DatasetRegistry {
    struct Dataset {
        string datasetCID;
        string previousCID;
        address owner;
        uint256 timestamp;
    }

    /// datasetId => Dataset (datasetId = keccak256(datasetCID))
    mapping(bytes32 => Dataset) public datasets;

    event DatasetRegistered(
        bytes32 indexed datasetId,
        string datasetCID,
        string previousCID,
        address indexed owner,
        uint256 timestamp
    );

    /// @notice Register a new dataset (first version).
    /// @param datasetCID The CID of the dataset on Filecoin.
    function registerDataset(string memory datasetCID) external {
        require(bytes(datasetCID).length > 0, "DatasetRegistry: empty CID");
        bytes32 id = keccak256(abi.encodePacked(datasetCID));
        require(datasets[id].timestamp == 0, "DatasetRegistry: CID already registered");
        datasets[id] = Dataset({
            datasetCID: datasetCID,
            previousCID: "",
            owner: msg.sender,
            timestamp: block.timestamp
        });
        emit DatasetRegistered(id, datasetCID, "", msg.sender, block.timestamp);
    }

    /// @notice Register a new version of a dataset that references a previous CID.
    /// @param datasetCID The CID of the new dataset version.
    /// @param previousCID The CID of the previous version (must already be registered).
    function registerDatasetVersion(string memory datasetCID, string memory previousCID) external {
        require(bytes(datasetCID).length > 0, "DatasetRegistry: empty CID");
        require(bytes(previousCID).length > 0, "DatasetRegistry: empty previous CID");
        bytes32 id = keccak256(abi.encodePacked(datasetCID));
        require(datasets[id].timestamp == 0, "DatasetRegistry: CID already registered");
        bytes32 prevId = keccak256(abi.encodePacked(previousCID));
        require(datasets[prevId].timestamp != 0, "DatasetRegistry: previous CID not found");
        datasets[id] = Dataset({
            datasetCID: datasetCID,
            previousCID: previousCID,
            owner: msg.sender,
            timestamp: block.timestamp
        });
        emit DatasetRegistered(id, datasetCID, previousCID, msg.sender, block.timestamp);
    }

    /// @notice Get dataset metadata by CID.
    /// @param datasetCID The dataset CID to look up.
    function getDataset(string memory datasetCID)
        external
        view
        returns (string memory, string memory, address, uint256)
    {
        bytes32 id = keccak256(abi.encodePacked(datasetCID));
        Dataset storage d = datasets[id];
        require(d.timestamp != 0, "DatasetRegistry: not found");
        return (d.datasetCID, d.previousCID, d.owner, d.timestamp);
    }
}
