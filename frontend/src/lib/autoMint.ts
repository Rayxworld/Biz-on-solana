import {
  Connection,
  Keypair,
  SystemProgram,
  Transaction,
  PublicKey,
} from "@solana/web3.js";
import {
  MINT_SIZE,
  TOKEN_PROGRAM_ID,
  createInitializeMintInstruction,
  getAssociatedTokenAddressSync,
  createAssociatedTokenAccountInstruction,
  createMintToInstruction,
} from "@solana/spl-token";

export async function createDummyMintAndAta(
  walletProvider: any,
  walletAddress: string
): Promise<{ mint: string; ata: string } | null> {
  try {
    const connection = new Connection("https://api.devnet.solana.com", "confirmed");
    const payer = new PublicKey(walletAddress);

    const mintKeypair = Keypair.generate();
    const lamports = await connection.getMinimumBalanceForRentExemption(MINT_SIZE);

    const ata = getAssociatedTokenAddressSync(mintKeypair.publicKey, payer);

    const transaction = new Transaction().add(
      SystemProgram.createAccount({
        fromPubkey: payer,
        newAccountPubkey: mintKeypair.publicKey,
        space: MINT_SIZE,
        lamports,
        programId: TOKEN_PROGRAM_ID,
      }),
      createInitializeMintInstruction(mintKeypair.publicKey, 6, payer, payer),
      createAssociatedTokenAccountInstruction(payer, ata, payer, mintKeypair.publicKey),
      // Mint 1,000,000 tokens (with 6 decimals) to the newly created ATA
      createMintToInstruction(mintKeypair.publicKey, ata, payer, 1_000_000 * 1_000_000)
    );

    const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = payer;

    // The Mint account signature is required to create a new token mint
    transaction.partialSign(mintKeypair);

    // Have the user sign the main transaction payload with Phantom
    const signedTx = await walletProvider.signTransaction(transaction);
    
    const rawTx = signedTx.serialize();
    const signature = await connection.sendRawTransaction(rawTx, {
      skipPreflight: false,
      preflightCommitment: "confirmed",
    });
    
    await connection.confirmTransaction({
      signature,
      blockhash,
      lastValidBlockHeight,
    });

    return {
      mint: mintKeypair.publicKey.toBase58(),
      ata: ata.toBase58(),
    };
  } catch (error) {
    console.error("Failed to auto-create mint and ATA:", error);
    return null;
  }
}
