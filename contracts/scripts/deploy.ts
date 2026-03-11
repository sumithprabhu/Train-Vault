import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying with account:", deployer.address);

  const DatasetRegistry = await ethers.getContractFactory("DatasetRegistry");
  const datasetRegistry = await DatasetRegistry.deploy();
  await datasetRegistry.waitForDeployment();
  const datasetRegistryAddress = await datasetRegistry.getAddress();
  console.log("DatasetRegistry deployed to:", datasetRegistryAddress);

  const ModelRegistry = await ethers.getContractFactory("ModelRegistry");
  const modelRegistry = await ModelRegistry.deploy();
  await modelRegistry.waitForDeployment();
  const modelRegistryAddress = await modelRegistry.getAddress();
  console.log("ModelRegistry deployed to:", modelRegistryAddress);

  console.log("\nSet in backend .env:");
  console.log("DATASET_REGISTRY_ADDRESS=", datasetRegistryAddress);
  console.log("MODEL_REGISTRY_ADDRESS=", modelRegistryAddress);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
