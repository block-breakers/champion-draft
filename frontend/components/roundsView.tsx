import * as ethers from "ethers";
import { useEffect, useState } from "react";
import { useTimer } from "react-timer-hook";
import Countdown from "./countdown";
import xdappConfig from "../../xdapp.config.json";
import evmAbi from "../../chains/evm/out/CoreGame.sol/CoreGame.json";

type RoundsViewProps = {};

const RoundsView = ({}: RoundsViewProps) => {
  const contract = new ethers.Contract(
    xdappConfig.networks.evm0.deployedAddress,
    evmAbi.abi as unknown as ethers.ContractInterface,
    new ethers.providers.JsonRpcProvider("http://localhost:8545")
  );

  const [timeLeft, setTimeLeft] = useState(new Date());
  const [roundStr, setRoundStr] = useState("Waiting for update...");
  const [round, setRound] = useState(-1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (contract) {
      console.log("Finding time left");
      findTimeLeft();
    }
  }, []);

  const findTimeLeft = async () => {
    console.log("Getting time left in round");
    const t = await contract.getTimeLeftInRound();
    console.log("TIME IS", t);
    const time = new Date();
    time.setSeconds(time.getSeconds() + t + 1);
    setTimeLeft(time);

    let roundStr: string;
    const r = await contract.curRound();
    if (t == 0) {
      roundStr = `Waiting for update... (last round was ${r})`;
      setRound(-1);
    } else {
      roundStr = `${r}`;
      setRound(r);
    }
    setRoundStr(roundStr);
    setLoading(false);
  };

  const expireCallback = () => {
    // waits 5 seconds before querying again
    // setLoading(true);
    new Promise((r) => {
      setTimeout(r, 3000);
    }).then(() => {
      console.log("finding time again");
      findTimeLeft();
    });
  };

  if (!contract || loading) {
    return <></>;
  }

  return (
    <div className="p-8 text-3xl text-center">
      <div>
        Round: {roundStr}{" "}
        {round != -1 && (
          <>{round % 2 == 0 ? "(Battle Round)" : "(Upgrade Round)"}</>
        )}
      </div>
      <div>
        Time left in round: &nbsp;
        <Countdown expiryTimestamp={timeLeft} expireCallback={expireCallback} />
      </div>
    </div>
  );
};

export default RoundsView;
