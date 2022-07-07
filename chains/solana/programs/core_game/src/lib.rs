mod context;
mod data;
mod util;

use crate::util::calculate_hash;
use anchor_lang::prelude::*;
use context::*;
use data::*;

declare_id!("Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS");

#[program]
pub mod core_game {

    use super::*;

    pub fn register_nft(ctx: Context<RegisterNft>) -> Result<()> {
        println!(
            "{:?}",
            ctx.accounts.wormhole_message_account.to_account_infos()[0].is_signer
        );
        let cpi_accounts = wormhole_solana_sdk::cpi::accounts::PostMessage {
            payer: ctx.accounts.owner.to_account_info(),
            wormhole_message_key: ctx.accounts.wormhole_message_account.to_account_info(),
            emitter_account: ctx.accounts.emitter_account.clone(),
            core_bridge: ctx.accounts.core_bridge.clone(),
            wormhole_config: ctx.accounts.wormhole_config.clone(),
            wormhole_fee_collector: ctx.accounts.wormhole_fee_collector.clone(),
            wormhole_sequence: ctx.accounts.wormhole_sequence.clone(),
            clock: ctx.accounts.clock.clone(),
            rent: ctx.accounts.rent.clone(),

            system_program: ctx.accounts.system_program.to_account_info(),
        };

        let cpi_ctx = CpiContext::new(ctx.accounts.sdk_program.to_account_info(), cpi_accounts);

        wormhole_solana_sdk::cpi::post_message(
            cpi_ctx,
            id(),
            ctx.accounts.core_bridge.key(),
            b"abcdefgh".to_vec(),
            0,
        )?;

        let champion_seed = calculate_hash(&ctx.accounts.champion_account.key());
        // let champion_seed = calculate_hash(&(0xdeadbeef_u32));
        ctx.accounts.champion_account.champion = Champion::new(champion_seed as u32);
        Ok(())
    }
}
