import { useEffect, useState } from "react";
import * as ethers from "ethers";
import { Network } from "../pages/index";
import { randomWord } from "../util/random";

type TokenSelectorProps = {
  provider: ethers.providers.Web3Provider;
  network: Network;
  abi: any;
  setChampionHash: (_: string | null) => void;
};

const TokenSelector = ({
  network,
  provider,
  abi,
  setChampionHash,
}: TokenSelectorProps) => {
  const [contractAddress, setContractAddress] = useState<string>("");
  const [tokenId, setTokenId] = useState<string>("");
  const [championName, setChampionName] = useState<string>(randomWord());

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

    console.log("initiating tx");
    const tx = await contract.registerNFT(contractAddress, tokenId);
    console.log("tx", tx);
    const receipt = await tx.wait();
    console.log("receipt", receipt);

    const championHash = await contract.getChampionHash(
      contractAddress,
      tokenId
    );
    console.log("Champion hash", championHash);
    setChampionHash(championHash);
  };

  return (
    <div className="flex flex-col items-center p-4 border">
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
    </div>
  );
};

export default TokenSelector;
