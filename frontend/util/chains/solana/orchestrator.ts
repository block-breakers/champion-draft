
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
import { CoreGame } from "../../../../chains/solana/target/types/core_game";
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

setDefaultWasm("node");


export class Orchestrator {
  program: Program<CoreGame>;
  wormhole: web3.PublicKey;

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
      Object.entries(tx_accounts).map(
        (key, val) => `${val.toString()} ${key}`
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


