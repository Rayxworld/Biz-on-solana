use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};

declare_id!("BizFunMarket1111111111111111111111111111111");

#[program]
pub mod biz_fun_market {
    use super::*;

    pub fn initialize_market(
        ctx: Context<InitializeMarket>,
        question: String,
        duration: i64,
    ) -> Result<()> {
        let market = &mut ctx.accounts.market;
        market.creator = ctx.accounts.creator.key();
        market.question = question;
        market.end_time = Clock::get()?.unix_timestamp + duration;
        market.status = MarketStatus::Active;
        market.total_pool = 0;
        Ok(())
    }

    pub fn deposit_usdc(ctx: Context<DepositUsdc>, amount: u64) -> Result<()> {
        let market = &mut ctx.accounts.market;
        require!(market.status == MarketStatus::Active, MarketError::MarketNotActive);

        // Perform CPI to transfer USDC from user to market vault
        let cpi_accounts = Transfer {
            from: ctx.accounts.user_usdc.to_account_info(),
            to: ctx.accounts.vault_usdc.to_account_info(),
            authority: ctx.accounts.user.to_account_info(),
        };
        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);
        token::transfer(cpi_ctx, amount)?;

        market.total_pool += amount;
        Ok(())
    }

    pub fn resolve_market(ctx: Context<ResolveMarket>, outcome: bool) -> Result<()> {
        let market = &mut ctx.accounts.market;
        require!(ctx.accounts.authority.key() == market.creator, MarketError::Unauthorized);
        
        market.outcome = outcome;
        market.status = MarketStatus::Resolved;
        Ok(())
    }
}

#[derive(Accounts)]
pub struct InitializeMarket<'info> {
    #[account(init, payer = creator, space = 8 + 32 + 256 + 8 + 1 + 8 + 1)]
    pub market: Account<'info, Market>,
    #[account(mut)]
    pub creator: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct DepositUsdc<'info> {
    #[account(mut)]
    pub market: Account<'info, Market>,
    #[account(mut)]
    pub user: Signer<'info>,
    #[account(mut)]
    pub user_usdc: Account<'info, TokenAccount>,
    #[account(mut)]
    pub vault_usdc: Account<'info, TokenAccount>,
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct ResolveMarket<'info> {
    #[account(mut)]
    pub market: Account<'info, Market>,
    pub authority: Signer<'info>,
}

#[account]
pub struct Market {
    pub creator: Pubkey,
    pub question: String,
    pub end_time: i64,
    pub status: MarketStatus,
    pub total_pool: u64,
    pub outcome: bool,
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
}
