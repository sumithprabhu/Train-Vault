import { ethers } from "hardhat";

/**
 * Deploy StorageTreasury. Requires USDFC_TOKEN_ADDRESS and executor address (defaults to deployer).
 * Usage: USDFC_TOKEN_ADDRESS=0x... npx hardhat run scripts/deployStorageTreasury.ts --network <network>
 */
async function main() {
  const [deployer] = await ethers.getSigners();
  const tokenAddress = process.env.USDFC_TOKEN_ADDRESS;
  const executorAddress = process.env.TREASURY_EXECUTOR_ADDRESS ?? deployer.address;

  if (!tokenAddress) {
    console.error("Set USDFC_TOKEN_ADDRESS (ERC20 token for storage payments)");
    process.exit(1);
  }

  console.log("Deploying StorageTreasury with:");
  console.log("  Token (USDFC):", tokenAddress);
  console.log("  Executor (backend):", executorAddress);
  console.log("  Deployer:", deployer.address);

  const StorageTreasury = await ethers.getContractFactory("StorageTreasury");
  const treasury = await StorageTreasury.deploy(tokenAddress, executorAddress);
  await treasury.waitForDeployment();
  const address = await treasury.getAddress();
  console.log("StorageTreasury deployed to:", address);
  console.log("\nSet in backend .env:");
  console.log("TREASURY_CONTRACT_ADDRESS=", address);
  console.log("USDFC_TOKEN_ADDRESS=", tokenAddress);
  console.log("RPC_URL=<your RPC>");
  console.log("TREASURY_EXECUTOR_PRIVATE_KEY=<executor wallet private key>");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
