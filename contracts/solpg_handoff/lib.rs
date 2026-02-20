use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, Token, TokenAccount, Transfer};

declare_id!("5JUtUiusEUzwgub1LTztjGJ1h2krpzqBaVfQrEHHwJbr");

#[program]
pub mod bizfi_market {
    use super::*;

    pub fn initialize_market(
        ctx: Context<InitializeMarket>,
        market_id: u64,
        question: String,
        duration: i64,
    ) -> Result<()> {
        require!(market_id > 0, MarketError::InvalidMarketId);
        require!(question.len() <= 256, MarketError::QuestionTooLong);
        require!(duration > 0, MarketError::InvalidDuration);

        let market = &mut ctx.accounts.market;
        market.market_id = market_id;
        market.creator = ctx.accounts.creator.key();
        market.question = question;
        market.end_time = Clock::get()?.unix_timestamp + duration;
        market.status = MarketStatus::Active;
        market.total_pool = 0;
        market.yes_pool = 0;
        market.no_pool = 0;
        market.outcome = false;
        market.usdc_mint = ctx.accounts.usdc_mint.key();
        market.market_bump = ctx.bumps.market;
        market.vault_bump = ctx.bumps.vault_usdc;
        market.vault_authority_bump = ctx.bumps.vault_authority;

        msg!("Market initialized successfully");
        Ok(())
    }

    pub fn place_bet(ctx: Context<PlaceBet>, amount: u64, bet_on_yes: bool) -> Result<()> {
        let market = &mut ctx.accounts.market;
        require!(market.status == MarketStatus::Active, MarketError::MarketNotActive);
        require!(
            Clock::get()?.unix_timestamp < market.end_time,
            MarketError::MarketExpired
        );
        require!(amount > 0, MarketError::InvalidAmount);

        let cpi_accounts = Transfer {
            from: ctx.accounts.user_usdc.to_account_info(),
            to: ctx.accounts.vault_usdc.to_account_info(),
            authority: ctx.accounts.user.to_account_info(),
        };
        let cpi_ctx = CpiContext::new(ctx.accounts.token_program.to_account_info(), cpi_accounts);
        token::transfer(cpi_ctx, amount)?;

        market.total_pool = market
            .total_pool
            .checked_add(amount)
            .ok_or(MarketError::MathOverflow)?;
        if bet_on_yes {
            market.yes_pool = market
                .yes_pool
                .checked_add(amount)
                .ok_or(MarketError::MathOverflow)?;
        } else {
            market.no_pool = market
                .no_pool
                .checked_add(amount)
                .ok_or(MarketError::MathOverflow)?;
        }

        let position = &mut ctx.accounts.user_position;
        if position.user == Pubkey::default() {
            position.user = ctx.accounts.user.key();
            position.market = market.key();
            position.yes_amount = 0;
            position.no_amount = 0;
            position.claimed = false;
            position.bump = ctx.bumps.user_position;
        } else {
            require_keys_eq!(
                position.user,
                ctx.accounts.user.key(),
                MarketError::InvalidPositionOwner
            );
            require_keys_eq!(
                position.market,
                market.key(),
                MarketError::InvalidPositionMarket
            );
        }

        if bet_on_yes {
            position.yes_amount = position
                .yes_amount
                .checked_add(amount)
                .ok_or(MarketError::MathOverflow)?;
        } else {
            position.no_amount = position
                .no_amount
                .checked_add(amount)
                .ok_or(MarketError::MathOverflow)?;
        }

        msg!(
            "Bet placed: {} on {}",
            amount,
            if bet_on_yes { "YES" } else { "NO" }
        );
        Ok(())
    }

    pub fn resolve_market(ctx: Context<ResolveMarket>, outcome: bool) -> Result<()> {
        let market = &mut ctx.accounts.market;
        require!(
            ctx.accounts.authority.key() == market.creator,
            MarketError::Unauthorized
        );
        require!(market.status == MarketStatus::Active, MarketError::MarketNotActive);
        require!(
            Clock::get()?.unix_timestamp >= market.end_time,
            MarketError::MarketNotExpired
        );

        market.outcome = outcome;
        market.status = MarketStatus::Resolved;

        msg!("Market resolved with outcome: {}", outcome);
        Ok(())
    }

    pub fn claim_winnings(ctx: Context<ClaimWinnings>) -> Result<()> {
        let market = &ctx.accounts.market;
        let position = &mut ctx.accounts.user_position;

        require!(
            market.status == MarketStatus::Resolved,
            MarketError::MarketNotResolved
        );
        require!(!position.claimed, MarketError::AlreadyClaimed);
        require_keys_eq!(
            position.user,
            ctx.accounts.user.key(),
            MarketError::InvalidPositionOwner
        );
        require_keys_eq!(
            position.market,
            market.key(),
            MarketError::InvalidPositionMarket
        );

        let (user_stake, winning_pool) = if market.outcome {
            (position.yes_amount, market.yes_pool)
        } else {
            (position.no_amount, market.no_pool)
        };
        require!(user_stake > 0, MarketError::NoWinnings);
        require!(winning_pool > 0, MarketError::NoWinnings);

        let winning_amount_u128 = (user_stake as u128)
            .checked_mul(market.total_pool as u128)
            .ok_or(MarketError::MathOverflow)?
            .checked_div(winning_pool as u128)
            .ok_or(MarketError::MathOverflow)?;
        let winning_amount = u64::try_from(winning_amount_u128).map_err(|_| error!(MarketError::MathOverflow))?;
        require!(winning_amount > 0, MarketError::NoWinnings);

        let market_id_bytes = market.market_id.to_le_bytes();
        let vault_authority_bump = [market.vault_authority_bump];
        let signer_seeds: &[&[u8]] = &[
            b"vault_authority",
            market_id_bytes.as_ref(),
            vault_authority_bump.as_ref(),
        ];
        let signer = &[signer_seeds];

        let cpi_accounts = Transfer {
            from: ctx.accounts.vault_usdc.to_account_info(),
            to: ctx.accounts.user_usdc.to_account_info(),
            authority: ctx.accounts.vault_authority.to_account_info(),
        };
        let cpi_ctx = CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            cpi_accounts,
            signer,
        );
        token::transfer(cpi_ctx, winning_amount)?;

        position.claimed = true;
        msg!("Winnings claimed: {}", winning_amount);
        Ok(())
    }
}

#[derive(Accounts)]
#[instruction(market_id: u64, question: String, duration: i64)]
pub struct InitializeMarket<'info> {
    #[account(
        init,
        payer = creator,
        space = Market::LEN,
        seeds = [b"market", market_id.to_le_bytes().as_ref()],
        bump
    )]
    pub market: Account<'info, Market>,
    #[account(
        seeds = [b"vault_authority", market_id.to_le_bytes().as_ref()],
        bump
    )]
    /// CHECK: PDA used only as token authority signer.
    pub vault_authority: UncheckedAccount<'info>,
    #[account(
        init,
        payer = creator,
        seeds = [b"vault", market_id.to_le_bytes().as_ref()],
        bump,
        token::mint = usdc_mint,
        token::authority = vault_authority
    )]
    pub vault_usdc: Account<'info, TokenAccount>,
    pub usdc_mint: Account<'info, Mint>,
    #[account(mut)]
    pub creator: Signer<'info>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
pub struct PlaceBet<'info> {
    #[account(
        mut,
        seeds = [b"market", market.market_id.to_le_bytes().as_ref()],
        bump = market.market_bump
    )]
    pub market: Account<'info, Market>,
    #[account(mut)]
    pub user: Signer<'info>,
    #[account(
        mut,
        constraint = user_usdc.owner == user.key() @ MarketError::InvalidTokenOwner,
        constraint = user_usdc.mint == market.usdc_mint @ MarketError::InvalidTokenMint
    )]
    pub user_usdc: Account<'info, TokenAccount>,
    #[account(
        seeds = [b"vault_authority", market.market_id.to_le_bytes().as_ref()],
        bump = market.vault_authority_bump
    )]
    /// CHECK: PDA used only for vault ownership validation.
    pub vault_authority: UncheckedAccount<'info>,
    #[account(
        mut,
        seeds = [b"vault", market.market_id.to_le_bytes().as_ref()],
        bump = market.vault_bump,
        constraint = vault_usdc.owner == vault_authority.key() @ MarketError::InvalidVaultAuthority,
        constraint = vault_usdc.mint == market.usdc_mint @ MarketError::InvalidTokenMint
    )]
    pub vault_usdc: Account<'info, TokenAccount>,
    #[account(
        init_if_needed,
        payer = user,
        space = UserPosition::LEN,
        seeds = [b"position", market.market_id.to_le_bytes().as_ref(), user.key().as_ref()],
        bump
    )]
    pub user_position: Account<'info, UserPosition>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
pub struct ResolveMarket<'info> {
    #[account(
        mut,
        seeds = [b"market", market.market_id.to_le_bytes().as_ref()],
        bump = market.market_bump
    )]
    pub market: Account<'info, Market>,
    pub authority: Signer<'info>,
}

#[derive(Accounts)]
pub struct ClaimWinnings<'info> {
    #[account(
        mut,
        seeds = [b"market", market.market_id.to_le_bytes().as_ref()],
        bump = market.market_bump
    )]
    pub market: Account<'info, Market>,
    #[account(mut)]
    pub user: Signer<'info>,
    #[account(
        mut,
        constraint = user_usdc.owner == user.key() @ MarketError::InvalidTokenOwner,
        constraint = user_usdc.mint == market.usdc_mint @ MarketError::InvalidTokenMint
    )]
    pub user_usdc: Account<'info, TokenAccount>,
    #[account(
        seeds = [b"vault_authority", market.market_id.to_le_bytes().as_ref()],
        bump = market.vault_authority_bump
    )]
    /// CHECK: PDA authority signer for vault payouts.
    pub vault_authority: UncheckedAccount<'info>,
    #[account(
        mut,
        seeds = [b"vault", market.market_id.to_le_bytes().as_ref()],
        bump = market.vault_bump,
        constraint = vault_usdc.owner == vault_authority.key() @ MarketError::InvalidVaultAuthority,
        constraint = vault_usdc.mint == market.usdc_mint @ MarketError::InvalidTokenMint
    )]
    pub vault_usdc: Account<'info, TokenAccount>,
    #[account(
        mut,
        seeds = [b"position", market.market_id.to_le_bytes().as_ref(), user.key().as_ref()],
        bump = user_position.bump
    )]
    pub user_position: Account<'info, UserPosition>,
    pub token_program: Program<'info, Token>,
}

#[account]
pub struct Market {
    pub market_id: u64,
    pub creator: Pubkey,
    pub question: String,
    pub end_time: i64,
    pub status: MarketStatus,
    pub total_pool: u64,
    pub yes_pool: u64,
    pub no_pool: u64,
    pub outcome: bool,
    pub usdc_mint: Pubkey,
    pub market_bump: u8,
    pub vault_bump: u8,
    pub vault_authority_bump: u8,
}

impl Market {
    pub const LEN: usize = 8 + 8 + 32 + (4 + 256) + 8 + 1 + 8 + 8 + 8 + 1 + 32 + 1 + 1 + 1;
}

#[account]
pub struct UserPosition {
    pub user: Pubkey,
    pub market: Pubkey,
    pub yes_amount: u64,
    pub no_amount: u64,
    pub claimed: bool,
    pub bump: u8,
}

impl UserPosition {
    pub const LEN: usize = 8 + 32 + 32 + 8 + 8 + 1 + 1;
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq)]
pub enum MarketStatus {
    Active,
    Resolved,
    Disputed,
}

#[error_code]
pub enum MarketError {
    #[msg("Market is not currently active")]
    MarketNotActive,
    #[msg("Unauthorized access")]
    Unauthorized,
    #[msg("Question too long (max 256 chars)")]
    QuestionTooLong,
    #[msg("Invalid duration")]
    InvalidDuration,
    #[msg("Market has expired")]
    MarketExpired,
    #[msg("Invalid amount")]
    InvalidAmount,
    #[msg("Market not expired yet")]
    MarketNotExpired,
    #[msg("Market not resolved yet")]
    MarketNotResolved,
    #[msg("Already claimed")]
    AlreadyClaimed,
    #[msg("No winnings to claim")]
    NoWinnings,
    #[msg("Math overflow")]
    MathOverflow,
    #[msg("Invalid market id")]
    InvalidMarketId,
    #[msg("Invalid position owner")]
    InvalidPositionOwner,
    #[msg("Invalid position market")]
    InvalidPositionMarket,
    #[msg("Invalid token owner")]
    InvalidTokenOwner,
    #[msg("Invalid token mint")]
    InvalidTokenMint,
    #[msg("Invalid vault authority")]
    InvalidVaultAuthority,
}
