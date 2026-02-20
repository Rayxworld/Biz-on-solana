# PDA Specification

## Seed Rules
Use these exact seeds:

1. Market PDA
- Label: `market`
- Seeds: `["market", market_id]`
- Encoding:
  - `"market"` as bytes
  - `market_id` as `u64` little-endian 8 bytes (`to_le_bytes()`)

2. User Position PDA
- Label: `position`
- Seeds: `["position", market_id, user_pubkey]`
- Encoding:
  - `"position"` as bytes
  - `market_id` as `u64` little-endian 8 bytes (`to_le_bytes()`)
  - `user_pubkey` as 32-byte pubkey

3. Vault PDA
- Label: `vault`
- Seeds: `["vault", market_id]`
- Encoding:
  - `"vault"` as bytes
  - `market_id` as `u64` little-endian 8 bytes (`to_le_bytes()`)

4. Vault Authority PDA
- Label: `vault_authority`
- Seeds: `["vault_authority", market_id]`
- Encoding:
  - `"vault_authority"` as bytes
  - `market_id` as `u64` little-endian 8 bytes (`to_le_bytes()`)

## Copy-Paste Reference
```rust
let market_id_le = market_id.to_le_bytes();

// Market PDA
let (market_pda, market_bump) = Pubkey::find_program_address(
    &[b"market", market_id_le.as_ref()],
    &program_id,
);

// Position PDA
let (position_pda, position_bump) = Pubkey::find_program_address(
    &[b"position", market_id_le.as_ref(), user_pubkey.as_ref()],
    &program_id,
);

// Vault PDA
let (vault_pda, vault_bump) = Pubkey::find_program_address(
    &[b"vault", market_id_le.as_ref()],
    &program_id,
);

// Vault authority PDA
let (vault_authority_pda, vault_authority_bump) = Pubkey::find_program_address(
    &[b"vault_authority", market_id_le.as_ref()],
    &program_id,
);
```

## Bump Handling
- Store bumps on account where needed.
- Use signer seeds for PDA-authorized token transfers:
```rust
let signer_seeds: &[&[u8]] = &[
    b"vault_authority",
    market_id.to_le_bytes().as_ref(),
    &[vault_authority_bump],
];
```

## Final Confirmation
- Program ID used for PDA derivation: `5JUtUiusEUzwgub1LTztjGJ1h2krpzqBaVfQrEHHwJbr`
- Seed schema version: `v2-u64-le`
