use anchor_lang::prelude::*;

#[account]
pub struct CounterAccount {
    pub owner: Pubkey,
    pub count: u64,
}

