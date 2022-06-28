import { useEffect, useState } from "react";
import * as ethers from "ethers";
import { Network } from "../pages/index";
import { randomWord } from "../util/random";

type TokenSelectorProps = {
  provider: ethers.providers.Web3Provider;
  signer: any;
  network: Network;
  abi: any;
};

const TokenSelector = ({
  network,
  provider,
  signer,
  abi,
}: TokenSelectorProps) => {
  const [contractAddress, setContractAddress] = useState<string>("");
  const [tokenId, setTokenId] = useState<string>("");
  const [championName, setChampionName] = useState<string>(randomWord());
  const [lookupResult, setLookupResult] = useState<object | null>(null);

  // useEffect(() => {
  //   setChampionName(randomWord());
  // }, []);

  const lookupToken = async () => {
    if (contractAddress === "") {
    }
    if (contractAddress === "") {
    }

    const contract = new ethers.Contract(network.deployedAddress, abi, signer);

    console.log("initiating tx");
    const tx = await contract.registerNFT(
      contractAddress,
      tokenId,
      "",
      championName
    );
    console.log("tx", tx);
    const receipt = await tx.wait();
    console.log("receipt", receipt);

    setLookupResult(receipt);
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
      Name:
      <input
        type="text"
        className="w-full border"
        value={championName}
        onChange={(e) => setChampionName(e.currentTarget.value)}
      />
      <button className="btn btn-blue" onClick={lookupToken}>
        Register
      </button>
      {lookupResult !== null && `Result:\n${JSON.stringify(lookupResult)}`}
    </div>
  );
};

export default TokenSelector;
