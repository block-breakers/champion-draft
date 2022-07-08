import * as ethers from "ethers";
import { useEffect, useMemo, useState } from "react";
import { Network } from "../pages";
import ChainSelector from "./chainSelector";
import ChampionCard from "./championCard";

type ChampionViewerProps = {
  // the ethers provider that allows us to call contracts on chain
  provider: ethers.providers.Web3Provider;
  // the list of networks that this cross-chain app is running on
  networks: Record<string, Network>;
  // the abi for the EVM CoreGame contract
  abi: string;
  serverBaseURL: string;
  hash: null | string;
  // the callback to fire when the user chooses to start a battle
  buttonOnClick: (opponentVaa: string, championHash: string) => void;
  buttonText: string;
};

type ChampionData = {
  champion: object;
  vaa: string;
};

const ChampionViewer = ({ networks, provider, abi, serverBaseURL, hash, buttonOnClick, buttonText}: ChampionViewerProps) => {
  const [champions, setChampions] = useState<object[]>([]);
  const [selectedNetwork, setSelectedNetwork] = useState<Network>(
    networks[Object.keys(networks)[0]]
  );
  const [selectedNetworkName, setSelectedNetworkName] = useState<string>(
    Object.keys(networks)[0]
  );
  const [lastChampionIdx, setLastChampionIdx] = useState(0);

  const [isLoading, setIsLoading] = useState<boolean>(false);

  const contract = useMemo(
    () =>
      new ethers.Contract(
        selectedNetwork.deployedAddress,
        abi,
        new ethers.providers.JsonRpcProvider(selectedNetwork.rpc)
      ),
    [selectedNetwork]
  );

  // parses an emitted findVAA event into a `VaaInfo`
  // TODO: make the 2 fetches occur in parallel
  const getChampion = async (hash: string): Promise<null | ChampionData> => {
    console.log("get champion", hash);
      const champion = await contract.champions(hash);
  
      const seq = ethers.BigNumber.from(champion.vaaSeq);
  
      const emitterAddr = String(await contract.getMessengerAddr()).substring(2).padStart(64, "0")
  
      let url = `http://localhost:7071/v1/signed_vaa/${selectedNetwork.wormholeChainId
        }/${emitterAddr}/${seq.toString()}`;
  
      // console.log(url);
      let response = await fetch(url);
      // console.log("fetched", response);
      let data = await response.json();
  
      return {
        champion: champion,
        vaa: data.vaaBytes
      };
    };

  // query all pre-existing findVAA events and load them into state
  const fetchChampions = async () => {
    setIsLoading(true);

    let url = new URL(serverBaseURL + "champions");
    url.searchParams.append("chain", selectedNetworkName);

    console.log(url.toString())

    const res = await fetch(url.toString());

    console.log("fetching server with ", selectedNetworkName, "and", lastChampionIdx, " got result ", res)

    if (res.status == 200) {
      let data = await res.json();
      console.log("data is: ", data);
      // setLastChampionIdx(lastChampionIdx => lastChampionIdx + data.length)
      const championInfos = await Promise.all(data.map(getChampion));
      console.log("info", championInfos);

      // setChampions(champions => [...champions, ...championInfos]);
      setChampions(championInfos);
    }
    setIsLoading(false);
  };

  // when this component loads, we need to fetch the initial (pre-existing) set of champions
  useEffect(() => {
    fetchChampions();
  }, [contract]);

  return (
    <div className="flex flex-col items-center p-4 m-8">
      <ChainSelector
        selectedNetworkName={selectedNetworkName}
        setNetwork={(key: string) => {
          setSelectedNetwork(networks[key]);
          setSelectedNetworkName(key);
        }}
        networks={networks}
      />
      <div className="mt-9 grid grid-cols-3 gap-4">
        {isLoading ? "Loading..." : champions.map((championData) => (
          (championData.champion.championHash != 0 && (hash === null || championData.champion[0].toHexString() !== hash)) &&
          <ChampionCard
            champion={championData.champion}
            vaa={championData.vaa}
            isSelf={false}
            buttonOnClick={buttonOnClick}
            buttonText={buttonText}
          />
        ))}
      </div>
    </div>
  );
};

export default ChampionViewer;
