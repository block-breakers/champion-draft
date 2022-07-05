import * as ethers from "ethers";
import {useRouter} from "next/router";
import { useEffect, useMemo, useState } from "react";
import { Network } from "../pages";
// import * as storage from "../util/storage";

type ChampionUpgradeProps = {
  provider: ethers.providers.Web3Provider;
  network: Network;
  abi: any;
  hash: string | null;
};

const ChampionUpgrade = ({
  provider,
  network,
  abi,
  hash
}: ChampionUpgradeProps) => {

    const [upgrades, setUpgrades] = useState<number[]>([]);
    const [upgradePoints, setUpgradePoints] = useState(0);
    const upgradeNames = ["Attack + 5", "Defense + 2", "Speed + 5", "Crit Rate + 8%"];
    const [disabled, setDisabled] = useState(true);

    const contract = useMemo(
        () =>
          new ethers.Contract(
            network.deployedAddress,
            abi,
            provider.getSigner()
          ),
        [network]
      );
    
    useEffect(() => {
        if (hash == null) {
            return;
        }
        getUpgrades(hash);

    }, [hash]);

    const getUpgradePoints = async (hash: string) => {
        const champion = await contract.champions(hash);
        setUpgradePoints(champion.upgradePoints);
        if (champion.upgradePoints > 0) {
            setDisabled(false);
        }
    }

    const getUpgrades = async (hash: string) => {
        await getUpgradePoints(hash);
        const up = await contract.getUpgrades(hash);
        console.log("UP: ", up);
        const allUpgrades = [];
        for (let i = 0; i < 4; i ++) {
            if ((up >> (3-i)) & 1) {
                allUpgrades.push(i);
            }
        }
        setUpgrades(allUpgrades);
    }

    const router = useRouter();

    const onUpgrade = async (choice: number) => {
        setDisabled(true);
        console.log("upgrading choice", choice+1);
        await (await contract.upgrade(hash, choice+1)).wait();

        console.log("finished upgrade, getting upgrade points");
        await getUpgradePoints(hash);
        console.log("have upgrade points", upgradePoints);

        router.reload();
    }

    if (hash == null) {
        return <></>
    }

    return <>
        <div className="overflow-hidden rounded shadow-lg">
            <div className="px-6 py-4">
                <div className="font-bold text-l">Upgrade points remaining: {upgradePoints} </div>
                <p className="mt-3 text-center text-gray-700 grid grid-cols-2 gap-5">
                    {upgrades.map((up) => {
                        return <button 
                            className={disabled ? 
                                "bg-blue-500 text-white font-bold py-2 px-4 rounded opacity-50 cursor-not-allowed" 
                                : "btn btn-blue"}
                            disabled={disabled}
                            onClick={()=>onUpgrade(up)}
                            >
                                {upgradeNames[up]}
                            </button>
                    })}
                </p>
            </div>
        </div>
        </>
}

export default ChampionUpgrade;
