import * as anchor from "@project-serum/anchor";
import { web3 } from "@project-serum/anchor";
import { Program } from "@project-serum/anchor";
import { deriveAddress, getPdaAssociatedTokenAddress, makeReadOnlyAccountMeta, makeWritableAccountMeta } from "./helpers/utils";
import keccak256 from "keccak256";
import { CoreGame } from "../target/types/core_game";
import * as fs from "fs";
import {findProgramAddressSync} from "@project-serum/anchor/dist/cjs/utils/pubkey";
import {CORE_BRIDGE_ADDRESS, TOKEN_BRIDGE_ADDRESS} from "./helpers/consts";

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
  tokenBridge: web3.PublicKey;

  whMessageKey: web3.Keypair;
  custodian: web3.PublicKey;

  constructor(program: Program<CoreGame>, wormhole: web3.PublicKey) {
    this.program = program;
    this.wormhole = wormhole;
  }

  async registerNft(payer: web3.Keypair, saleId: Buffer) {
    const program = this.program;
    const wormhole = this.wormhole;

    // Accounts
    const payload = deriveAddress([Buffer.from("champion")], this.program.programId);

    const wormholeConfig = deriveAddress([Buffer.from("Bridge")], wormhole);
    const wormholeFeeCollector = deriveAddress(
      [Buffer.from("fee_collector")],
      wormhole
    );

    // contributor is the emitter
    const wormholeEmitter = deriveAddress(
      [Buffer.from("emitter")],
      program.programId
    );
    const wormholeSequence = deriveAddress(
      [Buffer.from("Sequence"), wormholeEmitter.toBytes()],
      wormhole
    );

    const wormholeMessage =
      this.deriveAttestContributionsMessageAccount(saleId);

    return program.methods
      .registerNft()
      .accounts({
        owner: payer.publicKey,
        systemProgram: web3.SystemProgram.programId,
        wormholeProgram: wormhole,
        wormholeConfig,
        wormholeFeeCollector,
        emitterAccount: wormholeEmitter,
        wormholeSequence,
        wormholeMessageAccount: wormholeMessage,
        clock: web3.SYSVAR_CLOCK_PUBKEY,
        rent: web3.SYSVAR_RENT_PUBKEY,
      })
      .signers([payer])
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
  anchor.setProvider(anchor.AnchorProvider.env());


  const owner = anchor.web3.Keypair.fromSecretKey(
    Uint8Array.from(
      JSON.parse(
        fs
          .readFileSync("/home/pbibersteinintern/.config/solana/id.json")
          .toString()
      )
    )
  );
  console.log((anchor.workspace));
  const program = anchor.workspace.CoreGame as Program<CoreGame>;

  const orchestrator = new Orchestrator(program, CORE_BRIDGE_ADDRESS);

  it("Is initialized!", async () => {
    // Add your test here.
    const tx = await orchestrator.registerNft(owner, Buffer.from("0"));
    console.log("Your transaction signature", tx);
  });
});
