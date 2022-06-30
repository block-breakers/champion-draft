import * as ethers from "ethers";
import { useState } from "react";
import {Network} from "../pages";
import { BattleInfo } from "./battleStarter";
import MetamaskButton from "./metamaskButton";
import TokenSelector from "./tokenSelector";

type ChampionRegistrarProps = {
  provider: ethers.providers.Web3Provider;
  network: Network;
  abi: any;
};

const ChampionRegistrar = ({
  provider,
  network,
  abi,
}: ChampionRegistrarProps) => {
  const [userAddress, setUserAddress] = useState("");

  return (
    <div className="p-4 m-4 border">
      {userAddress === "" ? (
        <MetamaskButton
          setUserAddress={(a) => setUserAddress(a)}
          provider={provider}
        />
      ) : (
        <TokenSelector
          provider={provider}
          abi={abi}
          network={network}
        />
      )}
    </div>
  );
};

export default ChampionRegistrar;
