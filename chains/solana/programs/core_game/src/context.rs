use crate::data::{Champion, ChampionAccount, WormholeMessageAccount};

use anchor_lang::prelude::*;
use anchor_spl::token::TokenAccount;
use wormhole_solana_sdk::program::WormholeSolanaSdk;

#[error_code]
pub enum ChampionDraftError {
    #[msg("Attempted to register an NFT that the signer does not own as a champion")]
    NotOwnerOfNft,
    #[msg("error 1")]
    One,
}

#[derive(Accounts)]
pub struct RegisterNft<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,

    pub sdk_program: Program<'info, WormholeSolanaSdk>,

    /// the account that will store the champion's stats
    #[account(
        init,
        payer = owner,
        space = 8 + 32 + std::mem::size_of::<Champion>(),
        seeds = [ b"champion", owner.key().as_ref() ],
        bump
    )]
    pub champion_account: Account<'info, ChampionAccount>,

    /// once wormhole emits a VAA, it will be written back to this account so we have access to it
    #[account(
        mut,
    )]
    pub wormhole_message_account: Signer<'info>,

    /// the token account that houses the user's NFT
    // #[account(constraint = token_account.owner == owner.key() @ ChampionDraftError::NotOwnerOfNft )]
    // pub token_account: Account<'info, TokenAccount>,

    pub system_program: Program<'info, System>,

    // accounts needed by the wormhole CPI
    //
    /// CHECK: checked by callee
    #[account(
        seeds = [
            b"emitter".as_ref(),
        ],
        bump,
        mut
    )]
    pub emitter_account: AccountInfo<'info>,
    /// CHECK: checked by callee
    pub core_bridge: AccountInfo<'info>,
    /// CHECK: checked by callee
    #[account(mut)]
    pub wormhole_config: AccountInfo<'info>,
    /// CHECK: checked by callee
    #[account(mut)]
    pub wormhole_fee_collector: AccountInfo<'info>,
    /// CHECK: checked by callee
    #[account(mut)]
    pub wormhole_sequence: AccountInfo<'info>,
    /// CHECK: checked by callee
    pub clock: AccountInfo<'info>,
    /// CHECK: checked by callee
    pub rent: AccountInfo<'info>,
}

#[derive(Accounts)]
pub struct UpgradeChampion<'info> {
    #[account()]
    pub owner: Signer<'info>,
    #[account(
        has_one = owner,
        seeds = [ b"champion", owner.key().as_ref() ],
        bump
    )]
    pub champion_account: Account<'info, ChampionAccount>,
}
