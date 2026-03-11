# StorageTreasury Contract

This document describes the StorageTreasury smart contract as implemented in `corpus/contracts/contracts/StorageTreasury.sol`.

## Deployed address (Filecoin Calibration)

| Contract | Address |
|----------|---------|
| StorageTreasury | `0x85c8629306c1976C1F3635288a6fE9BBFA4453ED` |
| USDFC (token) | `0xb3042734b608a1B16e9e86B374A3f3e389B4cDf0` |

Network: Filecoin Calibration. Chain ID: 314159. RPC: `https://api.calibration.node.glif.io/rpc/v1`.

## Contract Purpose

StorageTreasury holds user-deposited ERC20 tokens (e.g. USDFC) for storage payments. Users deposit and withdraw directly; only the designated **executor** (a single address, typically the backend wallet) can call `recordAndDeduct` to deduct a user's balance and record a dataset in one atomic transaction. The contract is **Ownable** (OpenZeppelin) and **Pausable**; when paused, deposit, withdraw, and recordAndDeduct are disabled.

## State Variables

| Variable       | Type    | Description |
|----------------|---------|-------------|
| `token`       | `IERC20` (immutable) | ERC20 token used for balances (e.g. USDFC). |
| `executor`    | `address` | Single address allowed to call `recordAndDeduct`. Set in constructor, updatable by owner via `setExecutor`. |
| `balances`    | `mapping(address => uint256)` | Per-user balance (ERC20 units). |
| `datasets`    | `mapping(bytes32 => DatasetRecord)` | Dataset records keyed by `keccak256(abi.encodePacked(cid))`. |

## Structs

### DatasetRecord

| Field         | Type      | Description |
|---------------|-----------|-------------|
| `owner`      | `address` | User who paid for the dataset. |
| `cid`        | `string`  | Content identifier (e.g. piece CID). |
| `storageCost`| `uint256` | Cost deducted (wei). |
| `timestamp`  | `uint256` | Block timestamp when recorded. |
| `size`       | `uint256` | Dataset size in bytes. |
| `datasetHash`| `bytes32` | Hash of dataset content (e.g. keccak256 of file bytes). |
| `uploadBlock`| `uint256` | Block number when recorded. |

## Mappings

- **balances:** `address => uint256` — user balance in token units.
- **datasets:** `bytes32 => DatasetRecord` — dataset id (from `keccak256(abi.encodePacked(cid))`) to record.

## Events

| Event | Parameters | Description |
|-------|------------|-------------|
| `Deposit` | `address indexed user`, `uint256 amount` | User deposited tokens. |
| `Withdraw` | `address indexed user`, `uint256 amount` | User withdrew tokens. |
| `StorageDeducted` | `address indexed user`, `uint256 cost` | Cost deducted for a dataset (emitted with recordAndDeduct). |
| `DatasetStored` | `address indexed user`, `bytes32 indexed datasetId`, `bytes32 indexed cidHash`, `string cid`, `uint256 cost` | Dataset recorded; `cidHash = keccak256(bytes(cid))` for indexing. |
| `ExecutorUpdated` | `address indexed oldExecutor`, `address indexed newExecutor` | Executor address changed by owner. |

## Modifiers

- **onlyExecutor:** Reverts with `OnlyExecutor()` if `msg.sender != executor`.
- **whenNotPaused:** From OpenZeppelin Pausable; reverts if contract is paused.
- **nonReentrant:** From OpenZeppelin ReentrancyGuard; prevents reentrancy.

---

## Functions

### deposit

```solidity
function deposit(uint256 amount) external nonReentrant whenNotPaused
```

- **Access:** Any address.
- **Behavior:** Requires `amount > 0`; pulls `amount` of `token` from `msg.sender` to the contract and adds `amount` to `balances[msg.sender]`. Emits `Deposit(msg.sender, amount)`.
- **Note:** User must approve the contract for the token before calling.

### withdraw

```solidity
function withdraw(uint256 amount) external nonReentrant whenNotPaused
```

- **Access:** Any address.
- **Behavior:** Requires `amount > 0`; requires `balances[msg.sender] >= amount` (reverts `InsufficientBalance()` otherwise); requires `token.balanceOf(address(this)) >= amount` (reverts with "INSUFFICIENT_CONTRACT_BALANCE" otherwise). Subtracts `amount` from `balances[msg.sender]`, transfers `amount` of token to `msg.sender`, emits `Withdraw(msg.sender, amount)`.

### recordAndDeduct

```solidity
function recordAndDeduct(
    address user,
    string calldata cid,
    uint256 cost,
    uint256 size,
    bytes32 datasetHash
) external onlyExecutor whenNotPaused
```

- **Access:** Executor only.
- **Behavior:**
  1. Validates: `bytes(cid).length > 0 && bytes(cid).length <= 96` ("INVALID_CID"); `cost != 0` (ZeroAmount); `balances[user] >= cost` (InsufficientBalance).
  2. Computes `datasetId = keccak256(abi.encodePacked(cid))`; reverts with `DatasetExists()` if `datasets[datasetId].owner != address(0)`.
  3. Subtracts `cost` from `balances[user]`.
  4. Writes `datasets[datasetId]` with `owner`, `cid`, `storageCost`, `timestamp` (block.timestamp), `size`, `datasetHash`, `uploadBlock` (block.number).
  5. Emits `StorageDeducted(user, cost)` and `DatasetStored(user, datasetId, cidHash, cid, cost)` where `cidHash = keccak256(bytes(cid))`.

### datasetExists

```solidity
function datasetExists(string calldata cid) external view returns (bool)
```

- **Access:** Anyone (view).
- **Behavior:** Returns `datasets[keccak256(abi.encodePacked(cid))].owner != address(0)`.

### pause

```solidity
function pause() external onlyOwner
```

- **Access:** Owner only.
- **Behavior:** Sets the contract to paused state (OpenZeppelin `_pause()`). Deposit, withdraw, and recordAndDeduct then revert when called.

### unpause

```solidity
function unpause() external onlyOwner
```

- **Access:** Owner only.
- **Behavior:** Clears the paused state (`_unpause()`).

### setExecutor

```solidity
function setExecutor(address newExecutor) external onlyOwner
```

- **Access:** Owner only.
- **Behavior:** Requires `newExecutor != address(0)` ("INVALID_EXECUTOR"); sets `executor = newExecutor` and emits `ExecutorUpdated(oldExecutor, newExecutor)`.

---

## Access Control Summary

| Function          | Caller   |
|-------------------|----------|
| deposit           | Any      |
| withdraw          | Any      |
| recordAndDeduct   | Executor |
| datasetExists     | Any (view) |
| pause / unpause   | Owner    |
| setExecutor       | Owner    |

## Treasury Accounting Logic

- Balances are internal accounting in the contract; the contract holds the actual token balance. Deposit increases both the contract’s token balance and the user’s internal balance; withdraw decreases both. `recordAndDeduct` only decreases the user’s internal balance (tokens stay in the contract). Withdraw enforces that the contract holds at least the requested amount to avoid accounting/executor bugs draining more than available.

## Dataset Recording Logic

- Dataset id is derived onchain only: `datasetId = keccak256(abi.encodePacked(cid))`. No overwrite: if a record for that id already exists (`owner != address(0)`), the call reverts. Each record stores owner, cid, cost, size, datasetHash, and upload block for provenance.

## Example Event Logs

**Deposit**

- `Deposit(user=0x123..., amount=1000000000000000000)`

**Withdraw**

- `Withdraw(user=0x123..., amount=500000000000000000)`

**DatasetStored** (after recordAndDeduct)

- `DatasetStored(user=0x123..., datasetId=0xabc..., cidHash=0xdef..., cid="baga6ea4...", cost=1000000000000000)`

**ExecutorUpdated**

- `ExecutorUpdated(oldExecutor=0xold..., newExecutor=0xnew...)`
