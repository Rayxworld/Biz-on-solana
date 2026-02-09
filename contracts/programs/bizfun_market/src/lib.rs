use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};

declare_id!("BizFunMarket1111111111111111111111111111111");

#[program]
pub mod bizfun_market {
    use super::*;

    pub fn initialize_market(
        ctx: Context<InitializeMarket>,
        question: String,
        duration: i64,
    ) -> Result<()> {
        require!(question.len() <= 256, MarketError::QuestionTooLong);
        require!(duration > 0, MarketError::InvalidDuration);

        let market = &mut ctx.accounts.market;
        market.creator = ctx.accounts.creator.key();
        market.question = question;
        market.end_time = Clock::get()?.unix_timestamp + duration;
        market.status = MarketStatus::Active;
        market.total_pool = 0;
        market.yes_pool = 0;
        market.no_pool = 0;
        market.outcome = false;

        msg!("Market initialized successfully");
        Ok(())
    }

    pub fn place_bet(
        ctx: Context<PlaceBet>,
        amount: u64,
        bet_on_yes: bool,
    ) -> Result<()> {
        let market = &mut ctx.accounts.market;
        require!(market.status == MarketStatus::Active, MarketError::MarketNotActive);
        require!(Clock::get()?.unix_timestamp < market.end_time, MarketError::MarketExpired);
        require!(amount > 0, MarketError::InvalidAmount);

        let cpi_accounts = Transfer {
            from: ctx.accounts.user_usdc.to_account_info(),
            to: ctx.accounts.vault_usdc.to_account_info(),
            authority: ctx.accounts.user.to_account_info(),
        };
        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);
        token::transfer(cpi_ctx, amount)?;

        market.total_pool += amount;
        if bet_on_yes {
            market.yes_pool += amount;
        } else {
            market.no_pool += amount;
        }

        let position = &mut ctx.accounts.user_position;
        position.user = ctx.accounts.user.key();
        position.market = market.key();
        if bet_on_yes {
            position.yes_amount += amount;
        } else {
            position.no_amount += amount;
        }

        msg!("Bet placed: {} on {}", amount, if bet_on_yes { "YES" } else { "NO" });
        Ok(())
    }

    pub fn resolve_market(ctx: Context<ResolveMarket>, outcome: bool) -> Result<()> {
        let market = &mut ctx.accounts.market;
        require!(ctx.accounts.authority.key() == market.creator, MarketError::Unauthorized);
        require!(market.status == MarketStatus::Active, MarketError::MarketNotActive);
        require!(Clock::get()?.unix_timestamp >= market.end_time, MarketError::MarketNotExpired);
        
        market.outcome = outcome;
        market.status = MarketStatus::Resolved;

        msg!("Market resolved with outcome: {}", outcome);
        Ok(())
    }

    pub fn claim_winnings(ctx: Context<ClaimWinnings>) -> Result<()> {
        let market = &ctx.accounts.market;
        let position = &mut ctx.accounts.user_position;

        require!(market.status == MarketStatus::Resolved, MarketError::MarketNotResolved);
        require!(!position.claimed, MarketError::AlreadyClaimed);

        let winning_amount = if market.outcome {
            if position.yes_amount > 0 && market.yes_pool > 0 {
                ((position.yes_amount as u128) * (market.total_pool as u128) / (market.yes_pool as u128)) as u64
            } else {
                0
            }
        } else {
            if position.no_amount > 0 && market.no_pool > 0 {
                ((position.no_amount as u128) * (market.total_pool as u128) / (market.no_pool as u128)) as u64
            } else {
                0
            }
        };

        require!(winning_amount > 0, MarketError::NoWinnings);

        let cpi_accounts = Transfer {
            from: ctx.accounts.vault_usdc.to_account_info(),
            to: ctx.accounts.user_usdc.to_account_info(),
            authority: ctx.accounts.market.to_account_info(),
        };
        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);
        token::transfer(cpi_ctx, winning_amount)?;

        position.claimed = true;

        msg!("Winnings claimed: {}", winning_amount);
        Ok(())
    }
}

#[derive(Accounts)]
pub struct InitializeMarket<'info> {
    #[account(init, payer = creator, space = 8 + 32 + 256 + 8 + 1 + 8 + 8 + 8 + 1)]
    pub market: Account<'info, Market>,
    #[account(mut)]
    pub creator: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct PlaceBet<'info> {
    #[account(mut)]
    pub market: Account<'info, Market>,
    #[account(mut)]
    pub user: Signer<'info>,
    #[account(mut)]
    pub user_usdc: Account<'info, TokenAccount>,
    #[account(mut)]
    pub vault_usdc: Account<'info, TokenAccount>,
    #[account(init_if_needed, payer = user, space = 8 + 32 + 32 + 8 + 8 + 1)]
    pub user_position: Account<'info, UserPosition>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct ResolveMarket<'info> {
    #[account(mut)]
    pub market: Account<'info, Market>,
    pub authority: Signer<'info>,
}

#[derive(Accounts)]
pub struct ClaimWinnings<'info> {
    #[account(mut)]
    pub market: Account<'info, Market>,
    #[account(mut)]
    pub user: Signer<'info>,
    #[account(mut)]
    pub user_usdc: Account<'info, TokenAccount>,
    #[account(mut)]
    pub vault_usdc: Account<'info, TokenAccount>,
    #[account(mut)]
    pub user_position: Account<'info, UserPosition>,
    pub token_program: Program<'info, Token>,
}

#[account]
pub struct Market {
    pub creator: Pubkey,
    pub question: String,
    pub end_time: i64,
    pub status: MarketStatus,
    pub total_pool: u64,
    pub yes_pool: u64,
    pub no_pool: u64,
    pub outcome: bool,
}

#[account]
pub struct UserPosition {
    pub user: Pubkey,
    pub market: Pubkey,
    pub yes_amount: u64,
    pub no_amount: u64,
    pub claimed: bool,
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
}