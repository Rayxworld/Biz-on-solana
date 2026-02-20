import {
  Connection,
  PublicKey,
  Keypair,
  Transaction,
  TransactionInstruction,
  SystemProgram,
  SYSVAR_RENT_PUBKEY,
} from "@solana/web3.js";
import { Program, AnchorProvider, Wallet, BN, Idl } from "@coral-xyz/anchor";
import { createHash } from "crypto";
import fs from "fs";
import { config } from "../config/index.js";
import type { MarketAccount, MarketData, UserPosition } from "../types/market.js";

const IDL_PATH = config.solanaIdlPath;
const PROGRAM_ID = new PublicKey(config.programId);
const SPL_TOKEN_PROGRAM = new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA");

function marketIdToLeBytes(marketId: number): Buffer {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64LE(BigInt(marketId));
  return buf;
}

export function deriveMarketPDA(marketId: number): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("market"), marketIdToLeBytes(marketId)],
    PROGRAM_ID
  );
}

export function deriveVaultAuthorityPDA(marketId: number): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("vault_authority"), marketIdToLeBytes(marketId)],
    PROGRAM_ID
  );
}

export function deriveVaultPDA(marketId: number): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("vault"), marketIdToLeBytes(marketId)],
    PROGRAM_ID
  );
}

export function deriveUserPositionPDA(
  marketId: number,
  userPubkey: PublicKey
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("position"), marketIdToLeBytes(marketId), userPubkey.toBuffer()],
    PROGRAM_ID
  );
}

export class SolanaClient {
  public connection: Connection;
  private program: Program | null = null;

  constructor() {
    this.connection = new Connection(config.solanaRpcUrl, "confirmed");
  }

  private getProgram(): Program {
    if (this.program) return this.program;

    if (!fs.existsSync(IDL_PATH)) {
      throw new Error(`IDL file not found at ${IDL_PATH}`);
    }

    const idlJson = JSON.parse(fs.readFileSync(IDL_PATH, "utf-8")) as Idl & {
      address?: string;
    };
    idlJson.address = PROGRAM_ID.toBase58();
    const dummyKeypair = Keypair.generate();
    const wallet = new Wallet(dummyKeypair);
    const provider = new AnchorProvider(this.connection, wallet, {
      commitment: "confirmed",
    });

    this.program = new Program(idlJson, provider) as any;
    return this.program!;
  }

  async fetchMarketAccount(marketId: number): Promise<MarketData | null> {
    try {
      const program = this.getProgram();
      const [marketPDA] = deriveMarketPDA(marketId);
      const account = await (program.account as any).market.fetch(marketPDA);
      const raw = account as unknown as MarketAccount;

      const now = Math.floor(Date.now() / 1000);
      const totalPool = raw.totalPool;
      const yesPool = raw.yesPool;
      const noPool = raw.noPool;

      return {
        address: marketPDA.toBase58(),
        marketId: raw.marketId,
        creator: raw.creator,
        question: raw.question,
        endTime: raw.endTime,
        isActive: "active" in raw.status,
        totalPool,
        yesPool,
        noPool,
        yesOdds: totalPool > 0 ? yesPool / totalPool : 0.5,
        noOdds: totalPool > 0 ? noPool / totalPool : 0.5,
        outcome: raw.outcome,
        timeRemaining: Math.max(0, raw.endTime - now),
      };
    } catch (err: any) {
      console.error(`Failed to fetch market ${marketId}:`, err.message);
      return null;
    }
  }

  async fetchUserPosition(
    marketId: number,
    userPubkey: string
  ): Promise<UserPosition | null> {
    try {
      const program = this.getProgram();
      const user = new PublicKey(userPubkey);
      const [positionPDA] = deriveUserPositionPDA(marketId, user);

      const account = await (program.account as any).userPosition.fetch(positionPDA);
      const raw = account as unknown as UserPosition;

      return {
        user: raw.user,
        market: raw.market,
        yesAmount: raw.yesAmount,
        noAmount: raw.noAmount,
        claimed: raw.claimed,
        bump: raw.bump,
      };
    } catch {
      return null;
    }
  }

  async fetchAllMarkets(): Promise<MarketData[]> {
    try {
      const program = this.getProgram();
      const accounts = await (program.account as any).market.all();
      const now = Math.floor(Date.now() / 1000);

      return accounts.map((acc: any) => {
        const raw = acc.account as unknown as MarketAccount;
        const totalPool = raw.totalPool;
        const yesPool = raw.yesPool;
        const noPool = raw.noPool;

        return {
          address: acc.publicKey.toBase58(),
          marketId: raw.marketId,
          creator: raw.creator,
          question: raw.question,
          endTime: raw.endTime,
          isActive: "active" in raw.status,
          totalPool,
          yesPool,
          noPool,
          yesOdds: totalPool > 0 ? yesPool / totalPool : 0.5,
          noOdds: totalPool > 0 ? noPool / totalPool : 0.5,
          outcome: raw.outcome,
          timeRemaining: Math.max(0, raw.endTime - now),
        };
      });
    } catch (err: any) {
      console.error("Failed to fetch markets:", err.message);
      return [];
    }
  }

  async buildPlaceBetTransaction(
    marketId: number,
    userPubkey: string,
    userUsdcAta: string,
    amount: number,
    betOnYes: boolean
  ): Promise<{ transaction: string; marketAddress: string }> {
    const program = this.getProgram();
    const user = new PublicKey(userPubkey);
    const [marketPDA] = deriveMarketPDA(marketId);
    const [vaultAuthority] = deriveVaultAuthorityPDA(marketId);
    const [vaultUsdc] = deriveVaultPDA(marketId);
    const [userPosition] = deriveUserPositionPDA(marketId, user);

    const tx = await program.methods
      .placeBet(new BN(amount), betOnYes)
      .accounts({
        market: marketPDA,
        user,
        userUsdc: new PublicKey(userUsdcAta),
        vaultAuthority,
        vaultUsdc,
        userPosition,
        tokenProgram: SPL_TOKEN_PROGRAM,
        systemProgram: SystemProgram.programId,
        rent: SYSVAR_RENT_PUBKEY,
      })
      .transaction();

    tx.feePayer = user;
    const { blockhash } = await this.connection.getLatestBlockhash("confirmed");
    tx.recentBlockhash = blockhash;

    return {
      transaction: tx.serialize({ requireAllSignatures: false }).toString("base64"),
      marketAddress: marketPDA.toBase58(),
    };
  }

  async submitSignedTransaction(signedTxBase64: string): Promise<string> {
    const buffer = Buffer.from(signedTxBase64, "base64");
    const tx = Transaction.from(buffer);

    const signature = await this.connection.sendRawTransaction(tx.serialize(), {
      skipPreflight: false,
      preflightCommitment: "confirmed",
    });

    await this.connection.confirmTransaction(signature, "confirmed");
    return signature;
  }

  verifySignedPlaceBetTransaction(
    signedTxBase64: string,
    expectedUserPubkey: string
  ): { ok: true; amount: number } | { ok: false; reason: string } {
    let tx: Transaction;
    try {
      tx = Transaction.from(Buffer.from(signedTxBase64, "base64"));
    } catch {
      return { ok: false, reason: "Invalid signed transaction payload" };
    }

    const expectedUser = new PublicKey(expectedUserPubkey);

    if (!tx.feePayer || !tx.feePayer.equals(expectedUser)) {
      return { ok: false, reason: "Fee payer does not match submitting wallet" };
    }

    const walletSig = tx.signatures.find((sig) => sig.publicKey.equals(expectedUser));
    if (!walletSig?.signature) {
      return { ok: false, reason: "Submitting wallet signature is missing" };
    }

    const ix = tx.instructions.find((instruction) =>
      instruction.programId.equals(PROGRAM_ID)
    );
    if (!ix) {
      return { ok: false, reason: "No instruction found for configured program ID" };
    }

    return decodePlaceBetInstruction(ix);
  }

  async getTransactionHistory(address: string, limit = 20): Promise<any[]> {
    try {
      const pubkey = new PublicKey(address);
      const signatures = await this.connection.getSignaturesForAddress(pubkey, {
        limit,
      });

      return signatures.map((sig) => ({
        signature: sig.signature,
        slot: sig.slot,
        blockTime: sig.blockTime,
        err: sig.err,
        memo: sig.memo,
      }));
    } catch (err: any) {
      console.error("Failed to fetch tx history:", err.message);
      return [];
    }
  }

  async getProgramStatus(): Promise<{
    programId: string;
    exists: boolean;
    executable?: boolean;
    lamports?: number;
  }> {
    try {
      const info = await this.connection.getAccountInfo(PROGRAM_ID);
      if (!info) {
        return { programId: PROGRAM_ID.toBase58(), exists: false };
      }
      return {
        programId: PROGRAM_ID.toBase58(),
        exists: true,
        executable: info.executable,
        lamports: info.lamports,
      };
    } catch {
      return { programId: PROGRAM_ID.toBase58(), exists: false };
    }
  }

  async getStartupChecks(): Promise<{
    idlPath: string;
    idlExists: boolean;
    programIdConfigured: boolean;
    program: {
      exists: boolean;
      executable?: boolean;
      lamports?: number;
    };
  }> {
    const program = await this.getProgramStatus();
    return {
      idlPath: IDL_PATH,
      idlExists: fs.existsSync(IDL_PATH),
      programIdConfigured: Boolean(config.programId),
      program: {
        exists: program.exists,
        executable: program.executable,
        lamports: program.lamports,
      },
    };
  }
}

function anchorDiscriminator(name: string): Buffer {
  return createHash("sha256").update(`global:${name}`).digest().subarray(0, 8);
}

function decodePlaceBetInstruction(
  ix: TransactionInstruction
): { ok: true; amount: number } | { ok: false; reason: string } {
  if (ix.data.length < 17) {
    return { ok: false, reason: "Instruction data too short for place_bet" };
  }

  const discriminator = ix.data.subarray(0, 8);
  const placeBetDisc = anchorDiscriminator("place_bet");

  if (!discriminator.equals(placeBetDisc)) {
    return { ok: false, reason: "Program instruction is not place_bet" };
  }

  const amount = Number(ix.data.readBigUInt64LE(8));
  if (!Number.isFinite(amount) || amount <= 0) {
    return { ok: false, reason: "Decoded place_bet amount is invalid" };
  }

  return { ok: true, amount };
}

export const solanaClient = new SolanaClient();
