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
import { WormholeSolanaSdk } from "../target/types/wormhole_solana_sdk";

function getVaaBody(signedVaa: Buffer): Buffer {
  return signedVaa.subarray(57 + 66 * signedVaa[5]);
}

function parseSaleId(iccoVaa: Buffer): Buffer {
  return getVaaBody(iccoVaa).subarray(1, 33);
}

function hashVaaPayload(signedVaa: Buffer): Buffer {
  const sigStart = 6;
  const numSigners = signedVaa[5];
  const sigLength = 66;
  const bodyStart = sigStart + sigLength * numSigners;
  return keccak256(signedVaa.subarray(bodyStart));
}

class Orchestrator {
  program: Program<CoreGame>;
  wormhole: web3.PublicKey;

  whMessageKey: web3.Keypair;
  sdk: Program<WormholeSolanaSdk>;

  constructor(
    program: Program<CoreGame>,
    wormhole: web3.PublicKey,
    sdk: Program<WormholeSolanaSdk>
  ) {
    this.program = program;
    this.wormhole = wormhole;
    this.sdk = sdk;
  }

  async registerNft(payer: web3.Keypair | Wallet, message_account: Keypair) {
    const program = this.program;
    const wormhole = this.wormhole;
    const sdk = this.sdk;

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
    console.log("emitter", wormholeEmitter.toString());
    const wormholeSequence = deriveAddress(
      [Buffer.from("Sequence"), wormholeEmitter.toBytes()],
      wormhole
    );

    console.log("Sending transaction");
    console.log(sdk.programId.toString());
    console.log("core bridge", CORE_BRIDGE_ADDRESS.toString());
    return program.methods
      .registerNft()
      .accounts({
        owner: payer.publicKey,
        // the PDA account for the champion's data
        championAccount: championPda,
        // the account where wormhole will store the message
        wormholeMessageAccount: message_account.publicKey,
        // system program
        systemProgram: web3.SystemProgram.programId,
        // the sdk program
        sdkProgram: sdk.programId,

        // wormhole accounts
        emitterAccount: wormholeEmitter,
        coreBridge: wormhole,
        wormholeConfig,
        wormholeFeeCollector,
        wormholeSequence,

        // system accounts
        clock: web3.SYSVAR_CLOCK_PUBKEY,
        rent: web3.SYSVAR_RENT_PUBKEY,
      })
      .signers([message_account])
      .rpc();
  }

  deriveSealedTransferMessageAccount(
    saleId: Buffer,
    mint: web3.PublicKey
  ): web3.PublicKey {
    return deriveAddress(
      [Buffer.from("bridge-sealed"), saleId, mint.toBytes()],
      this.program.programId
    );
  }

  deriveAttestContributionsMessageAccount(saleId: Buffer): web3.PublicKey {
    return deriveAddress(
      [Buffer.from("attest-contributions"), saleId],
      this.program.programId
    );
  }

  deriveSaleAccount(saleId: Buffer): web3.PublicKey {
    return deriveAddress(
      [Buffer.from("icco-sale"), saleId],
      this.program.programId
    );
  }

  deriveBuyerAccount(saleId: Buffer, buyer: web3.PublicKey): web3.PublicKey {
    return deriveAddress(
      [Buffer.from("icco-buyer"), saleId, buyer.toBuffer()],
      this.program.programId
    );
  }

  deriveSignedVaaAccount(signedVaa: Buffer): web3.PublicKey {
    const hash = hashVaaPayload(signedVaa);
    return deriveAddress([Buffer.from("PostedVAA"), hash], this.wormhole);
  }

  deriveCustodianAccount(): web3.PublicKey {
    return deriveAddress(
      [Buffer.from("icco-custodian")],
      this.program.programId
    );
  }
}

describe("solana", () => {
  // Configure the client to use the local cluster.
  const provider = anchor.AnchorProvider.env();
  provider.opts.skipPreflight = true;
  anchor.setProvider(provider);

  const message_account = anchor.web3.Keypair.generate();

  // let owner = anchor.web3.Keypair.fromSecretKey(
  //   Uint8Array.from(
  //     JSON.parse(
  //       fs
  //         .readFileSync("/home/pbibersteinintern/.config/solana/id.json")
  //         .toString()
  //     )
  //   )
  // );
  
  const owner = provider.wallet;

  const program = anchor.workspace.CoreGame as Program<CoreGame>;
  const sdk = anchor.workspace.WormholeSolanaSdk as Program<WormholeSolanaSdk>;

  const orchestrator = new Orchestrator(program, CORE_BRIDGE_ADDRESS, sdk);

  it("Is initialized!", async () => {
    // Add your test here.
    const tx = await orchestrator.registerNft(owner, message_account);
    console.log("Your transaction signature", tx);

    const [championPda] = PublicKey.findProgramAddressSync(
      [anchor.utils.bytes.utf8.encode("champion"), owner.publicKey.toBuffer()],
      program.programId
    );

    console.log(
      "Champion:",
      await program.account.championAccount.fetch(championPda)
    );
  });
});
