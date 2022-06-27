import { useState } from "react";
import * as ethers from "ethers";
import { GetStaticProps } from "next";
import { readFileSync } from "fs";
import { erc721 } from "../abi/IERC721";

type TokenSelectorProps = {
  provider: ethers.providers.Web3Provider;
};

const TokenSelector = ({ provider, abi }: TokenSelectorProps) => {
  const [contractAddress, setContractAddress] = useState<string>("");
  const [tokenId, setTokenId] = useState<string>("");
  const [lookupResult, setLookupResult] = useState<object | null>(null);

  const lookupToken = async () => {
    if (contractAddress === "") {
    }
    if (contractAddress === "") {
    }

    const contract = new ethers.Contract(
      contractAddress,
      JSON.stringify(erc721),
      provider
    );

    setLookupResult(await contract.ownerOf(tokenId));
  };

  return (
    <div className="flex flex-col items-center w-1/2">
      NFT Address:
      <input
        type="text"
        className="border w-full"
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
      {lookupResult !== null && `Result:\n{JSON.stringify(lookupResult)}`}
    </div>
  );
};

export default TokenSelector;
