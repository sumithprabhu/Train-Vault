// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/// @title StorageTreasury
/// @notice Holds user-deposited ERC20 for storage payments. Only executor (backend) can record and deduct in one atomic call.
contract StorageTreasury is ReentrancyGuard, Ownable, Pausable {
    using SafeERC20 for IERC20;

    IERC20 public immutable token;
    address public executor;

    mapping(address => uint256) public balances;

    struct DatasetRecord {
        address owner;
        string cid;
        uint256 storageCost;
        uint256 timestamp;
        uint256 size;
        bytes32 datasetHash;
        uint256 uploadBlock;
    }
    mapping(bytes32 => DatasetRecord) public datasets;

    event Deposit(address indexed user, uint256 amount);
    event Withdraw(address indexed user, uint256 amount);
    event StorageDeducted(address indexed user, uint256 cost);
    event DatasetStored(
        address indexed user,
        bytes32 indexed datasetId,
        bytes32 indexed cidHash,
        string cid,
        uint256 cost
    );
    event ExecutorUpdated(address indexed oldExecutor, address indexed newExecutor);

    error InsufficientBalance();
    error OnlyExecutor();
    error ZeroAddress();
    error ZeroAmount();
    error DatasetExists();

    modifier onlyExecutor() {
        if (msg.sender != executor) revert OnlyExecutor();
        _;
    }

    constructor(address _token, address _executor) Ownable(msg.sender) {
        if (_token == address(0) || _executor == address(0)) revert ZeroAddress();
        token = IERC20(_token);
        executor = _executor;
    }

    /// @notice User deposits ERC20 tokens for storage payments. User must approve this contract first.
    function deposit(uint256 amount) external nonReentrant whenNotPaused {
        require(amount > 0, "ZERO_AMOUNT");
        token.safeTransferFrom(msg.sender, address(this), amount);
        balances[msg.sender] += amount;
        emit Deposit(msg.sender, amount);
    }

    /// @notice User withdraws unused balance.
    function withdraw(uint256 amount) external nonReentrant whenNotPaused {
        require(amount > 0, "ZERO_AMOUNT");
        if (balances[msg.sender] < amount) revert InsufficientBalance();
        require(token.balanceOf(address(this)) >= amount, "INSUFFICIENT_CONTRACT_BALANCE");
        balances[msg.sender] -= amount;
        token.safeTransfer(msg.sender, amount);
        emit Withdraw(msg.sender, amount);
    }

    /// @notice Executor (backend) deducts cost and records dataset in one atomic call. Dataset id is derived from cid onchain.
    function recordAndDeduct(
        address user,
        string calldata cid,
        uint256 cost,
        uint256 size,
        bytes32 datasetHash
    ) external onlyExecutor whenNotPaused {
        require(bytes(cid).length > 0 && bytes(cid).length <= 96, "INVALID_CID");
        if (cost == 0) revert ZeroAmount();
        if (balances[user] < cost) revert InsufficientBalance();

        bytes32 datasetId = keccak256(abi.encodePacked(cid));
        if (datasets[datasetId].owner != address(0)) revert DatasetExists();

        balances[user] -= cost;

        datasets[datasetId] = DatasetRecord({
            owner: user,
            cid: cid,
            storageCost: cost,
            timestamp: block.timestamp,
            size: size,
            datasetHash: datasetHash,
            uploadBlock: block.number
        });

        bytes32 cidHash = keccak256(bytes(cid));
        emit StorageDeducted(user, cost);
        emit DatasetStored(user, datasetId, cidHash, cid, cost);
    }

    /// @notice Returns true if a dataset with the given cid is already recorded.
    function datasetExists(string calldata cid) external view returns (bool) {
        bytes32 id = keccak256(abi.encodePacked(cid));
        return datasets[id].owner != address(0);
    }

    /// @notice Owner can pause deposit, withdraw, and recordAndDeduct.
    function pause() external onlyOwner {
        _pause();
    }

    /// @notice Owner can unpause.
    function unpause() external onlyOwner {
        _unpause();
    }

    /// @notice Owner can update executor (backend wallet).
    function setExecutor(address newExecutor) external onlyOwner {
        require(newExecutor != address(0), "INVALID_EXECUTOR");
        address oldExecutor = executor;
        executor = newExecutor;
        emit ExecutorUpdated(oldExecutor, newExecutor);
    }
}
