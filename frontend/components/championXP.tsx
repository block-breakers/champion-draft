import * as ethers from "ethers";
import { useRouter } from "next/router";
import { useEffect, useMemo, useState } from "react";
import { Network } from "../pages";

type ChampionXPProps = {
    contract: ethers.Contract;
    usersNetwork: Network;
    serverBaseURL: string;
    userNetworkName: string;
    hash: string | null;
};

const ChampionXP = ({
    contract,
    usersNetwork,
    serverBaseURL,
    userNetworkName,
    hash
}: ChampionXPProps) => {

    if (!contract || !hash) return <></>;

    const [battleVAAs, setBattleVAAs] = useState<string[]>([]);
    const [disabled, setDisabled] = useState(false);
    const [lastQueryIdx, setLastQueryIdx] = useState(0);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (hash == null) {
            return;
        }
        getXP(hash);

    }, [hash]);

    const getXP = async (hash: string) => {
        setIsLoading(true);
        let url = new URL(serverBaseURL + "battles");
        url.searchParams.append("chain", userNetworkName);
        url.searchParams.append("champion", hash);
        url.searchParams.append("idx", lastQueryIdx.toString());

        console.log(url.toString())

        const res = await fetch(url.toString());
        if (res.status == 200) {
            let data = await res.json();
            console.log("fetch xp data is: ", data);
            // setLastQueryIdx((lastQueryIdx) => lastQueryIdx + data.length);
            // setBattleVAAs(battleVAAs => [...battleVAAs, ...data]);
            setBattleVAAs(data);
        }
        setIsLoading(false);
    }

    const router = useRouter();

    const onClaimXP = async (seq: string) => {
        setDisabled(true);
        console.log("submitting xp for seq", seq);

        const emitterAddr = String(await contract.getMessengerAddr()).substring(2).padStart(64, "0");
        console.log("emitter addr eth", emitterAddr);

        let url = `http://localhost:7071/v1/signed_vaa/${usersNetwork.wormholeChainId
            }/${emitterAddr}/${seq.toString()}`;
    
        // console.log(url);
        let response = await fetch(url);
        // console.log("fetched", response);
        let data = await response.json();

        console.log("got data for claim xp", data)

        try {
            await (await contract.claimXP(hash, Buffer.from(data.vaaBytes, 'base64'))).wait();
        } catch (e) {
            console.log(e);
            if (e && e.data && e.data.data)
                window.alert(e.data.data.reason);
            setDisabled(false);
        }

        console.log("finished submitting xp");

        // router.reload();
    }


    return <>
        <div className="overflow-hidden rounded shadow-lg">
            <div className="px-6 py-4">
                <div className="font-bold text-l">Claim Your XP Here</div>
                <p className="mt-3 text-center text-gray-700 grid grid-cols-2 gap-5">
                    {battleVAAs.map((vaa) => {
                        return <button
                            className={disabled ?
                                "bg-blue-500 text-white font-bold py-2 px-4 rounded opacity-50 cursor-not-allowed"
                                : "btn btn-blue"}
                            disabled={disabled}
                            onClick={() => onClaimXP(vaa)}
                        >
                            Battle VAA {vaa}
                        </button>
                    })}
                </p>
            </div>
        </div>
    </>
}

export default ChampionXP;
