import * as ethers from "ethers";

type MetamaskButtonProps = {
  provider: ethers.providers.Web3Provider;
  setUserAddress: (_: string) => void;
};

const MetamaskButton = ({ provider, setUserAddress }: MetamaskButtonProps) => {
  const requestAccount = async () => {
    console.log(provider);
    console.log(provider.getSigner());
    let accounts = await provider.send("eth_requestAccounts", []);
    console.log(provider);
    console.log(provider.getSigner());
    console.log("=========");

    console.log("accounts", accounts);
    console.log("provider", provider);
    console.log("signer", provider.getSigner());
    setUserAddress(accounts[0]);
    console.log(provider);
  };

  if (typeof (window as any).ethereum !== "undefined") {
    return (
      <div>
        <button onClick={(_) => requestAccount()} className="btn btn-blue">
          Connect Wallet
        </button>
      </div>
    );
  } else {
    return (
      <div>
        <button className="btn btn-disabled">Connect Wallet</button>
        <p className="text-red">Wallet provider not detected</p>
      </div>
    );
  }
};

export default MetamaskButton;
