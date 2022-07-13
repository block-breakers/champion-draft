import { useEffect, useState } from "react";
import * as ethers from "ethers";
import { Network } from "../pages/index";
import { randomWord } from "../util/random";
import * as interfaceChecker from "../util/ercInterfaces";
import { Connection, registerNft, useChainConnection } from "../util/chainConnection";

type TokenSelectorProps = {
  setChampionHash: (_: string | null) => void;
  connection: Connection
};

const TokenSelector = ({ setChampionHash, connection}: TokenSelectorProps) => {
  const [contractAddress, setContractAddress] = useState<string>("");
  const [tokenId, setTokenId] = useState<string>("");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [modalIsOpen, setModalIsOpen] = useState<boolean>(false);

  const lookupToken = async () => {
    if (contractAddress === "") {
    }

    if (connection === null) {
      setErrorMessage("No connection to chain");
      return;
    }

    const championHash = await registerNft(connection, contractAddress, tokenId);
    if (typeof championHash === "object") {
      setErrorMessage(championHash.error);
      return;
    }

    setChampionHash(championHash);
  };

  return (
    <div className="flex flex-col items-center space-y-2">
      <div>
        Contract Address:
        <input
          type="text"
          className="w-full border"
          value={contractAddress}
          onChange={(e) => setContractAddress(e.currentTarget.value)}
        />
      </div>
      <div className="">
        Token ID:
        <input
          type="text"
          className="w-full border"
          value={tokenId}
          onChange={(e) => setTokenId(e.currentTarget.value)}
        />
      </div>
      {errorMessage !== "" && (
        <div className="font-red-500">{errorMessage}</div>
      )}
      <button className="btn btn-blue" onClick={lookupToken}>
        Fight
      </button>
    </div>
  );
};

export default TokenSelector;
