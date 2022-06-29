import { Network } from "../pages";

type ChainSelectorProps = {
  networks: Record<string, Network>;
  setNetwork: (_: Network) => void;
  selectedNetwork: Network
};

const ChainSelector = ({ networks, setNetwork , selectedNetwork}: ChainSelectorProps) => {

  return (
    <span>
      {Object.keys(networks).map((key) => (
        <button
          className={
            "mx-4 btn btn-blue" +
            (networks[key] === selectedNetwork ? " bg-blue-900" : "")
          }
          onClick={() => setNetwork(networks[key])}
        >
          {key}
        </button>
      ))}
    </span>
  );
};

export default ChainSelector;
