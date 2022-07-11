import * as anchor from "@project-serum/anchor";
import { web3 } from "@project-serum/anchor";
import { Program } from "@project-serum/anchor";
import {
  deriveAddress,
  getPdaAssociatedTokenAddress,
  makeReadOnlyAccountMeta,
  makeWritableAccountMeta,
} from "./helpers/utils";
import keccak256 from "keccak256";
import { CoreGame } from "../target/types/core_game";
import * as fs from "fs";
import { findProgramAddressSync } from "@project-serum/anchor/dist/cjs/utils/pubkey";
import { CORE_BRIDGE_ADDRESS, TOKEN_BRIDGE_ADDRESS } from "./helpers/consts";
import { PublicKey } from "@solana/web3.js";
import { Wallet } from "@project-serum/anchor/dist/cjs/provider";
import {
  CHAIN_ID_SOLANA,
  getEmitterAddressSolana,
  parseSequencesFromLogSolana,
  setDefaultWasm,
  tryNativeToHexString,
  postVaaSolanaWithRetry,
  importCoreWasm,
  getEmitterAddressEth,
} from "@certusone/wormhole-sdk";
import axios from "axios";
import { WormholeSolanaSdk } from "../target/types/wormhole_solana_sdk";
import * as b from "byteify";

setDefaultWasm("node");

const SOLANA_CORE_BRIDGE_ADDRESS =
  "Bridge1p5gheXUvJ6jGWGeCsgPKgnE3YgdGKRVCMY9o";

function getVaaBody(signedVaa: Buffer): Buffer {
  return signedVaa.subarray(57 + 66 * signedVaa[5]);
}

class Orchestrator {
  program: Program<CoreGame>;
  wormhole: web3.PublicKey;

  whMessageKey: web3.Keypair;

  constructor(program: Program<CoreGame>, wormhole: web3.PublicKey) {
    this.program = program;
    this.wormhole = wormhole;
  }

  async registerNft(payer: Wallet, message_account: anchor.web3.Keypair) {
    const program = this.program;
    const wormhole = this.wormhole;

    // PDAs
    const [championPda] = PublicKey.findProgramAddressSync(
      [anchor.utils.bytes.utf8.encode("champion"), payer.publicKey.toBuffer()],
      program.programId
    );
    const wormholeConfig = deriveAddress([Buffer.from("Bridge")], wormhole);
    const wormholeFeeCollector = deriveAddress(
      [Buffer.from("fee_collector")],
      wormhole
    );

    // the emitter address is a PDA from the business-logic program that calls the sdk (not the sdk itself)
    const wormholeEmitter = deriveAddress(
      [Buffer.from("emitter")],
      program.programId
    );
    const wormholeSequence = deriveAddress(
      [Buffer.from("Sequence"), wormholeEmitter.toBytes()],
      wormhole
    );

    console.log("Sending transaction");
    console.log("core bridge", CORE_BRIDGE_ADDRESS.toString());

    let tx_accounts = {
      owner: payer.publicKey,
      // the PDA account for the champion's data
      championAccount: championPda,
      // the account where wormhole will store the message
      wormholeMessageAccount: message_account.publicKey,
      // system program
      systemProgram: web3.SystemProgram.programId,

      // wormhole accounts
      emitterAccount: wormholeEmitter,
      coreBridge: wormhole,
      wormholeConfig,
      wormholeFeeCollector,
      wormholeSequence,

      // system accounts
      clock: web3.SYSVAR_CLOCK_PUBKEY,
      rent: web3.SYSVAR_RENT_PUBKEY,
    };
    console.log(
      "tx accounts",
      Object.keys(tx_accounts).map(
        (key) => `${tx_accounts[key].toString()} ${key}`
      )
    );

    return program.methods
      .registerNft()
      .accounts({
        ...tx_accounts,
      })
      .signers([message_account])
      .rpc();
  }
}

describe("solana", async () => {
  const { parse_vaa } = await importCoreWasm();

  // Configure the client to use the local cluster.
  const provider = anchor.AnchorProvider.env();
  // provider.opts.skipPreflight = true;
  // provider.opts.commitment = "confirmed";
  // provider.opts.preflightCommitment = "confirmed";
  anchor.setProvider(provider);

  const program = anchor.workspace.CoreGame as Program<CoreGame>;

  // provider.connection.onLogs(program.programId, logListener, "confirmed");

  const message_account = anchor.web3.Keypair.generate();
  const owner = provider.wallet;
  const orchestrator = new Orchestrator(program, CORE_BRIDGE_ADDRESS);

  it("Is initialized!", async () => {
    // Add your test here.
    const tx = await orchestrator.registerNft(owner, message_account);

    const [championPda] = PublicKey.findProgramAddressSync(
      [anchor.utils.bytes.utf8.encode("champion"), owner.publicKey.toBuffer()],
      program.programId
    );

    await sleep(2000);

    console.log(
      "Champion:",
      await program.account.championAccount.fetch(championPda)
    );

    console.log("Your transaction signature", tx);
    console.log(
      "tx",
      await program.provider.connection.getTransaction(tx, {
        commitment: "confirmed",
      })
    );

    const seq = parseSequencesFromLogSolana(
      await program.provider.connection.getTransaction(tx, {
        commitment: "confirmed",
      })
    );
    console.log("Sequence: ", seq);
    const emitterAddress = await getEmitterAddressSolana(
      program.programId.toString()
    );
    console.log("Emitter Address: ", emitterAddress);

    const WH_DEVNET_REST = "http://localhost:7071";
    const url = `${WH_DEVNET_REST}/v1/signed_vaa/${CHAIN_ID_SOLANA}/${emitterAddress}/${seq}`;
    console.log(url);

    let response = await axios.get(url);

    let vaa = response.data.vaaBytes;
    let vaaBytes = Buffer.from(vaa, "base64");

    console.log("vaa", vaa);

    await postVaaSolanaWithRetry(
      provider.connection,
      async (tx) => {
        await provider.wallet.signTransaction(tx);
        // tx.partialSign(provider.wallet);
        return tx;
      },
      SOLANA_CORE_BRIDGE_ADDRESS,
      provider.wallet.publicKey.toString(),
      vaaBytes,
      10
    );

    console.log("Vaa Posted");
    await sleep(5000);

    const parsed_vaa = parse_vaa(vaaBytes);

    if (true) {
      let emitter_address_acc = findProgramAddressSync(
        [
          Buffer.from("EmitterAddress"),
          b.serializeUint16(parsed_vaa.emitter_chain),
        ],
        program.programId
      )[0];

      let processed_vaa_key = findProgramAddressSync(
        [
          Buffer.from(emitterAddress, "hex"),
          b.serializeUint16(parsed_vaa.emitter_chain),
          b.serializeUint64(parsed_vaa.sequence),
        ],
        program.programId
      )[0];

      //Create VAA Hash to use in core bridge key
      let buffer_array = [];
      buffer_array.push(b.serializeUint32(parsed_vaa.timestamp));
      buffer_array.push(b.serializeUint32(parsed_vaa.nonce));
      buffer_array.push(b.serializeUint16(parsed_vaa.emitter_chain));
      buffer_array.push(Uint8Array.from(parsed_vaa.emitter_address));
      buffer_array.push(b.serializeUint64(parsed_vaa.sequence));
      buffer_array.push(b.serializeUint8(parsed_vaa.consistency_level));
      buffer_array.push(Uint8Array.from(parsed_vaa.payload));
      const hash = keccak256(Buffer.concat(buffer_array));

      let core_bridge_vaa_key = findProgramAddressSync(
        [Buffer.from("PostedVAA"), hash],
        new anchor.web3.PublicKey(SOLANA_CORE_BRIDGE_ADDRESS)
      )[0];
      console.log("Core Bridge VAA Key: ", core_bridge_vaa_key.toString());

      let config_acc = findProgramAddressSync(
        [Buffer.from("config")],
        program.programId
      )[0];

      if (false) {
        //Confirm via Messenger Code
        // await program.methods
        //   .confirmMsg()
        //   .accounts({
        //     payer: KEYPAIR.publicKey,
        //     systemProgram: anchor.web3.SystemProgram.programId,
        //     processedVaa: processed_vaa_key,
        //     emitterAcc: emitter_address_acc,
        //     coreBridgeVaa: core_bridge_vaa_key,
        //     config: config_acc,
        //   })
        //   .rpc();

        // console.log(
        //   (await program.account.config.fetch(config_acc)).currentMsg
        // );
      } else {
        const signature = await program.methods
          .debug()
          .accounts({ owner: owner.publicKey, coreBridgeVaa: core_bridge_vaa_key})
          .rpc();
        console.log("debug signature", signature);

        await sleep(5000);

        const transaction = await program.provider.connection.getTransaction(
          signature,
          {
            commitment: "confirmed",
          }
        );
        console.log("debug tx:", transaction);
      }
    }
  });
});

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const logListener = (
  provider: anchor.AnchorProvider,
  program: Program<CoreGame>
) => {
  return async (logs, ctx) => {
    console.group("Event emitted");
    console.log(logs);
    console.log(ctx);
    const transaction = await provider.connection.getTransaction(
      logs.signature,
      {
        commitment: "confirmed",
      }
    );

    const seq = parseSequencesFromLogSolana(transaction);
    const emitterAddress = await getEmitterAddressSolana(
      program.programId.toString()
    );
    const WH_DEVNET_REST = "http://localhost:7071";
    const url = `${WH_DEVNET_REST}/v1/signed_vaa/${CHAIN_ID_SOLANA}/${emitterAddress}/${seq}`;
    console.log("url", url);

    let response = await axios.get(url);

    console.log(JSON.stringify(response));

    console.groupEnd();
  };
};
