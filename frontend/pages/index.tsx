import type { GetStaticProps, NextPage } from "next";
import Head from "next/head";
import { readFileSync } from "fs";
import * as ethers from "ethers";
import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import TokenSelector from "../components/tokenSelector";
import ChampionViewer from "../components/championViewer";
import BattleStarter from "../components/battleStarter";
import { useWeb3Provider } from "../util/hooks";
import ChampionRegistrar from "../components/championRegistrar";

const MetamaskButton = dynamic(() => import("../components/metamaskButton"), {
  ssr: false,
});

export type Network = {
  type: string;
  wormholeChainId: number;
  rpc: string;
  privateKey: string;
  bridgeAddress: string;
  deployedAddress: string;
  emittedVAAs: string;
};
type Config = {
  networks: Record<string, Network>;
  wormhole: {
    restAddress: string;
  };
};

export const getStaticProps: GetStaticProps = async () => {
  let config = JSON.parse(
    readFileSync("../xdapp.config.json").toString()
  ) as Config;

  let networks = config.networks;

  let abi = JSON.parse(
    readFileSync("../chains/evm/out/CoreGame.sol/CoreGame.json").toString()
  ).abi;
  console.log(abi);

  return {
    props: {
      networks: networks,
      abi,
    },
  };
};

type HomeProps = {
  networks: Record<string, Network>;
  abi: any;
};

const Home: NextPage<HomeProps> = ({ networks, abi }) => {
  // TODO: this should be the network the user is currently connecting from. We need to do some extra work to be able to detect this based on the wallet they connect
  const network = networks.evm0;

  const [provider, setProvider] =
    useState<ethers.providers.Web3Provider | null>(null);
  const [contract, setContract] = useState<ethers.Contract | null>(null);
  const [championHash, setChampionHash] = useState<string | null>(null);

  // set up provider and contract connection
  useEffect(() => {
    if (process.browser === false) {
      return;
    }
    const provider = new ethers.providers.Web3Provider(
      (window as any).ethereum
    );
    setProvider(provider);
    setContract(new ethers.Contract(network.deployedAddress, abi, provider));
  }, []);

  const startBattle = (opponentVaa: string) => {
    // TODO: this function should start a battle with the current user's champion against the provided vaa `opponentVaa`
    console.error("Battling not yet implemented");
  };

  return (
    <div
      className="flex flex-col items-center justify-center w-screen p-0 m-0 align-center"
      style={{ minHeight: "100vw" }}
    >
      <Head>
        <title>Champion Draft</title>
        <meta name="description" content="Champion Draft" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <div>Mine: </div>
      <ChampionRegistrar provider={provider} abi={abi} network={network} championHash={championHash} setChampionHash={(h) => setChampionHash(h)} />
      <div>Theirs: </div>
      <ChampionViewer
        networks={networks}
        provider={provider}
        abi={abi}
        startBattle={startBattle}
      />
    </div>
  );
};

export default Home;
