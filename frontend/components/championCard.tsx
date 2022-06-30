import { useEffect, useState } from "react";

type ChampionCardProps = {
    // the ethers provider that allows us to call contracts on chain
    championData: any;
    isSelf: boolean;
    // the callback to fire when the user chooses to start a battle
    startBattle: (opponentVaa: string) => void;
};

const ChampionCard = ({championData, isSelf, startBattle}: ChampionCardProps) => {
    if (championData == null) {
        return <></>;
    }

    const [imageURI, setImageURI] = useState(null);
    const [name, setName] = useState("Unknown name");
    const champion = championData.champion;

    // const fetchMetadata = async (uri: string) => {
    //     uri = "https://crossorigin.me/" + uri;
    //     console.log("THe uri is", uri);
    //     let response = await fetch(uri);
    //     console.log("image+name metadata", response);
    //     let data = await response.json();
    //     console.log("image+name response", data);
    // }

    // fetchMetadata(champion.uri);

    return (
        // <div key={vaa.seq} className="p-2 m-2 break-all border shadow">
        //     <div>
        //         <div className="font-bold">Address: </div>
        //         {vaa.address}
        //     </div>
        //     <div>Sequence number: {vaa.seq.toString()}</div>
        //     <div className="text-xs">Vaa: {vaa.vaa}</div>
        //     <button
        //         className="btn btn-blue"
        //         onClick={() => {
        //         navigator.permissions
        //             .query({ name: "clipboard-write" })
        //             .then((result) => {
        //             if (result.state == "granted" || result.state == "prompt") {
        //                 navigator.clipboard.writeText(champion.vaa);
        //             }
        //             });
        //         }}
        //     >
        //         copy
        //     </button>
        // </div>
        // <></>
        <div className="max-w-sm rounded overflow-hidden shadow-lg">
            {imageURI && 
            <img className="w-full" src={imageURI} alt="Sunset in the mountains" />
            }
            <div className="px-6 py-4">
                <div className="font-bold text-xl mb-2">{name}</div>
                <p className="text-gray-700 grid grid-cols-2 gap-8 text-center">
                    <p>Attack: {champion.attack}</p>
                    <p>Defense: {champion.defense}</p>
                    <p>Speed: {champion.speed}</p>
                    <p>Crit Rate: {champion.crit_rate}%</p>
                </p>
            </div>
            {!isSelf && 
                <div className="px-6 pb-6 text-center">
                <button 
                    className="btn bg-red-300 hover:bg-red-400"
                    onClick={() => startBattle(championData.vaa)}>
                                    Battle!</button>
                </div>
            }
        </div>
    )
};

export default ChampionCard;