import type { GetStaticProps, NextPage } from "next";
import Head from "next/head";
import { readFileSync } from "fs";
import * as ethers from "ethers";
import { useEffect, useState } from "react";
import ChampionViewer from "../components/championViewer";
import ChampionRegistrar from "../components/championRegistrar";
import { getUsersNetworkIdentifier } from "../util/chainConnection";
import ChampionUpgrade from "../components/championUpgrade";
import { useRouter } from "next/router";

export type Network = {
  type: string;
  wormholeChainId: number;
  rpc: string;
  privateKey: string;
  bridgeAddress: string;
  deployedAddress: string;
  emittedVAAs: string;
};
export type Config = {
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
  const [championHash, setChampionHash] = useState<string | null>(null);

  // set up provider
  const [provider, setProvider] =
    useState<ethers.providers.Web3Provider | null>(null);
  useEffect(() => {
    if (process.browser === false) {
      return;
    }
    const provider = new ethers.providers.Web3Provider(
      (window as any).ethereum
    );
    setProvider(provider);
  }, []);

  // figure out which chain the user is connecting from
  const [usersNetwork, setUsersNetwork] = useState<Network | null>(null);
  const getUsersNetwork = async (
    provider: ethers.providers.Web3Provider | null
  ) => {
    if (provider === null) {
      return;
    }
    let identifier = await getUsersNetworkIdentifier(provider);
    console.log("Connecting from ", identifier);
    setUsersNetwork(networks[identifier]);
  };
  useEffect(() => {
    getUsersNetwork(provider);
  }, [provider]);

  // set up contract
  const [contract, setContract] = useState<ethers.Contract | null>(null);
  useEffect(() => {
    if (provider === null || usersNetwork === null) {
      return;
    }
    setContract(
      new ethers.Contract(usersNetwork.deployedAddress, abi, provider)
    );
  }, [provider, usersNetwork]);

  const router = useRouter();
  const startBattle = (opponentVaa: string) => {
    if (championHash === null) {
        return;
    }

    router.push({
      pathname: "/battle",
      query: {
        hash: championHash,
        vaa: opponentVaa.toString(),
      },
    });
  };


  return (
    <div
      className="flex flex-col items-center justify-center min-h-screen p-0 m-0 min-w-screen align-center"
      // style={{ minHeight: "100vw" }}
    >
      <Head>
        <title>Champion Draft</title>
        <meta name="description" content="Champion Draft" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      {provider === null || usersNetwork === null ? (
        "Loading..."
      ) : (
        <>
          <div className="min-w-full mb-10">
            <div className="text-center">Mine: </div>
            <div className="flex items-center w-full justify-evenly">
              <ChampionRegistrar
                provider={provider}
                abi={abi}
                network={usersNetwork}
                championHash={championHash}
                setChampionHash={(h) => setChampionHash(h)}
              />
              <ChampionUpgrade 
                provider={provider}
                abi={abi}
                network={usersNetwork} 
                hash={championHash} />
            </div>
          </div>
          <div className="text-center">
            Theirs: 
            <ChampionViewer
              networks={networks}
              provider={provider}
              abi={abi}
              hash={championHash}
              startBattle={startBattle}
            />
          </div>
        </>
      )}
    </div>
  );
};

export default Home;
