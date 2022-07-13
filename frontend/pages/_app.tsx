import { useMemo, useState } from "react";
import {
  ConnectionProvider,
  WalletProvider,
  useWallet as useSolanaWallet,
} from "@solana/wallet-adapter-react";
import { WalletAdapterNetwork } from "@solana/wallet-adapter-base";
import { PhantomWalletAdapter } from "@solana/wallet-adapter-wallets";
import {
  WalletModalProvider,
  WalletMultiButton,
} from "@solana/wallet-adapter-react-ui";
import { clusterApiUrl } from "@solana/web3.js";
import { useWallet as useEthWallet, UseWalletProvider } from "use-wallet";

// Default styles that can be overridden by your app
require("@solana/wallet-adapter-react-ui/styles.css");
import "../styles/globals.css";
import type { AppProps } from "next/app";
import {removeChampionHash} from "../util/storage";

function InnerApp({ Component, pageProps }: AppProps) {
  const [dummy, setDummy] = useState(false);
  const [ethConnectionAttempted, setEthConnectionAttempted] =
    useState<boolean>(false);

  const ethWallet = useEthWallet();
  const solWallet = useSolanaWallet();
  console.log("sol", solWallet);

  // if the user has logged in with metamask already, then it is safe to just call the wallet.connect
  // function (no blocking will happen). If they haven't, we should wait for them to press the button
  if (process.browser) {
    if (ethWallet.status === "connected") {
      localStorage.setItem("chain", "evm");
    } else {
      if (localStorage.getItem("chain") === "evm") {
        if (!ethConnectionAttempted) {
          // console.log("Attempting connection");
          // setEthConnectionAttempted(true);
          // ethWallet.connect();
        }
      }
    }
  }

  const ethOnClick = () => {
    if (ethWallet.status === "connected") {
      console.log("LOGGING OUT");
      localStorage.removeItem("chain");
      removeChampionHash();
      ethWallet.reset();
    } else {
      ethWallet.connect();
    }
  };

  const atLeastOneWalletConnected =
    (ethWallet.status === "connected" && ethWallet.ethereum !== undefined) ||
    solWallet.connected;

  return (
    <div className="flex flex-col w-screen h-screen">
      <div className="flex flex-row items-center justify-end py-4 pr-4 align-center space-x-4 bg-slate-300">
        <WalletMultiButton />
        <button onClick={ethOnClick} className="pr-4 btn btn-blue ">
          {ethWallet.status !== "connected" || ethWallet.ethereum !== undefined
            ? "MetaMask 🦊"
            : "Logout"}
        </button>
      </div>
      {atLeastOneWalletConnected ? (
        <Component {...pageProps} />
      ) : (
        <div className="w-full h-px bg-red-300 grow"></div>
      )}
    </div>
  );
}

function MyApp({ Component, pageProps }: AppProps) {
  // The network can be set to 'devnet', 'testnet', or 'mainnet-beta'.
  const network = WalletAdapterNetwork.Devnet;

  // You can also provide a custom RPC endpoint.
  const endpoint = "http://localhost:8899";

  // @solana/wallet-adapter-wallets includes all the adapters but supports tree shaking and lazy loading --
  // Only the wallets you configure here will be compiled into your application, and only the dependencies
  // of wallets that your users connect to will be loaded.
  const wallets = useMemo(() => [new PhantomWalletAdapter()], [network]);

  return (
    <UseWalletProvider chainId={1337}>
      <ConnectionProvider endpoint={endpoint}>
        <WalletProvider wallets={wallets} autoConnect>
          <WalletModalProvider>
            {<InnerApp Component={Component} pageProps={pageProps} />}
          </WalletModalProvider>
        </WalletProvider>
      </ConnectionProvider>
    </UseWalletProvider>
  );
}

export default MyApp;
