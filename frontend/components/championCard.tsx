import { useState } from "react";

type ChampionCardProps = {
    // the ethers provider that allows us to call contracts on chain
    champion: any;
    vaa: string;
    isSelf: boolean;
    // the callback to fire when the user chooses to start a battle
    buttonOnClick: (opponentVaa: string, championHash: string) => void;
    buttonText: string
};

const ChampionCard = ({champion, vaa, isSelf, buttonOnClick, buttonText}: ChampionCardProps) => {
    if (champion == null) {
        return <></>;
    }

    const [imageURI, setImageURI] = useState(null);
    const [name, setName] = useState("Unknown name");

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
        <div className="max-w-sm overflow-hidden rounded shadow-lg">
            {imageURI && 
            <img className="w-full" src={imageURI} />
            }
            <div className="px-6 py-4">
                
                <span className="">
                    <span className="max-w-sm text-xl font-bold truncate">{name}</span>
                    <span className="float-right text-md">Lvl. {champion.stats.level}</span>
                </span>
                <p className="mt-3 text-center text-gray-700 grid grid-cols-2 gap-8">
                    <p>Attack: {champion.stats.attack}</p>
                    <p>Defense: {champion.stats.defense}</p>
                    <p>Speed: {champion.stats.speed}</p>
                    <p>Crit Rate: {champion.stats.crit_rate}%</p>
                    <p className="col-span-2">Can battle at round {champion.round}</p>
                </p>
            </div>
            {!isSelf && 
                <div className="px-6 pb-6 text-center">
                <button 
                    className="bg-red-300 btn hover:bg-red-400"
                    onClick={() => buttonOnClick(vaa, champion.championHash)}>
                    {buttonText}
                </button>
                </div>
            }
        </div>
    )
};

export default ChampionCard;
