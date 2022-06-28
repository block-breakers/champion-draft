import * as ethers from "ethers";
import { useEffect, useState } from "react";
import { Network } from "../pages";

type ChampionViewerProps = {
  provider: ethers.providers.Web3Provider;
  contract: ethers.Contract;
  network: Network;
};

type VaaInfo = {
  address: string;
  seq: number;
  vaa: string;
};

const ChampionViewer = ({
  network,
  provider,
  contract,
}: ChampionViewerProps) => {
  const [vaas, setVaas] = useState<VaaInfo[]>([]);

  const fetchVaas = async () => {
    let filter = contract.filters.findVAA();
    const events = await contract.queryFilter(filter);
    console.log("events", events);

    const vaaInfos = await Promise.all(
      events.map(async (event) => {
        let emitterAddr = event.args.emitterAddr.toString();
        const seq = event.args.seq as ethers.BigNumber;

        // chop off `0x` and pad to 64 chars
        emitterAddr = emitterAddr.substring(2).padStart(64, "0");

        let url = `http://localhost:7071/v1/signed_vaa/${
          network.wormholeChainId
        }/${emitterAddr}/${seq.toString()}`;

        console.log(url);
        let response = await fetch(url);
        console.log("fetched", response);
        let data = await response.json();

        return {
          address: emitterAddr,
          seq: seq,
          vaa: data.vaaBytes,
        };
      })
    );

    setVaas(vaaInfos);

    contract.on("findVAA", (author, old, event) =>
      console.log("event", author, old, event)
    );
  };

  useEffect(() => {
    fetchVaas();
  }, []);

  return (
    <div className="w-1/2">
      {vaas.map((vaa) => (
        <>
          <div className="p-2 m-2 break-all border shadow">
            <pre>{JSON.stringify(vaa, null, 2)}</pre>
          </div>
          <button
            className="btn btn-blue"
            onClick={() => {
              navigator.permissions
                .query({ name: "clipboard-write" })
                .then((result) => {
                  if (result.state == "granted" || result.state == "prompt") {
                    navigator.clipboard.writeText(vaa.vaa)
                  }
                });
            }}
          >
            copy
          </button>
        </>
      ))}
    </div>
  );
};

export default ChampionViewer;
