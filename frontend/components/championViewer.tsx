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
  hash: null | string;
  // the callback to fire when the user chooses to start a battle
  startBattle: (opponentVaa: string) => void;
};

type ChampionData = {
  champion: object;
  vaa: string;
};

const ChampionViewer = ({ networks, provider, abi, hash, startBattle }: ChampionViewerProps) => {
  const [champions, setChampions] = useState<ChampionData[]>([]);
  const [selectedNetwork, setSelectedNetwork] = useState<Network>(
    networks[Object.keys(networks)[0]]
  );

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

  // const emitterAddr = useMemo(
  //   () => contract.getMessengerAddr(),
  //   [contract]
  // )

  // parses an emitted findVAA event into a `VaaInfo`
  const parseEvent = async (event: ethers.Event): Promise<null | ChampionData> => {
  console.log("parse", event);
    const championHash = ethers.BigNumber.from(event.args.championHash);
    const champion = await contract.champions(championHash);

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
    let filter = contract.filters.championRegistered();
    const events = await contract.queryFilter(filter);
    console.log("events", events);

    const championInfos = await Promise.all(events.map(parseEvent));
    console.log("info", championInfos);
    // console.log(ethers.BigNumber.from(championInfos[0].champion[0]).toString());

    setChampions(championInfos);
    setIsLoading(false);
  };

  // when this component loads, we need to fetch the initial (pre-existing) set of champions
  useEffect(() => {
    fetchChampions();
  }, [contract]);

  useEffect(() => {
    const listener: ethers.providers.Listener = async (_author, event ) => {
      let newChampionInfo = await parseEvent( event);
      setChampions((old) => [...old, newChampionInfo]);
    };

    // attach listener to new events, but remember to unregister it when this component is unmounted
    contract.on("championRegistered", listener);
    return () => {
      contract.off("championRegistered", listener);
    };
  }, [contract]);

  return (
    <div className="flex flex-col items-center p-4 m-8">
      <ChainSelector
        selectedNetwork={selectedNetwork}
        setNetwork={(n) => setSelectedNetwork(n)}
        networks={networks}
      />
      <div className="mt-9 grid grid-cols-3 gap-4">
        {isLoading ? "Loading..." : champions.map((championData) => (
            (hash === null || championData.champion[0].toHexString() !== hash) &&
              <ChampionCard champion={championData.champion} vaa={championData.vaa} isSelf={false} startBattle={startBattle} />
        ))}
      </div>
    </div>
  );
};

export default ChampionViewer;
