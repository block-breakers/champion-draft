import { ContractInterface, ethers } from "ethers";
import * as interfaceChecker from "../util/ercInterfaces";
import * as anchor from "@project-serum/anchor";
import { useWallet as useEvmWallet } from "use-wallet";
import { useWallet as useSolanaWallet } from "@solana/wallet-adapter-react";
import { useEffect, useMemo, useState } from "react";
import ethCoreGameAbi from "../../chains/evm/out/CoreGame.sol/CoreGame.json";
import solanaCoreGameIdl from "../../chains/solana/target/idl/core_game.json";
import { CoreGame } from "../../chains/solana/target/types/core_game";
import xdappConfig from "../../xdapp.config.json";
import { Network } from "../pages";
import { Orchestrator } from "./chains/solana/orchestrator";
import * as solana from "@solana/web3.js";

const getUsersNetworkIdentifier = async (
  provider: ethers.providers.Web3Provider
): Promise<"evm0" | "evm1"> => {
  // TODO: this is a hacky way to get the network identifier. We should use the method below,
  // but for some reason ganache does not always respond to "net_version" requests so we're stuck with this.
  return "evm1";

  const myVersion = await provider.send("net_version", []);

  const evm1Version = await new ethers.providers.JsonRpcProvider(
    "http://localhost:8546"
  ).send("net_version", []);
  console.log("3");

  if (myVersion === evm1Version) {
    return "evm1";
  } else {
    return "evm0";
  }
};

export type Connection =
  | {
      kind: "evm";
      provider: ethers.providers.Web3Provider;
      abi: ContractInterface;
      network: Network;
    }
  | {
      kind: "solana";
      provider: anchor.AnchorProvider;
      program: anchor.Program<CoreGame>;
      network: Network;
    };

export const useChainConnection = () => {
  const [connection, setConnection] = useState<Connection | null>(null);

  const ethProvider = useEvmWallet();
  const solanaProvider = useSolanaWallet();

  const [usersNetwork, setUsersNetwork] = useState<Network | null>(null);

  console.log("Connection", connection);
  console.log("usersNetwork", usersNetwork);
  console.log("ethProvider", ethProvider);
  console.log("solanaProvider", solanaProvider);

  const getUsersNetwork = async () => {
    console.log("GET USERS NETWORK", ethProvider);
    if (
      ethProvider.status === "connected" &&
      ethProvider.ethereum !== undefined
    ) {
      console.log("setting suersnetwork");
      const provider = new ethers.providers.Web3Provider(ethProvider.ethereum);
      let identifier = await getUsersNetworkIdentifier(provider);
      console.log("set");
      setUsersNetwork(xdappConfig.networks[identifier]);
    }
    if (solanaProvider !== undefined && solanaProvider.connected === true) {
      setUsersNetwork(xdappConfig.networks.solana);
    }
  };
  useEffect(() => {
    getUsersNetwork();
  }, [ethProvider, solanaProvider]);

  // turn the solana adapter wallet into an Anchor wallet
  const anchorCompatibleWallet = useMemo(
    () =>
      solanaProvider.publicKey &&
      solanaProvider.signTransaction &&
      solanaProvider.signAllTransactions
        ? {
            publicKey: solanaProvider.publicKey,
            signTransaction: solanaProvider.signTransaction,
            signAllTransactions: solanaProvider.signAllTransactions,
          }
        : undefined,
    [
      solanaProvider.publicKey,
      solanaProvider.signTransaction,
      solanaProvider.signAllTransactions,
    ]
  );

  useEffect(() => {
    if (usersNetwork === null) {
      return;
    }

    // check for the eth wallet being ready. If it is, return it to the user
    if (
      ethProvider.status === "connected" &&
      ethProvider.ethereum !== undefined
    ) {
      console.log("using eth");
      console.log(ethProvider.ethereum);
      setConnection({
        provider: new ethers.providers.Web3Provider(ethProvider.ethereum),
        kind: "evm",
        abi: ethCoreGameAbi.abi as unknown as ContractInterface,
        network: usersNetwork,
      });
    }

    // check for the solana wallet being ready. If it is, return it to the user
    if (
      solanaProvider !== undefined &&
      solanaProvider.wallet !== null &&
      anchorCompatibleWallet !== undefined
    ) {
      const provider = new anchor.AnchorProvider(
        new anchor.web3.Connection(xdappConfig.networks.solana.rpc),

        anchorCompatibleWallet,
        {}
      );
      anchor.setProvider(provider);
      setConnection({
        provider,
        kind: "solana",
        program: new anchor.Program<CoreGame>(
          solanaCoreGameIdl as any,
          usersNetwork.deployedAddress,
          provider
        ),
        network: usersNetwork,
      });
    }
  }, [solanaProvider, ethProvider, usersNetwork]);

  return connection;
};

export const getUsersNetwork = (connection: Connection) => {
  connection.network;
};

export const registerNft = async (
  connection: Connection,
  nftContractAddress: string,
  tokenId: string
): Promise<{ error: string } | string> => {
  if (connection.kind === "evm") {
    console.log("checking interface");
    try {
      interfaceChecker.isErc721(nftContractAddress, connection.provider);
    } catch (e) {
      console.error(e);
      return { error: "Not ERC721 compatible" };
    }

    console.log(
      "connection.network.deployedAddress",
      connection.network.deployedAddress
    );
    const contract = new ethers.Contract(
      connection.network.deployedAddress,
      connection.abi,
      connection.provider.getSigner()
    );

    const newHash = await contract.getChampionHash(
      nftContractAddress,
      ethers.BigNumber.from(tokenId)
    );

    console.log("newHash", newHash);

    if ((await contract.champions(newHash)).championHash.toString() === "0") {
      console.log("Sending registerNft tx");
      const tx = await contract.registerNFT(nftContractAddress, tokenId);
      console.log("Finalizing registerNft tx");
      const receipt = await tx.wait();
      console.log("Finalized registerNft tx");

      const championHash = await contract.getChampionHash(
        nftContractAddress,
        tokenId
      );
      return championHash;
    } else {
      return newHash;
    }
  } else if (connection.kind === "solana") {
    const message_account = anchor.web3.Keypair.generate();
    const owner = connection.provider.wallet;
    const orchestrator = new Orchestrator(
      connection.program,
      new anchor.web3.PublicKey(xdappConfig.networks.solana.bridgeAddress)
    );
    const tx = await orchestrator.registerNft(owner, message_account);
    console.log("RegisterNFT tx completed");

    const [championPda] = solana.PublicKey.findProgramAddressSync(
      [anchor.utils.bytes.utf8.encode("champion"), owner.publicKey.toBuffer()],
      connection.program.programId
    );

    await new Promise((r) => setTimeout(r, 5000));

    console.log(
      "Registered Champion:",
      await connection.program.account.championAccount.fetch(championPda)
    );

    return championPda.toString();
  }
};

export const getChampionInfo = async (
  connection: Connection,
  championId: string
) => {
  if (connection.kind === "evm") {
    const contract = new ethers.Contract(
      connection.network.deployedAddress,
      connection.abi,
      connection.provider.getSigner()
    );
    return await contract.champions(championId);
  } else if (connection.kind === "solana") {
    return (await connection.program.account.championAccount.fetch(championId))
      .champion;
  }
};
