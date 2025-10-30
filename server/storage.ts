// Database storage implementation - see blueprints javascript_log_in_with_replit and javascript_database
import {
  users,
  words,
  shareHoldings,
  transactions,
  receipts,
  type User,
  type UpsertUser,
  type Word,
  type InsertWord,
  type ShareHolding,
  type Transaction,
  type Receipt,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, sql } from "drizzle-orm";

export interface IStorage {
  // User operations (mandatory for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  updateUserBalance(userId: string, newBalance: string): Promise<void>;
  updateUserLogin(userId: string): Promise<void>;
  updateUserEarnings(userId: string, earnings: string): Promise<void>;
  getTopTraders(limit: number): Promise<Array<User & { rank: number }>>;
  
  // Word operations
  createWord(word: InsertWord): Promise<Word>;
  getWord(id: string): Promise<Word | undefined>;
  getWordByNormalizedText(text: string): Promise<Word | undefined>;
  getTopWords(limit: number): Promise<Word[]>;
  getAllWords(): Promise<Word[]>;
  updateWordPrice(id: string, currentPrice: string): Promise<void>;
  updateWordShares(id: string, sharesOutstanding: number): Promise<void>;
  
  // ShareHolding operations
  getShareHolding(userId: string, wordId: string): Promise<ShareHolding | undefined>;
  createShareHolding(userId: string, wordId: string, quantity: number, costBasis: string): Promise<ShareHolding>;
  updateShareHolding(id: string, quantity: number, costBasis: string): Promise<void>;
  getUserPortfolio(userId: string): Promise<ShareHolding[]>;
  getWordHolders(wordId: string): Promise<ShareHolding[]>;
  
  // Transaction operations
  createTransaction(transaction: Omit<typeof transactions.$inferInsert, 'id'>): Promise<Transaction>;
  getUserTransactions(userId: string, limit: number): Promise<Transaction[]>;
  
  // Receipt operations
  createReceipt(transactionId: string, receiptData: any): Promise<Receipt>;
  getReceipt(transactionId: string): Promise<Receipt | undefined>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  async updateUserBalance(userId: string, newBalance: string): Promise<void> {
    await db
      .update(users)
      .set({ wbBalance: newBalance, updatedAt: new Date() })
      .where(eq(users.id, userId));
  }

  async updateUserLogin(userId: string): Promise<void> {
    await db
      .update(users)
      .set({ lastLogin: new Date(), updatedAt: new Date() })
      .where(eq(users.id, userId));
  }

  async updateUserEarnings(userId: string, earnings: string): Promise<void> {
    await db
      .update(users)
      .set({ totalEarnings: earnings, updatedAt: new Date() })
      .where(eq(users.id, userId));
  }

  async getTopTraders(limit: number): Promise<Array<User & { rank: number }>> {
    const result = await db
      .select()
      .from(users)
      .orderBy(desc(users.totalEarnings))
      .limit(limit);
    
    return result.map((user, index) => ({
      ...user,
      rank: index + 1,
    }));
  }

  // Word operations
  async createWord(word: InsertWord): Promise<Word> {
    const [created] = await db
      .insert(words)
      .values(word)
      .returning();
    return created;
  }

  async getWord(id: string): Promise<Word | undefined> {
    const [word] = await db.select().from(words).where(eq(words.id, id));
    return word;
  }

  async getWordByNormalizedText(text: string): Promise<Word | undefined> {
    const [word] = await db.select().from(words).where(eq(words.textNormalized, text));
    return word;
  }

  async getTopWords(limit: number): Promise<Word[]> {
    return await db
      .select()
      .from(words)
      .orderBy(desc(words.currentPrice))
      .limit(limit);
  }

  async getAllWords(): Promise<Word[]> {
    return await db.select().from(words);
  }

  async updateWordPrice(id: string, currentPrice: string): Promise<void> {
    await db
      .update(words)
      .set({ currentPrice, updatedAt: new Date() })
      .where(eq(words.id, id));
  }

  async updateWordShares(id: string, sharesOutstanding: number): Promise<void> {
    await db
      .update(words)
      .set({ sharesOutstanding, updatedAt: new Date() })
      .where(eq(words.id, id));
  }

  // ShareHolding operations
  async getShareHolding(userId: string, wordId: string): Promise<ShareHolding | undefined> {
    const [holding] = await db
      .select()
      .from(shareHoldings)
      .where(and(eq(shareHoldings.userId, userId), eq(shareHoldings.wordId, wordId)));
    return holding;
  }

  async createShareHolding(userId: string, wordId: string, quantity: number, costBasis: string): Promise<ShareHolding> {
    const [holding] = await db
      .insert(shareHoldings)
      .values({ userId, wordId, quantity, costBasis })
      .returning();
    return holding;
  }

  async updateShareHolding(id: string, quantity: number, costBasis: string): Promise<void> {
    await db
      .update(shareHoldings)
      .set({ quantity, costBasis, updatedAt: new Date() })
      .where(eq(shareHoldings.id, id));
  }

  async getUserPortfolio(userId: string): Promise<ShareHolding[]> {
    return await db
      .select()
      .from(shareHoldings)
      .where(eq(shareHoldings.userId, userId));
  }

  async getWordHolders(wordId: string): Promise<ShareHolding[]> {
    return await db
      .select()
      .from(shareHoldings)
      .where(eq(shareHoldings.wordId, wordId));
  }

  // Transaction operations
  async createTransaction(transaction: Omit<typeof transactions.$inferInsert, 'id'>): Promise<Transaction> {
    const [created] = await db
      .insert(transactions)
      .values(transaction)
      .returning();
    return created;
  }

  async getUserTransactions(userId: string, limit: number): Promise<Transaction[]> {
    return await db
      .select()
      .from(transactions)
      .where(eq(transactions.userId, userId))
      .orderBy(desc(transactions.createdAt))
      .limit(limit);
  }

  // Receipt operations
  async createReceipt(transactionId: string, receiptData: any): Promise<Receipt> {
    const [receipt] = await db
      .insert(receipts)
      .values({ transactionId, receiptData })
      .returning();
    return receipt;
  }

  async getReceipt(transactionId: string): Promise<Receipt | undefined> {
    const [receipt] = await db
      .select()
      .from(receipts)
      .where(eq(receipts.transactionId, transactionId));
    return receipt;
  }
}

export const storage = new DatabaseStorage();
