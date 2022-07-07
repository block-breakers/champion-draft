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
import RoundsView from "../components/roundsView";

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
  server: {
    baseURL: string;
    redis: Object;
  };
};

export const getStaticProps: GetStaticProps = async () => {
  let config = JSON.parse(
    readFileSync("../xdapp.config.json").toString()
  ) as Config;

  let networks = config.networks;
  let serverBaseURL = config.server.baseURL;

  let abi = JSON.parse(
    readFileSync("../chains/evm/out/CoreGame.sol/CoreGame.json").toString()
  ).abi;
  console.log(abi);

  return {
    props: {
      networks: networks,
      abi: abi,
      serverBaseURL: serverBaseURL,
    },
  };
};

export type PlayerKind = "fighter" | "audience" | "unjoined";

type HomeProps = {
  networks: Record<string, Network>;
  abi: any;
  serverBaseURL: string;
};

const Home: NextPage<HomeProps> = ({ networks, abi, serverBaseURL }) => {
  const [championHash, setChampionHash] = useState<string | null>(null);

  const [playerKind, setPlayerKind] = useState<PlayerKind>("unjoined");

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

  useEffect(()=> {
    if (championHash != "")
      setPlayerKind("fighter");
  }, [championHash]);

  const router = useRouter();
  const startBattle = (opponentVaa: string, _: string) => {
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

  const draftChampion = (_: string, championHash: string) => {
    if (contract === null) {
      return;
    }
    contract.registerAudienceMember(championHash);
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
        <div>
          <div className="min-w-full mb-10">
            <RoundsView contract={contract} />
            <div className="flex flex-row items-center w-full justify-evenly">
              {playerKind === "unjoined" ? (
                <div className="flex flex-col space-y-4">
                  <button
                    className="btn btn-blue"
                    onClick={() => setPlayerKind("fighter")}
                  >
                    Start Playing
                  </button>
                  <button
                    className="btn btn-blue"
                    onClick={() => setPlayerKind("audience")}
                  >
                    Join the audience
                  </button>
                </div>
              ) : playerKind === "audience" ? (
                <></>
              ) : (
                <>
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
                    hash={championHash}
                  />
                </>
              )}
            </div>
          </div>
          <div className="text-center">
            {playerKind === "unjoined" ? (
              <></>
            ) : playerKind === "audience" ? (
              <>
                Champions:
                <ChampionViewer
                  networks={networks}
                  provider={provider}
                  abi={abi}
                  serverBaseURL={serverBaseURL}
                  hash={championHash}
                  buttonText="Draft"
                  buttonOnClick={draftChampion}
                />
              </>
            ) : (
              <>
                <div className="text-xl">
                  Available Champions to battle:
                </div>
                <ChampionViewer
                  networks={networks}
                  provider={provider}
                  abi={abi}
                  serverBaseURL={serverBaseURL}
                  hash={championHash}
                  buttonText="Battle!"
                  buttonOnClick={startBattle}
                />
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Home;
