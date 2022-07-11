mod context;
mod data;
mod util;
mod wormhole;
mod constants;

use crate::util::calculate_hash;
use anchor_lang::prelude::*;
use context::*;
use data::*;
use wormhole::*;
use anchor_lang::solana_program::borsh::try_from_slice_unchecked;
use anchor_lang::solana_program::instruction::Instruction;
use anchor_lang::solana_program::program::invoke_signed;
use anchor_lang::solana_program::system_instruction::transfer;
use byteorder::{BigEndian, WriteBytesExt};
use sha3::Digest;
use std::io::{Cursor, Write};
use std::str::FromStr;

declare_id!("A9KvbP1zccZRUYcTjyCYQJ7n1iWKBcR8yDeGTj3mDphV");

#[program]
pub mod core_game {

    use super::*;

    pub fn register_nft(ctx: Context<RegisterNft>) -> Result<()> {
        // let cpi_accounts = wormhole_solana_sdk::cpi::accounts::PostMessage {
        //     payer: ctx.accounts.owner.to_account_info(),
        //     wormhole_message_key: ctx.accounts.wormhole_message_account.to_account_info(),
        //     emitter_account: ctx.accounts.emitter_account.clone(),
        //     core_bridge: ctx.accounts.core_bridge.clone(),
        //     wormhole_config: ctx.accounts.wormhole_config.clone(),
        //     wormhole_fee_collector: ctx.accounts.wormhole_fee_collector.clone(),
        //     wormhole_sequence: ctx.accounts.wormhole_sequence.clone(),
        //     clock: ctx.accounts.clock.clone(),
        //     rent: ctx.accounts.rent.clone(),

        //     system_program: ctx.accounts.system_program.to_account_info(),
        // };

        // let cpi_ctx = CpiContext::new(ctx.accounts.sdk_program.to_account_info(), cpi_accounts);

        // wormhole_solana_sdk::cpi::post_message(
        //     cpi_ctx,
        //     id(),
        //     ctx.accounts.core_bridge.key(),
        //     b"abcdefgh".to_vec(),
        //     0,
        // )?;


        let payload: Vec<u8> = b"abcdefgh".to_vec();
        let nonce: u32 = 0;

        {
            //Look up fee
            let bridge_data: BridgeData =
                try_from_slice_unchecked(&ctx.accounts.wormhole_config.data.borrow_mut())?;

            //Send Fee
            invoke_signed(
                &transfer(
                    &ctx.accounts.owner.key(),
                    &ctx.accounts.wormhole_fee_collector.key(),
                    bridge_data.config.fee,
                ),
                &[
                    ctx.accounts.owner.to_account_info(),
                    ctx.accounts.wormhole_fee_collector.to_account_info(),
                ],
                &[],
            )?;

            //Send Post Msg Tx
            let sendmsg_ix = Instruction {
                program_id: ctx.accounts.core_bridge.key(),
                accounts: vec![
                    AccountMeta::new(ctx.accounts.wormhole_config.key(), false),
                    AccountMeta::new(ctx.accounts.wormhole_message_account.key(), true),
                    AccountMeta::new_readonly(ctx.accounts.emitter_account.key(), true),
                    AccountMeta::new(ctx.accounts.wormhole_sequence.key(), false),
                    AccountMeta::new(ctx.accounts.owner.key(), true),
                    AccountMeta::new(ctx.accounts.wormhole_fee_collector.key(), false),
                    AccountMeta::new_readonly(ctx.accounts.clock.key(), false),
                    AccountMeta::new_readonly(ctx.accounts.rent.key(), false),
                    AccountMeta::new_readonly(ctx.accounts.system_program.key(), false),
                ],
                data: (
                    wormhole::Instruction::PostMessage,
                    wormhole::PostMessageData {
                        nonce: nonce,
                        payload: payload,
                        consistency_level: wormhole::ConsistencyLevel::Confirmed,
                    },
                )
                    .try_to_vec()?,
            };
            msg!("Invoking signed");
            invoke_signed(
                &sendmsg_ix,
                &[
                    ctx.accounts.wormhole_config.to_account_info(),
                    ctx.accounts.wormhole_message_account.to_account_info(),
                    ctx.accounts.emitter_account.to_account_info(),
                    ctx.accounts.wormhole_sequence.to_account_info(),
                    ctx.accounts.owner.to_account_info(),
                    ctx.accounts.wormhole_fee_collector.to_account_info(),
                    ctx.accounts.clock.to_account_info(),
                    ctx.accounts.rent.to_account_info(),
                    ctx.accounts.system_program.to_account_info(),
                ],
                &[&[
                    b"emitter".as_ref(),
                    &[*ctx.bumps.get("emitter_account").unwrap()],
                ]],
            )?;
        }

        let champion_seed = calculate_hash(&ctx.accounts.champion_account.key());
        // let champion_seed = calculate_hash(&(0xdeadbeef_u32));
        ctx.accounts.champion_account.champion = Champion::new(champion_seed as u32);
        Ok(())
    }


    pub fn cross_chain_battle(ctx: Context<CrossChainBattle>) -> Result<()> {
        ////Hash a VAA Extract and derive a VAA Key
        //let vaa = PostedMessageData::try_from_slice(&ctx.accounts.core_bridge_vaa.data.borrow())?.0;
        //let serialized_vaa = serialize_vaa(&vaa);

        //let mut h = sha3::Keccak256::default();
        //h.write(serialized_vaa.as_slice()).unwrap();
        //let vaa_hash: [u8; 32] = h.finalize().into();

        //let (vaa_key, _) = Pubkey::find_program_address(&[
        //    b"PostedVAA",
        //    &vaa_hash
        //], &Pubkey::from_str(CORE_BRIDGE_ADDRESS).unwrap());

        //if ctx.accounts.core_bridge_vaa.key() != vaa_key {
        //    return err!(MessengerError::VAAKeyMismatch);
        //}

        //// Already checked that the SignedVaa is owned by core bridge in account constraint logic
        ////Check that the emitter chain and address match up with the vaa
        //if vaa.emitter_chain != ctx.accounts.emitter_acc.chain_id ||
        //   vaa.emitter_address != &decode(&ctx.accounts.emitter_acc.emitter_addr.as_str()).unwrap()[..] {
        //    return err!(MessengerError::VAAEmitterMismatch)
        //}

        //ctx.accounts.config.current_msg = String::from_utf8(vaa.payload).unwrap();

        Ok(())
    }

    pub fn debug(ctx:Context<Debug>) -> Result<()> {
        let vaa = PostedMessageData::try_from_slice(*ctx.accounts.core_bridge_vaa.data.borrow())?.0;
        msg!("{:?}", vaa);
        Ok(())  
    }
}

