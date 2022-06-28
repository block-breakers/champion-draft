import type { GetStaticProps, NextPage } from "next";
import Head from "next/head";
import { readFileSync } from "fs";
import * as ethers from "ethers";
import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import TokenSelector from "../components/tokenSelector";

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

  return {
    props: {
      network: networks["evm0"],
      abi,
    },
  };
};

type HomeProps = {
  network: Network;
  abi: any;
};

const Home: NextPage<HomeProps> = ({ network, abi }) => {
  console.log(network);

  const [provider, setProvider] =
    useState<ethers.providers.Web3Provider | null>(null);
  useEffect(() => {
    if (process.browser === false) {
      return;
    }
    setProvider(new ethers.providers.Web3Provider((window as any).ethereum));
  }, []);

  const [userAddress, setUserAddress] = useState<string | null>(null);

  // const [contractReturnValue, setContractReturnValue] = useState<any | null>(null);
  // const getOnChainValue = async () => {
  //   if (userAddress === "") {
  //     return;
  //   }

  //   const url = network.rpc;
  //   const provider = new ethers.providers.JsonRpcProvider(url);
  //   const contract = new ethers.Contract(
  //     network.deployedAddress,
  //     abi,
  //     provider
  //   );

  //   const value = await contract.getValue();
  //   setContractReturnValue(value);
  // };

  // useEffect(() => {
  //   getOnChainValue();
  // }, [userAddress]);

  return (
    <div className="flex flex-row items-center justify-center w-screen h-screen p-0 m-0 align-center">
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
          address={userAddress}
          signer={provider.getSigner()}
          provider={provider}
          abi={abi}
          network={network}
        />
      )}
    </div>
  );
};

export default Home;
