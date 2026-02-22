import {
  Connection,
  PublicKey,
  Keypair,
  ParsedAccountData,
  Transaction,
  TransactionInstruction,
  AccountMeta,
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
const SPL_ASSOCIATED_TOKEN_PROGRAM = new PublicKey(
  "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"
);

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
  private programInitError: string | null = null;
  private warnedProgramInit = false;

  constructor() {
    this.connection = new Connection(config.solanaRpcUrl, "confirmed");
  }

  private getProgram(): Program {
    if (this.program) return this.program;
    if (this.programInitError) {
      throw new Error(this.programInitError);
    }

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

    // Support both Anchor constructor signatures:
    // - newer: new Program(idl, provider)
    // - older: new Program(idl, programId, provider)
    try {
      this.program = new (Program as any)(idlJson, provider);
    } catch {
      try {
        this.program = new (Program as any)(idlJson, PROGRAM_ID, provider);
      } catch (err: any) {
        this.programInitError = `Anchor program init failed. IDL may be incompatible with @coral-xyz/anchor ${err?.message ? `(${err.message})` : ""}`;
        throw new Error(this.programInitError);
      }
    }
    return this.program!;
  }

  async fetchMarketAccount(marketId: number): Promise<MarketData | null> {
    try {
      const program = this.getProgram();
      const [marketPDA] = deriveMarketPDA(marketId);
      const info = await this.connection.getAccountInfo(marketPDA, "confirmed");
      if (!info) return null;
      return this.decodeMarketAccount(program, info.data, marketPDA.toBase58());
    } catch (err: any) {
      this.logProgramInitWarningOnce();
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
      const info = await this.connection.getAccountInfo(positionPDA, "confirmed");
      if (!info) return null;
      return this.decodeUserPositionAccount(program, info.data);
    } catch {
      return null;
    }
  }

  async fetchAllMarkets(): Promise<MarketData[]> {
    try {
      const program = this.getProgram();
      const accounts = await this.connection.getProgramAccounts(PROGRAM_ID, {
        commitment: "confirmed",
      });
      const markets: MarketData[] = [];
      for (const acc of accounts) {
        const decoded = this.decodeMarketAccount(
          program,
          acc.account.data,
          acc.pubkey.toBase58()
        );
        if (decoded) markets.push(decoded);
      }
      return markets;
    } catch (err: any) {
      this.logProgramInitWarningOnce();
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

  deriveAssociatedTokenAddress(ownerPubkey: string, mint: string): string {
    const [ata] = PublicKey.findProgramAddressSync(
      [
        new PublicKey(ownerPubkey).toBuffer(),
        SPL_TOKEN_PROGRAM.toBuffer(),
        new PublicKey(mint).toBuffer(),
      ],
      SPL_ASSOCIATED_TOKEN_PROGRAM
    );
    return ata.toBase58();
  }

  async buildCreateAtaTransaction(params: {
    ownerPubkey: string;
    mint: string;
  }): Promise<{ transaction: string; ata: string; alreadyExists: boolean }> {
    const owner = new PublicKey(params.ownerPubkey);
    const mint = new PublicKey(params.mint);
    const ata = new PublicKey(this.deriveAssociatedTokenAddress(params.ownerPubkey, params.mint));

    const existing = await this.connection.getAccountInfo(ata, "confirmed");
    if (existing) {
      return { transaction: "", ata: ata.toBase58(), alreadyExists: true };
    }

    const createAtaIx = new TransactionInstruction({
      programId: SPL_ASSOCIATED_TOKEN_PROGRAM,
      keys: [
        { pubkey: owner, isSigner: true, isWritable: true },
        { pubkey: ata, isSigner: false, isWritable: true },
        { pubkey: owner, isSigner: false, isWritable: false },
        { pubkey: mint, isSigner: false, isWritable: false },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
        { pubkey: SPL_TOKEN_PROGRAM, isSigner: false, isWritable: false },
        { pubkey: SYSVAR_RENT_PUBKEY, isSigner: false, isWritable: false },
      ],
      data: Buffer.alloc(0),
    });

    const tx = new Transaction().add(createAtaIx);
    tx.feePayer = owner;
    const { blockhash } = await this.connection.getLatestBlockhash("confirmed");
    tx.recentBlockhash = blockhash;

    return {
      transaction: tx.serialize({ requireAllSignatures: false }).toString("base64"),
      ata: ata.toBase58(),
      alreadyExists: false,
    };
  }

  async buildInitializeMarketTransaction(params: {
    marketId: number;
    creatorPubkey: string;
    creatorUsdcAta: string;
    usdcMint: string;
    question: string;
    durationSeconds: number;
    creationFeeMicroUsdc: number;
    feeCollectorAta: string;
  }): Promise<{ transaction: string; marketAddress: string }> {
    const program = this.getProgram();
    const creator = new PublicKey(params.creatorPubkey);
    const creatorUsdcAta = new PublicKey(params.creatorUsdcAta);
    const usdcMint = new PublicKey(params.usdcMint);
    const feeCollectorAta = new PublicKey(params.feeCollectorAta);
    const [marketPDA] = deriveMarketPDA(params.marketId);
    const [vaultAuthority] = deriveVaultAuthorityPDA(params.marketId);
    const [vaultUsdc] = deriveVaultPDA(params.marketId);

    const tx = await program.methods
      .initializeMarket(
        new BN(params.marketId),
        params.question,
        new BN(params.durationSeconds)
      )
      .accounts({
        market: marketPDA,
        vaultAuthority,
        vaultUsdc,
        usdcMint,
        creator,
        tokenProgram: SPL_TOKEN_PROGRAM,
        systemProgram: SystemProgram.programId,
        rent: SYSVAR_RENT_PUBKEY,
      })
      .transaction();

    if (params.creationFeeMicroUsdc > 0) {
      const feeIx = buildSplTransferInstruction({
        source: creatorUsdcAta,
        destination: feeCollectorAta,
        owner: creator,
        amount: params.creationFeeMicroUsdc,
      });
      tx.instructions.unshift(feeIx);
    }

    tx.feePayer = creator;
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
  ):
    | { ok: true; amount: number; marketAddress: string; userUsdcAta: string }
    | { ok: false; reason: string } {
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
    if (!ix.keys[0]?.pubkey || !ix.keys[2]?.pubkey) {
      return { ok: false, reason: "Instruction missing required market/userUsdc accounts" };
    }
    const decoded = decodePlaceBetInstruction(ix);
    if (!decoded.ok) return decoded;
    return {
      ok: true,
      amount: decoded.amount,
      marketAddress: ix.keys[0].pubkey.toBase58(),
      userUsdcAta: ix.keys[2].pubkey.toBase58(),
    };
  }

  verifySignedCreateAtaTransaction(params: {
    signedTxBase64: string;
    expectedUserPubkey: string;
    expectedMint: string;
  }): { ok: true; ata: string } | { ok: false; reason: string } {
    let tx: Transaction;
    try {
      tx = Transaction.from(Buffer.from(params.signedTxBase64, "base64"));
    } catch {
      return { ok: false, reason: "Invalid signed transaction payload" };
    }

    const expectedUser = new PublicKey(params.expectedUserPubkey);
    const expectedMint = new PublicKey(params.expectedMint);
    const expectedAta = new PublicKey(
      this.deriveAssociatedTokenAddress(params.expectedUserPubkey, params.expectedMint)
    );

    if (!tx.feePayer || !tx.feePayer.equals(expectedUser)) {
      return { ok: false, reason: "Fee payer does not match submitting wallet" };
    }

    const walletSig = tx.signatures.find((sig) => sig.publicKey.equals(expectedUser));
    if (!walletSig?.signature) {
      return { ok: false, reason: "Submitting wallet signature is missing" };
    }

    const createIx = tx.instructions.find(
      (ix) =>
        ix.programId.equals(SPL_ASSOCIATED_TOKEN_PROGRAM) &&
        ix.keys[1]?.pubkey &&
        ix.keys[2]?.pubkey &&
        ix.keys[3]?.pubkey &&
        ix.keys[1].pubkey.equals(expectedAta) &&
        ix.keys[2].pubkey.equals(expectedUser) &&
        ix.keys[3].pubkey.equals(expectedMint)
    );

    if (!createIx) {
      return { ok: false, reason: "No valid associated token account creation instruction found" };
    }

    return { ok: true, ata: expectedAta.toBase58() };
  }

  verifySignedInitializeMarketTransaction(params: {
    signedTxBase64: string;
    expectedCreatorPubkey: string;
    expectedFeeCollectorAta: string;
    minCreationFeeMicroUsdc: number;
  }):
    | {
        ok: true;
        marketAddress: string;
        creatorUsdcAta: string;
        feeAmount: number;
      }
    | { ok: false; reason: string } {
    let tx: Transaction;
    try {
      tx = Transaction.from(Buffer.from(params.signedTxBase64, "base64"));
    } catch {
      return { ok: false, reason: "Invalid signed transaction payload" };
    }

    const expectedCreator = new PublicKey(params.expectedCreatorPubkey);
    if (!tx.feePayer || !tx.feePayer.equals(expectedCreator)) {
      return { ok: false, reason: "Fee payer does not match creator wallet" };
    }

    const creatorSig = tx.signatures.find((s) => s.publicKey.equals(expectedCreator));
    if (!creatorSig?.signature) {
      return { ok: false, reason: "Creator signature missing" };
    }

    const initIx = tx.instructions.find((ix) => ix.programId.equals(PROGRAM_ID));
    if (!initIx) return { ok: false, reason: "No market initialize instruction found" };
    if (!initIx.data || initIx.data.length < 8) {
      return { ok: false, reason: "Initialize instruction data invalid" };
    }
    const expectedDisc = anchorDiscriminator("initialize_market");
    if (!initIx.data.subarray(0, 8).equals(expectedDisc)) {
      return { ok: false, reason: "Program instruction is not initialize_market" };
    }

    const marketAddress = initIx.keys[0]?.pubkey?.toBase58?.() || "";

    if (params.minCreationFeeMicroUsdc <= 0) {
      return {
        ok: true,
        marketAddress,
        creatorUsdcAta: "",
        feeAmount: 0,
      };
    }

    const feeCheck = verifyFeeTransferInTx({
      tx,
      expectedOwner: expectedCreator,
      expectedDestination: new PublicKey(params.expectedFeeCollectorAta),
      minAmount: params.minCreationFeeMicroUsdc,
    });
    if (!feeCheck.ok) return { ok: false, reason: feeCheck.reason };

    return {
      ok: true,
      marketAddress,
      creatorUsdcAta: feeCheck.source.toBase58(),
      feeAmount: feeCheck.amount,
    };
  }

  async precheckUserUsdcAta(
    marketId: number,
    userPubkey: string,
    userUsdcAta: string
  ): Promise<{
    ok: boolean;
    reason?: string;
    details?: {
      owner: string;
      mint: string;
      expectedOwner: string;
      expectedMint: string;
      amountUi: number;
    };
  }> {
    const [marketPda] = deriveMarketPDA(marketId);
    return this.precheckUserUsdcAtaForMarketAddress(
      marketPda.toBase58(),
      userPubkey,
      userUsdcAta
    );
  }

  async precheckUserUsdcAtaForMint(params: {
    userPubkey: string;
    userUsdcAta: string;
    expectedMint: string;
  }): Promise<{
    ok: boolean;
    reason?: string;
    details?: {
      owner: string;
      mint: string;
      expectedOwner: string;
      expectedMint: string;
      amountUi: number;
    };
  }> {
    try {
      const ataPubkey = new PublicKey(params.userUsdcAta);
      const parsed = await this.connection.getParsedAccountInfo(ataPubkey, "confirmed");
      const parsedData = parsed.value?.data as ParsedAccountData | Buffer | undefined;
      if (!parsed.value || !parsedData || !("parsed" in parsedData)) {
        return { ok: false, reason: "Provided userUsdcAta is not a valid SPL token account" };
      }
      const info = parsedData.parsed?.info as any;
      const owner = String(info?.owner || "");
      const mint = String(info?.mint || "");
      const amountUi = Number(info?.tokenAmount?.uiAmount || 0);
      const expectedOwner = params.userPubkey;
      const expectedMint = params.expectedMint;

      if (owner !== expectedOwner) {
        return {
          ok: false,
          reason: "Invalid token owner: ATA owner does not match submitting wallet",
          details: { owner, mint, expectedOwner, expectedMint, amountUi },
        };
      }
      if (mint !== expectedMint) {
        return {
          ok: false,
          reason: "Invalid token mint: ATA mint does not match required mint",
          details: { owner, mint, expectedOwner, expectedMint, amountUi },
        };
      }
      return { ok: true, details: { owner, mint, expectedOwner, expectedMint, amountUi } };
    } catch (err: any) {
      return { ok: false, reason: err?.message || "ATA precheck failed" };
    }
  }

  async precheckUserUsdcAtaForMarketAddress(
    marketAddress: string,
    userPubkey: string,
    userUsdcAta: string
  ): Promise<{
    ok: boolean;
    reason?: string;
    details?: {
      owner: string;
      mint: string;
      expectedOwner: string;
      expectedMint: string;
      amountUi: number;
    };
  }> {
    try {
      const program = this.getProgram();
      const marketRaw = await this.decodeMarketRawByAddress(program, marketAddress);
      if (!marketRaw) return { ok: false, reason: "Market account not found or invalid" };

      const ataPubkey = new PublicKey(userUsdcAta);
      const parsed = await this.connection.getParsedAccountInfo(ataPubkey, "confirmed");
      const parsedData = parsed.value?.data as ParsedAccountData | Buffer | undefined;

      if (!parsed.value || !parsedData || !("parsed" in parsedData)) {
        return { ok: false, reason: "Provided userUsdcAta is not a valid SPL token account" };
      }

      const info = parsedData.parsed?.info as any;
      const owner = String(info?.owner || "");
      const mint = String(info?.mint || "");
      const amountUi = Number(info?.tokenAmount?.uiAmount || 0);
      const expectedOwner = userPubkey;
      const expectedMint = toBase58((marketRaw as any).usdcMint);

      if (owner !== expectedOwner) {
        return {
          ok: false,
          reason: "Invalid token owner: ATA owner does not match submitting wallet",
          details: { owner, mint, expectedOwner, expectedMint, amountUi },
        };
      }
      if (mint !== expectedMint) {
        return {
          ok: false,
          reason: "Invalid token mint: ATA mint does not match market mint",
          details: { owner, mint, expectedOwner, expectedMint, amountUi },
        };
      }

      return {
        ok: true,
        details: { owner, mint, expectedOwner, expectedMint, amountUi },
      };
    } catch (err: any) {
      return { ok: false, reason: err?.message || "ATA precheck failed" };
    }
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

  private decodeMarketAccount(
    program: Program,
    data: Buffer,
    address: string
  ): MarketData | null {
    const coderAccounts = (program.coder as any)?.accounts;
    if (!coderAccounts?.decode) return null;

    let raw: MarketAccount | null = null;
    try {
      raw = coderAccounts.decode("Market", data) as MarketAccount;
    } catch {
      try {
        raw = coderAccounts.decode("market", data) as MarketAccount;
      } catch {
        return null;
      }
    }
    if (!raw) return null;

    const now = Math.floor(Date.now() / 1000);
    const totalPool = toNumeric(raw.totalPool);
    const yesPool = toNumeric(raw.yesPool);
    const noPool = toNumeric(raw.noPool);
    const endTime = toNumeric(raw.endTime);

    return {
      address,
      marketId: toNumeric(raw.marketId),
      creator: toBase58(raw.creator),
      usdcMint: toBase58(raw.usdcMint),
      question: raw.question,
      endTime,
      isActive: "active" in raw.status,
      totalPool,
      yesPool,
      noPool,
      yesOdds: totalPool > 0 ? yesPool / totalPool : 0.5,
      noOdds: totalPool > 0 ? noPool / totalPool : 0.5,
      outcome: raw.outcome,
      timeRemaining: Math.max(0, endTime - now),
    };
  }

  private async decodeMarketRawByAddress(
    program: Program,
    address: string
  ): Promise<MarketAccount | null> {
    const info = await this.connection.getAccountInfo(new PublicKey(address), "confirmed");
    if (!info) return null;
    const coderAccounts = (program.coder as any)?.accounts;
    if (!coderAccounts?.decode) return null;
    try {
      return coderAccounts.decode("Market", info.data) as MarketAccount;
    } catch {
      try {
        return coderAccounts.decode("market", info.data) as MarketAccount;
      } catch {
        return null;
      }
    }
  }

  private decodeUserPositionAccount(
    program: Program,
    data: Buffer
  ): UserPosition | null {
    const coderAccounts = (program.coder as any)?.accounts;
    if (!coderAccounts?.decode) return null;

    let raw: UserPosition | null = null;
    try {
      raw = coderAccounts.decode("UserPosition", data) as UserPosition;
    } catch {
      try {
        raw = coderAccounts.decode("userPosition", data) as UserPosition;
      } catch {
        return null;
      }
    }
    if (!raw) return null;

    return {
      user: toBase58(raw.user),
      market: toBase58(raw.market),
      yesAmount: toNumeric(raw.yesAmount),
      noAmount: toNumeric(raw.noAmount),
      claimed: raw.claimed,
      bump: raw.bump,
    };
  }

  private logProgramInitWarningOnce(): void {
    if (this.warnedProgramInit || !this.programInitError) return;
    this.warnedProgramInit = true;
    console.warn(
      "On-chain reads are degraded due to IDL/program init failure. " +
        "Regenerate contracts/target/idl/bizfi_market.json from the current Anchor build."
    );
  }
}

function toNumeric(value: unknown): number {
  if (typeof value === "number") return value;
  if (typeof value === "bigint") return Number(value);
  if (value instanceof BN) return Number(value.toString());
  if (value && typeof value === "object") {
    const maybe = value as { toString?: () => string };
    if (typeof maybe.toString === "function") {
      const parsed = Number(maybe.toString());
      if (Number.isFinite(parsed)) return parsed;
    }
  }
  return 0;
}

function toBase58(value: unknown): string {
  if (typeof value === "string") return value;
  if (value instanceof PublicKey) return value.toBase58();
  if (value && typeof value === "object") {
    const maybe = value as { toBase58?: () => string; toString?: () => string };
    if (typeof maybe.toBase58 === "function") return maybe.toBase58();
    if (typeof maybe.toString === "function") return maybe.toString();
  }
  return "";
}

function anchorDiscriminator(name: string): Buffer {
  return createHash("sha256").update(`global:${name}`).digest().subarray(0, 8);
}

function buildSplTransferInstruction(params: {
  source: PublicKey;
  destination: PublicKey;
  owner: PublicKey;
  amount: number;
}): TransactionInstruction {
  const data = Buffer.alloc(9);
  data.writeUInt8(3, 0); // TokenInstruction::Transfer
  data.writeBigUInt64LE(BigInt(params.amount), 1);
  const keys: AccountMeta[] = [
    { pubkey: params.source, isSigner: false, isWritable: true },
    { pubkey: params.destination, isSigner: false, isWritable: true },
    { pubkey: params.owner, isSigner: true, isWritable: false },
  ];
  return new TransactionInstruction({
    programId: SPL_TOKEN_PROGRAM,
    keys,
    data,
  });
}

function verifyFeeTransferInTx(params: {
  tx: Transaction;
  expectedOwner: PublicKey;
  expectedDestination: PublicKey;
  minAmount: number;
}):
  | { ok: true; source: PublicKey; amount: number }
  | { ok: false; reason: string } {
  for (const ix of params.tx.instructions) {
    if (!ix.programId.equals(SPL_TOKEN_PROGRAM) || !ix.data || ix.data.length < 9) continue;
    const tag = ix.data.readUInt8(0);
    if (tag !== 3) continue; // Transfer only
    const amount = Number(ix.data.readBigUInt64LE(1));
    const source = ix.keys[0]?.pubkey;
    const destination = ix.keys[1]?.pubkey;
    const owner = ix.keys[2]?.pubkey;
    if (!source || !destination || !owner) continue;

    if (
      destination.equals(params.expectedDestination) &&
      owner.equals(params.expectedOwner) &&
      amount >= params.minAmount
    ) {
      return { ok: true, source, amount };
    }
  }
  return {
    ok: false,
    reason: "Missing required creation fee transfer to collector ATA",
  };
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
