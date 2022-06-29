import * as ethers from "ethers";
import { useEffect, useState } from "react";
import {Network} from "../pages";

type BattleStarterProps = {
  provider: ethers.providers.Web3Provider;
  contract: ethers.Contract;
  network: Network;
  abi: any;
};

const BattleStarter = ({
  provider,
  contract,
  network,
  abi,
}: BattleStarterProps) => {
  const [opponentVaa, setOpponentVaa] = useState<string>("");

  const startBattle = async () => {
    let contract = new ethers.Contract(network.deployedAddress, abi, provider.getSigner());
    let vaaAsBytes = Buffer.from(opponentVaa, "base64");
    console.log(vaaAsBytes);
    let tx = await contract.startBattle(vaaAsBytes);
    console.log(tx);
    let receipt = await tx.wait();
    console.log("receipt", receipt);
  };

  return (
    <div className="flex flex-col items-center w-1/2 p-6 m-6 border">
      Arena:
      <input
        type="text"
        className="w-full m-6 border"
        value={opponentVaa}
        onChange={(e) => setOpponentVaa(e.currentTarget.value)}
      />
      <button className="btn btn-blue" onClick={() => startBattle()}>
        Start Battle
      </button>
    </div>
  );
};

export default BattleStarter;
