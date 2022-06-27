import type { GetStaticProps, NextPage } from "next";
import Head from "next/head";
import { readFileSync } from "fs";
import ethers from "ethers";
import { useEffect, useState } from "react";

type Config = {
  networks: {
    type: string;
    wormholeChainId: number;
    rpc: string;
    privateKey: string;
    bridgeAddress: string;
    deployedAddress: string;
    emittedVAAs: string;
  }[];
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
      networks,
      abi,
    },
  };
};

type HomeProps = {
  networks: Config["networks"];
  abi: any;
};

const Home: NextPage<HomeProps> = ({ networks, abi }) => {
  const [contractReturnValue, setContractReturnValue] = useState(null);

  const getOnChainValue = async () => {
    const url = "http://127.0.0.1:8545";
    const provider = new ethers.providers.JsonRpcProvider(url);
    const contract = new ethers.Contract(
      networks[0].deployedAddress,
      abi,
      provider
    );

    const value = await contract.getValue();
    setContractReturnValue(value);
  };

  useEffect(() => {
    getOnChainValue();
  });

  return (
    <div>
      <Head>
        <title>Champion Draft</title>
        <meta name="description" content="Champion Draft" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <p>{JSON.stringify(networks)}</p>
    </div>
  );
};

export default Home;
