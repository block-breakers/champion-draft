import * as ethers from "ethers";
import { useRouter } from "next/router";
import { useEffect, useMemo, useState } from "react";
import { Network } from "../pages";
// import * as storage from "../util/storage";

type ChampionXPProps = {
    contract: ethers.Contract;
    serverBaseURL: string;
    userNetworkName: string;
    hash: string | null;
};

const ChampionXP = ({
    contract,
    serverBaseURL,
    userNetworkName,
    hash
}: ChampionXPProps) => {

    if (!contract || !hash) return <></>;

    const [battleVAAs, setBattleVAAs] = useState<string[]>([]);
    const [disabled, setDisabled] = useState(true);
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
            setLastQueryIdx((lastQueryIdx) => lastQueryIdx + data.length);
            setBattleVAAs(battleVAAs => [...battleVAAs, ...data]);
        }
        setIsLoading(false);
    }

    const router = useRouter();

    const onClaimXP = async (vaa: string) => {
        setDisabled(true);
        console.log("submitting xp", vaa);
        try {
            await (await contract.submitXP(hash, vaa)).wait();
        } catch (e) {
            window.alert("Can not submit XP during battle round!");
            setDisabled(false);
        }

        console.log("finished submitting xp");

        router.reload();
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
                            {vaa.substring(0, 6)}...
                        </button>
                    })}
                </p>
            </div>
        </div>
    </>
}

export default ChampionXP;
