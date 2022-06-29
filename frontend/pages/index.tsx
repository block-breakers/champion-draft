import type { GetStaticProps, NextPage } from "next";
import Head from "next/head";
import { readFileSync } from "fs";
import * as ethers from "ethers";
import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import TokenSelector from "../components/tokenSelector";
import ChampionViewer from "../components/championViewer";
import BattleStarter from "../components/battleStarter";

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
  console.log(abi);

  const network = networks["evm0"];

  const [provider, setProvider] =
    useState<ethers.providers.Web3Provider | null>(null);
  const [contract, setContract] = useState<ethers.Contract | null>(null);

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

  const [userAddress, setUserAddress] = useState<string | null>(null);

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

      {provider === null ? (
        "Loading..."
      ) : userAddress === null ? (
        <MetamaskButton
          provider={provider}
          setUserAddress={(a: string) => setUserAddress(a)}
        />
      ) : (
        <TokenSelector
          provider={provider}
          signer={provider.getSigner(userAddress)}
          network={network}
          abi={abi}
        />
      )}
      {provider !== null && contract !== null && (
        <>
          <ChampionViewer
            networks={networks}
            provider={provider}
            abi={abi}
          />
          <BattleStarter
            abi={abi}
            network={network}
            provider={provider}
            contract={contract}
          />
        </>
      )}
    </div>
  );
};

export default Home;
