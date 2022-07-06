mod context;
mod data;
mod util;

use crate::util::calculate_hash;
use anchor_lang::prelude::*;
use context::*;
use data::*;
use wormhole_solana_sdk::core_bridge::context::PostMessage;
use wormhole_solana_sdk::core_bridge::lib::post_message;

declare_id!("Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS");

#[program]
pub mod core_game {

    use super::*;

    pub fn register_nft(ctx: Context<RegisterNft>) -> Result<()> {
        let cpi_accounts = PostMessage {
            payer: ctx.accounts.owner.clone(),
            wormhole_message_key: ctx.accounts.wormhole_message_account.clone(),
            emitter_account: ctx.accounts.emitter_account.clone(),
            core_bridge: ctx.accounts.core_bridge.clone(),
            wormhole_config: ctx.accounts.wormhole_config.clone(),
            wormhole_fee_collector: ctx.accounts.wormhole_fee_collector.clone(),
            wormhole_sequence: ctx.accounts.wormhole_sequence.clone(),
            clock: ctx.accounts.clock.clone(),
            rent: ctx.accounts.rent.clone(),

            system_program: ctx.accounts.system_program.clone(),
        };
        let cpi_ctx = CpiContext::new(ctx.accounts.core_bridge.clone(), cpi_accounts);

        post_message(cpi_ctx, ctx.accounts.owner.key(), vec![97, 98, 99, 100, 101], 0).expect("post_message failed");

        // let champion_seed = calculate_hash(&ctx.accounts.champion_account.key());
        let champion_seed = calculate_hash(&(0xdeadbeef_u32));
        ctx.accounts.champion_account.champion = Champion::new(champion_seed as u32);
        Ok(())
    }
}
