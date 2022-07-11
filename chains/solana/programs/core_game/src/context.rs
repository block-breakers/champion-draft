use std::str::FromStr;
use crate::data::*;
use crate::constants::CORE_BRIDGE_ADDRESS;
use crate::wormhole::*;
use hex::decode;

use anchor_lang::prelude::*;
use anchor_spl::token::TokenAccount;

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
    #[account(mut)]
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
pub struct CrossChainBattle<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    pub system_program: Program<'info, System>,

    #[account(
        init,
        seeds=[
            &decode(&emitter_acc.emitter_addr.as_str()).unwrap()[..],
            emitter_acc.chain_id.to_be_bytes().as_ref(),
            (PostedMessageData::try_from_slice(&core_bridge_vaa.data.borrow())?.0).sequence.to_be_bytes().as_ref()
        ],
        payer=payer,
        bump,
        space=8
    )]
    pub processed_vaa: Account<'info, ProcessedVAA>,
    pub emitter_acc: Account<'info, EmitterAddrAccount>,

    /// This requires some fancy hashing, so confirm it's derived address in the function itself.
    #[account(
        constraint = core_bridge_vaa.to_account_info().owner == &Pubkey::from_str(CORE_BRIDGE_ADDRESS).unwrap()
    )]

    /// CHECK: This account is owned by Core Bridge so we trust it
    pub core_bridge_vaa: AccountInfo<'info>,

    #[account(mut)]
    pub config: Account<'info, Config>,
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

#[derive(Accounts)]
pub struct Debug<'info>{
    #[account()]
    pub owner: Signer<'info>,
    #[account(
        constraint = core_bridge_vaa.to_account_info().owner == &Pubkey::from_str(CORE_BRIDGE_ADDRESS).unwrap()
    )]
    /// CHECK: This account is owned by Core Bridge so we trust it
    pub core_bridge_vaa: AccountInfo<'info>,
}

