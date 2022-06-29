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

  // parses an emitted findVAA event into a `VaaInfo`
  const parseEvent = async (event: ethers.Event): Promise<VaaInfo> => {
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
      seq: seq.toNumber(),
      vaa: data.vaaBytes,
    };
  };

  // query all pre-existing findVAA events and load them into state
  const fetchVaas = async () => {
    let filter = contract.filters.findVAA();
    const events = await contract.queryFilter(filter);
    console.log("events", events);

    const vaaInfos = await Promise.all(events.map(parseEvent));

    setVaas(vaaInfos);
  };

  // when this component loads, we need to fetch the initial (pre-existing) set of champions
  useEffect(() => {
    fetchVaas();
  }, []);

  useEffect(() => {
    const listener = async (_author, _old, event) => {
      let newVaaInfo = await parseEvent(event);
      setVaas((old) => [...old, newVaaInfo]);
    };

    // attach listener to new events, but remember to unregister it when this component is unmounted
    contract.on("findVAA", listener);
    return () => {
      contract.off("findVAA", listener);
    };
  }, []);

  return (
    <div className="">
      {vaas.map((vaa) => (
          <div key={vaa.seq} className="p-2 m-2 break-all border shadow">
            <div>
              <div className="font-bold">Address: </div>
              {vaa.address}
            </div>
            <div>Sequence number: {vaa.seq.toString()}</div>
            <div className="text-xs">Vaa: {vaa.vaa}</div>
            <button
              className="btn btn-blue"
              onClick={() => {
                navigator.permissions
                  .query({ name: "clipboard-write" })
                  .then((result) => {
                    if (result.state == "granted" || result.state == "prompt") {
                      navigator.clipboard.writeText(vaa.vaa);
                    }
                  });
              }}
            >
              copy
            </button>
          </div>
      ))}
    </div>
  );
};

export default ChampionViewer;
