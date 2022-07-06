use anchor_lang::prelude::*;
use borsh;

#[derive(Debug, Clone, AnchorSerialize, AnchorDeserialize)]
pub struct Champion {
    attack: u32,
    defense: u32,
    speed: u32,
    crit_rate: u32,
    level: u32,
    xp: u32,
    upgrade_points: u32,
}
impl Champion {
    /// given a byte value, creates a stat by dividing the byte value by `scale` and adding `offset`.
    /// e.g. byte_to_stat(n, 2, 5) would produce values in the range [5, n/2 + 5]
    fn byte_to_stat(byte: u8, scale: u32, offset: u32) -> u32 {
        (byte as u32) / scale + offset
    }
    /// create a new pseudorandom champion using the given seed
    pub fn new(seed: u32) -> Self {
        // convert the 4 byte seed into 4 individual bytes
        let bytes = seed.to_be_bytes();
        // convert the 4 bytes into 8 half_bytes (each in the range 0-16) by using bitmasking
        let half_bytes = [
            bytes[0] & 0x0f,
            bytes[0] >> 4,
            bytes[1] & 0x0f,
            bytes[1] >> 4,
            bytes[2] & 0x0f,
            bytes[2] >> 4,
            bytes[3] & 0x0f,
            bytes[3] >> 4,
        ];
        Self {
            // attack in range [5,13]
            attack: Self::byte_to_stat(half_bytes[0], 2, 5),
            // defense in range [1,4]
            defense: Self::byte_to_stat(half_bytes[1], 5, 1),
            // speed in range [1,17]
            speed: Self::byte_to_stat(half_bytes[2], 1, 1),
            // crit_rate in range [10,26]
            crit_rate: Self::byte_to_stat(half_bytes[3], 1, 10),

            level: 1,
            xp: 0,
            upgrade_points: 1,
        }
    }
}

#[account]
pub struct ChampionAccount {
    pub owner: Pubkey,
    pub champion: Champion,
}

#[account]
pub struct WormholeMessageAccount {
    pub data: [u8; 1024],
}
