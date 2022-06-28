import { useState } from "react";
import * as ethers from "ethers";
import { GetStaticProps } from "next";
import { readFileSync } from "fs";
import { erc721 } from "../abi/IERC721";
// import { abi } from "../abi/ozERC721";
import { Network } from "../pages/index";

type TokenSelectorProps = {
  signer: ethers.providers.JsonRpcSigner;
  provider: ethers.providers.Web3Provider;
  address: string;
  abi: any;
  network: Network;
};

const TokenSelector = ({
  network,
  signer,
  address,
  provider,
  abi,
}: TokenSelectorProps) => {
  const [contractAddress, setContractAddress] = useState<string>("");
  const [tokenId, setTokenId] = useState<string>("");
  const [lookupResult, setLookupResult] = useState<object | null>(null);

  const lookupToken = async () => {
    if (contractAddress === "") {
    }
    if (contractAddress === "") {
    }

    const url = network.rpc;
    console.log(abi);
    const contract = new ethers.Contract(
      network.deployedAddress,
      abi,
      signer
    );

    const value = await contract.registerNFT(contractAddress, tokenId, "", "my_nft");

    console.log(contract.messenger());
    console.log(value);
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
