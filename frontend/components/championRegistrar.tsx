import * as ethers from "ethers";
import { useEffect, useState } from "react";
import { Network } from "../pages";
import * as storage from "../util/storage";
import { BattleInfo } from "./battleStarter";
import MetamaskButton from "./metamaskButton";
import TokenSelector from "./tokenSelector";

type ChampionRegistrarProps = {
  provider: ethers.providers.Web3Provider;
  network: Network;
  abi: any;
  championHash: string | null;
  setChampionHash: (_: string | null) => void;
};

const ChampionRegistrar = ({
  provider,
  network,
  abi,
  championHash,
  setChampionHash,
}: ChampionRegistrarProps) => {
  const [walletConnected, setWalletConnected] = useState<boolean>(false);

  // set up listener to read championHash from storage and writeback when component unloads
  useEffect(() => {
    const result = storage.fetchChampionHash();
    if (result !== null) {
      setChampionHash(result);
    }

    return () => {
      if (championHash !== null) {
        storage.saveChampionHash(championHash);
      }
    };
  }, [championHash]);

  return (
    <div className="w-5/6">
      {championHash !== null ? (
        "<Champion Card />"
      ) : walletConnected ? (
        <TokenSelector
          provider={provider}
          abi={abi}
          network={network}
          setChampionHash={setChampionHash}
        />
      ) : (
        <MetamaskButton
          setConnected={(b) => setWalletConnected(b)}
          provider={provider}
        />
      )}
    </div>
  );
};

export default ChampionRegistrar;
