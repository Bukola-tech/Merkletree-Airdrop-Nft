import { HardhatUserConfig } from "hardhat/config";
require("dotenv").config({ path: ".env" });

import "@nomicfoundation/hardhat-toolbox";

const ALCHEMY_MAINNET_API_KEY_URL = process.env.ALCHEMY_MAINNET_API_KEY_URL;
const ACCOUNT_PRIVATE_KEY = process.env.ACCOUNT_PRIVATE_KEY;

const config: HardhatUserConfig = {
  solidity: "0.8.24",
  networks: {
    hardhat: {
      forking: {
        url: ALCHEMY_MAINNET_API_KEY_URL || "",
        blockNumber: 15000000 // Use a recent block number
      },
      accounts: {
        accountsBalance: "10000000000000000000000" // 10,000 ETH in wei
      }
    }
  },
};

export default config;
