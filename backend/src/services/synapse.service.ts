import * as Pay from "@filoz/synapse-core/pay";
import { Synapse, calibration, mainnet } from "@filoz/synapse-sdk";
import { WarmStorageService } from "@filoz/synapse-sdk/warm-storage";
import { createClient, erc20Abi, http } from "viem";
import { readContract, waitForTransactionReceipt } from "viem/actions";
import { privateKeyToAccount } from "viem/accounts";
import { config } from "../config/index.js";

/** Minimum available funds in Pay contract required by storage providers (0.06 USDFC). */
const MIN_LOCKUP_WEI = 60_000_000_000_000_000n;

const MIN_UPLOAD_SIZE = 127;

let synapseInstance: Synapse | null = null;
let warmStorageInstance: WarmStorageService | null = null;

function getAccountAndChain(): { account: ReturnType<typeof privateKeyToAccount>; chain: typeof calibration } {
  const key = config.synapseOperatorPrivateKey;
  if (!key) {
    throw new Error(
      "SYNAPSE_OPERATOR_PRIVATE_KEY is not set. Set it in .env to use Synapse storage on Filecoin."
    );
  }
  const hexKey = key.startsWith("0x") ? key : `0x${key}`;
  const account = privateKeyToAccount(hexKey as `0x${string}`);
  const chain = config.filecoinNetwork === "mainnet" ? mainnet : calibration;
  return { account, chain };
}

/**
 * Get or create the Synapse instance (operator account, Filecoin Calibration by default).
 * Users approve this operator client-side via depositWithPermitAndApproveOperator; the backend does not store user private keys.
 */
function getSynapse(): Synapse {
  if (synapseInstance) return synapseInstance;
  const { account, chain } = getAccountAndChain();
  synapseInstance = Synapse.create({
    account,
    chain,
  });
  return synapseInstance;
}

/**
 * Get WarmStorageService with the same account/chain as Synapse.
 * Used to run prepare (deposit + service approval) before uploads so operator has lockup/allowance.
 */
function getWarmStorage(): WarmStorageService {
  if (warmStorageInstance) return warmStorageInstance;
  const { account, chain } = getAccountAndChain();
  warmStorageInstance = WarmStorageService.create({
    chain,
    transport: http(),
    account,
  });
  return warmStorageInstance;
}

/**
 * Upload a dataset buffer to Filecoin via Synapse SDK.
 * Returns the piece CID (used as the dataset identifier in MongoDB and for retrieval).
 */
export async function uploadDataset(
  buffer: Buffer,
  _walletAddress: string
): Promise<string> {
  if (buffer.length < MIN_UPLOAD_SIZE) {
    throw new Error(
      `Dataset size must be at least ${MIN_UPLOAD_SIZE} bytes (Synapse SDK requirement). Got ${buffer.length}.`
    );
  }
  const synapse = getSynapse();
  const data = new Uint8Array(buffer);

  // Prepare operator: ERC20 approve (if deposit needed) + deposit + service approval so upload succeeds
  const warmStorage = getWarmStorage();
  const prep = await warmStorage.prepareStorageUpload({ dataSize: BigInt(data.byteLength) });
  const hasDeposit = prep.actions.some((a) => a.type === "deposit");
  if (hasDeposit) {
    const { account, chain } = getAccountAndChain();
    const payContract = chain.contracts.filecoinPay.address;
    const approveAmount =
      prep.estimatedCost.perMonth * 12n > MIN_LOCKUP_WEI
        ? prep.estimatedCost.perMonth * 12n
        : MIN_LOCKUP_WEI;
    const approveHash = await synapse.payments.approve({
      spender: payContract,
      amount: approveAmount,
    });
    console.log(`[synapse.service] USDFC approve submitted (tx: ${approveHash}), waiting for confirmation...`);
    const client = createClient({ chain, transport: http(), account });
    await waitForTransactionReceipt(client, { hash: approveHash });
    console.log(`[synapse.service] USDFC approved for Pay contract (confirmed)`);
  }
  if (prep.actions.length > 0) {
    const { account, chain } = getAccountAndChain();
    const client = createClient({ chain, transport: http(), account });
    for (const action of prep.actions) {
      const hash = await action.execute();
      console.log(`[synapse.service] Prepare action "${action.description}" (tx: ${hash}), waiting for confirmation...`);
      await waitForTransactionReceipt(client, { hash });
    }
    console.log(`[synapse.service] All prepare actions confirmed`);
  }

  // Ensure Pay contract has at least MIN_LOCKUP_WEI available (provider requirement)
  const { account, chain } = getAccountAndChain();
  const client = createClient({ chain, transport: http(), account });
  const accountInfo = await Pay.accounts(client, { address: account.address });
  if (accountInfo.availableFunds < MIN_LOCKUP_WEI) {
    const topUp = MIN_LOCKUP_WEI - accountInfo.availableFunds;
    const currentAllowance = await readContract(client, {
      address: chain.contracts.usdfc.address,
      abi: erc20Abi,
      functionName: "allowance",
      args: [account.address, chain.contracts.filecoinPay.address],
    });
    if (currentAllowance < topUp) {
      const approveHash = await synapse.payments.approve({
        spender: chain.contracts.filecoinPay.address,
        amount: topUp,
      });
      await waitForTransactionReceipt(client, { hash: approveHash });
    }
    const depositHash = await Pay.deposit(client, { amount: topUp });
    console.log(`[synapse.service] Top-up deposit for lockup (tx: ${depositHash}), waiting...`);
    await waitForTransactionReceipt(client, { hash: depositHash });
    console.log(`[synapse.service] Top-up deposit confirmed`);
  }

  try {
    const result = await synapse.storage.upload(data);
    const pieceCid =
      typeof result.pieceCid === "string" ? result.pieceCid : String(result.pieceCid);
    return pieceCid;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[synapse.service] Upload failed:", message);
    if (message.includes("InsufficientLockupFunds")) {
      throw new Error(
        "Synapse operator wallet needs lockup funds on the storage provider (Filecoin Calibration). " +
          "Add lockup funds for the operator address via the provider or Synapse docs. " +
          `Details: ${message}`
      );
    }
    if (message.includes("Insufficient allowance")) {
      throw new Error(
        "Synapse operator needs USDFC approved for the Filecoin Pay contract. " +
          "The prepare step should approve automatically; if this persists, approve USDFC for the operator wallet. " +
          `Details: ${message}`
      );
    }
    throw new Error(`Synapse upload failed: ${message}`);
  }
}

/**
 * Retrieve a dataset by piece CID from Filecoin via Synapse SDK.
 */
export async function retrieveDataset(pieceCid: string): Promise<Buffer> {
  const synapse = getSynapse();
  try {
    const bytes = await synapse.storage.download({ pieceCid });
    return Buffer.from(bytes);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[synapse.service] Download failed for", pieceCid, message);
    throw new Error(`Synapse download failed: ${message}`);
  }
}
