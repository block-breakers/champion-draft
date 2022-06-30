import * as ethers from "ethers";
import { useEffect, useState } from "react";
import { Network } from "../pages";
import * as storage from "../util/storage";
import ChampionCard from "./championCard";
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
  const [championData, setChampionData] = useState<any | null>(null);

  const getChampionData = async () => {
    const contract = new ethers.Contract(
      network.deployedAddress,
      abi,
      provider.getSigner()
    );
    const champion = await contract.champions(championHash);
    setChampionData(champion);
  };

  useEffect(() => {
    if (championHash === null) {
      return;
    }

    getChampionData();
  }, [championHash]);

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
        <ChampionCard
          champion={{ attack: 10, defense: 10, speed: 10, crit_rate: 10 }}
          isSelf={true}
          startBattle={() => {}}
        />
      ) : (
        <div className="flex flex-col items-center justify-between w-64 px-4 py-8 rounded shadow-inner h-96 bg-neutral-300">
          <p className="text-center">You haven't registered a champion 😔</p>
          <p className="text-center">Want to change that?</p>
          <div className="flex items-center h-1/2">
            {walletConnected ? (
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
        </div>
      )}
    </div>
  );
};

export default ChampionRegistrar;
