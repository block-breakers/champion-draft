import * as ethers from "ethers";
import { useEffect, useState } from "react";
import { useTimer } from 'react-timer-hook';
import Countdown from "./countdown";

type RoundsViewProps = {
    contract: ethers.Contract;
};

const RoundsView = ({ contract }: RoundsViewProps) => {

    const [timeLeft, setTimeLeft] = useState(new Date());
    const [roundStr, setRoundStr] = useState("Waiting for update...");
    const [round, setRound] = useState(-1);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (contract) {
            findTimeLeft();
        }
    }, [contract]);


    const findTimeLeft = async () => {
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
    }

    const expireCallback = () => {
        // waits 5 seconds before querying again
        // setLoading(true);
        new Promise(r => {
            setTimeout(r, 3000);
        }).then(() => {
            console.log("finding time again");
            findTimeLeft();
        })
    }

    if (!contract || loading) {
        return <></>;
    }

    return (
        <div className="text-center text-3xl p-8">
            <div>Round: {roundStr} {round != -1 &&
                <>
                    {round % 2 == 0 ? "(Battle Round)" : "(Upgrade Round)"}
                </>}
            </div>
            <div>
                Time left in round: &nbsp;
                <Countdown expiryTimestamp={timeLeft} expireCallback={expireCallback} />
            </div>
        </div>
    );
};

export default RoundsView;
