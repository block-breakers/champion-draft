import * as ethers from "ethers";

type MetamaskButtonProps = {
  provider: ethers.providers.Web3Provider;
  setUserAddress: (_: string) => void;
};

const MetamaskButton = ({ provider, setUserAddress}: MetamaskButtonProps) => {
  const requestAccount = async () => {
    let accounts = await provider.send("eth_requestAccounts", []);
    // const tx = await provider.getSigner().sendTransaction(
    // {
    //     to: accounts[0],
    //     value: ethers.utils.parseEther("1.0")
    // });
    console.log("accounts", accounts);
    setUserAddress(accounts[0])
    console.log(provider);
  };

  if (typeof (window as any).ethereum !== "undefined") {
    return (
      <div>
        <button onClick={(_ => requestAccount())} className="btn btn-blue">Connect Wallet</button>
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
