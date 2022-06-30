import { ethers } from "ethers";

export const getUsersNetworkIdentifier = async (
  provider: ethers.providers.Web3Provider
) => {
  if (await provider.send("net_version", []) === "1656598392803") {
    return "evm0";
  } else if (await provider.send("net_version", []) === "1656598393535") {
    return "evm1";
  } else {
    throw new Error("Unrecognized chain");
  }
};
