import { useState } from "react";
import * as ethers from "ethers";
import { Network } from "../pages/index";

type TokenSelectorProps = {
  provider: ethers.providers.Web3Provider;
  network: Network;
  abi: any;
};

const TokenSelector = ({
  network,
  provider,
  abi
}: TokenSelectorProps) => {
  const [contractAddress, setContractAddress] = useState<string>("");
  const [tokenId, setTokenId] = useState<string>("");
  const [lookupResult, setLookupResult] = useState<object | null>(null);

  const lookupToken = async () => {
    if (contractAddress === "") {
    }
    if (contractAddress === "") {
    }

    const contract = new ethers.Contract(
      network.deployedAddress,
      abi,
      provider.getSigner()
    );

    const value = await contract.registerNFT(contractAddress, tokenId, "", "my_nft");

    console.log("registerNFT", value);
    setLookupResult(value);
  };

  return (
    <div className="flex flex-col items-center w-1/2">
      NFT Address:
      <input
        type="text"
        className="w-full border"
        value={contractAddress}
        onChange={(e) => setContractAddress(e.currentTarget.value)}
      />
      Token ID:
      <input
        type="text"
        className="w-full border"
        value={tokenId}
        onChange={(e) => setTokenId(e.currentTarget.value)}
      />
      <button className="btn btn-blue" onClick={lookupToken}>
        Register
      </button>
      {lookupResult !== null && `Result:\n${JSON.stringify(lookupResult)}`}
    </div>
  );
};

export default TokenSelector;
