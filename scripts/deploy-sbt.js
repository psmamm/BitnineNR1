/**
 * Deployment Script for TradeCircle SBT Contract
 * 
 * Usage:
 *   npx hardhat run scripts/deploy-sbt.js --network polygon
 *   npx hardhat run scripts/deploy-sbt.js --network polygonMumbai
 */

const hre = require("hardhat");

async function main() {
  console.log("🚀 Deploying TradeCircle SBT Contract...");

  // Get the issuer address from environment or use deployer
  const [deployer] = await hre.ethers.getSigners();
  const issuerAddress = process.env.ISSUER_ADDRESS || deployer.address;

  console.log("Deploying with account:", deployer.address);
  console.log("Issuer address:", issuerAddress);
  console.log("Account balance:", (await hre.ethers.provider.getBalance(deployer.address)).toString());

  // Deploy the contract
  const TradeCircleSBT = await hre.ethers.getContractFactory("TradeCircleSBT");
  const sbt = await TradeCircleSBT.deploy(issuerAddress);

  await sbt.waitForDeployment();

  const address = await sbt.getAddress();
  console.log("✅ TradeCircle SBT deployed to:", address);
  console.log("📋 Update your .env and wrangler.json with:");
  console.log(`   SBT_CONTRACT_ADDRESS=${address}`);

  // Verify on PolygonScan (optional)
  if (process.env.POLYGONSCAN_API_KEY) {
    console.log("\n⏳ Waiting for block confirmations...");
    await sbt.deploymentTransaction().wait(5);

    console.log("🔍 Verifying contract on PolygonScan...");
    try {
      await hre.run("verify:verify", {
        address: address,
        constructorArguments: [issuerAddress],
      });
      console.log("✅ Contract verified on PolygonScan");
    } catch (error) {
      console.log("⚠️ Verification failed:", error.message);
    }
  } else {
    console.log("\n⚠️ POLYGONSCAN_API_KEY not set, skipping verification");
    console.log("   To verify manually, run:");
    console.log(`   npx hardhat verify --network polygon ${address} ${issuerAddress}`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
