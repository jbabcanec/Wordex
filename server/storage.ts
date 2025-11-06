// Database storage implementation - Order Book Trading System
import {
  users,
  words,
  holdings,
  orders,
  trades,
  vestingSchedules,
  transactions,
  type User,
  type UpsertUser,
  type Word,
  type InsertWord,
  type Holding,
  type Order,
  type Trade,
  type VestingSchedule,
  type Transaction,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, sql, or, asc, gte, lte } from "drizzle-orm";

export interface IStorage {
  // User operations (mandatory for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  updateUserBalance(userId: string, newBalance: string): Promise<void>;
  updateUserLogin(userId: string): Promise<void>;
  updateUserEarnings(userId: string, earnings: string): Promise<void>;
  getTopTraders(limit: number): Promise<Array<User & { rank: number; portfolioValue: string; holdingsValue: string }>>;
  getAllTraders(offset: number, limit: number): Promise<User[]>;
  
  // Word operations
  createWord(word: InsertWord): Promise<Word>;
  getWord(id: string): Promise<Word | undefined>;
  getWordByNormalizedText(text: string): Promise<Word | undefined>;
  getTopWords(limit: number): Promise<Word[]>;
  getAllWords(offset: number, limit: number): Promise<Word[]>;
  getActiveIpos(): Promise<Word[]>;
  updateWordPrice(id: string, currentPrice: string, lastTradePrice?: string): Promise<void>;
  updateWordShares(id: string, outstandingShares: number): Promise<void>;
  updateWordIpoStatus(id: string, ipoStatus: string): Promise<void>;
  updateWordIpoPrice(id: string, ipoCurrentPrice: string): Promise<void>;
  updateWordIpoSharesSold(id: string, ipoSharesSold: number): Promise<void>;
  updateWordStats(id: string, stats: { volume24h?: number; tradeCount?: number; marketCap?: string }): Promise<void>;
  
  // Holding operations
  getHolding(userId: string, wordId: string): Promise<Holding | undefined>;
  createHolding(data: {
    userId: string;
    wordId: string;
    quantity: number;
    availableQuantity: number;
    lockedQuantity: number;
    averageCost: string;
  }): Promise<Holding>;
  updateHolding(id: string, data: {
    quantity?: number;
    availableQuantity?: number;
    lockedQuantity?: number;
    averageCost?: string;
  }): Promise<void>;
  getUserPortfolio(userId: string): Promise<any[]>;
  getWordHolders(wordId: string): Promise<Holding[]>;
  
  // Order operations
  createOrder(data: {
    userId: string;
    wordId: string;
    side: string;
    orderType: string;
    quantity: number;
    remainingQuantity: number;
    limitPrice?: string;
  }): Promise<Order>;
  getOrder(id: string): Promise<Order | undefined>;
  getUserOrders(userId: string, status?: string): Promise<Order[]>;
  getWordOrders(wordId: string, side?: string, status?: string): Promise<Order[]>;
  getOpenOrders(wordId: string, side: string): Promise<Order[]>;
  updateOrder(id: string, data: {
    filledQuantity?: number;
    remainingQuantity?: number;
    status?: string;
  }): Promise<void>;
  cancelOrder(id: string): Promise<void>;
  
  // Trade operations
  createTrade(data: {
    wordId: string;
    buyerId: string;
    sellerId: string;
    buyOrderId?: string;
    sellOrderId?: string;
    quantity: number;
    price: string;
    totalValue: string;
    buyerFee: string;
    sellerFee: string;
    isIpo: boolean;
  }): Promise<Trade>;
  getWordTrades(wordId: string, limit: number): Promise<Trade[]>;
  getUserTrades(userId: string, limit: number): Promise<Trade[]>;
  
  // Vesting operations
  createVestingSchedule(data: {
    userId: string;
    wordId: string;
    totalShares: number;
    schedule: any;
  }): Promise<VestingSchedule>;
  getVestingSchedule(userId: string, wordId: string): Promise<VestingSchedule | undefined>;
  getAllVestingSchedules(): Promise<VestingSchedule[]>;
  updateVestingSchedule(id: string, unlockedShares: number): Promise<void>;
  
  // Transaction operations
  createTransaction(transaction: Omit<typeof transactions.$inferInsert, 'id'>): Promise<Transaction>;
  getUserTransactions(userId: string, limit: number): Promise<Transaction[]>;
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

  async getTopTraders(limit: number): Promise<Array<User & { rank: number; portfolioValue: string; holdingsValue: string }>> {
    const allUsers = await db
      .select()
      .from(users)
      .orderBy(desc(users.totalEarnings));
    
    // Calculate holdings value for each user
    const usersWithPortfolio = await Promise.all(
      allUsers.map(async (user) => {
        // Get all holdings for this user
        const userHoldings = await db
          .select()
          .from(holdings)
          .where(eq(holdings.userId, user.id));
        
        // Calculate total holdings value
        let holdingsValue = 0;
        for (const holding of userHoldings) {
          const word = await db
            .select()
            .from(words)
            .where(eq(words.id, holding.wordId))
            .limit(1);
          
          if (word[0]) {
            const price = parseFloat(word[0].currentPrice || '0');
            const quantity = holding.quantity;
            holdingsValue += price * quantity;
          }
        }
        
        const wbBalance = parseFloat(user.wbBalance);
        const portfolioValue = wbBalance + holdingsValue;
        
        return {
          ...user,
          holdingsValue: holdingsValue.toFixed(2),
          portfolioValue: portfolioValue.toFixed(2),
        };
      })
    );
    
    // Sort by portfolio value and take top limit
    const sorted = usersWithPortfolio
      .sort((a, b) => parseFloat(b.portfolioValue) - parseFloat(a.portfolioValue))
      .slice(0, limit);
    
    return sorted.map((user, index) => ({
      ...user,
      rank: index + 1,
    }));
  }

  async getAllTraders(offset: number, limit: number): Promise<User[]> {
    return await db
      .select()
      .from(users)
      .orderBy(desc(users.wbBalance))
      .offset(offset)
      .limit(limit);
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
      .orderBy(desc(words.marketCap))
      .limit(limit);
  }

  async getAllWords(offset: number, limit: number): Promise<Word[]> {
    return await db
      .select()
      .from(words)
      .orderBy(desc(words.createdAt))
      .offset(offset)
      .limit(limit);
  }

  async getActiveIpos(): Promise<Word[]> {
    return await db
      .select()
      .from(words)
      .where(eq(words.ipoStatus, 'IPO_ACTIVE'))
      .orderBy(desc(words.createdAt));
  }

  async updateWordPrice(id: string, currentPrice: string, lastTradePrice?: string): Promise<void> {
    const updateData: any = { currentPrice, updatedAt: new Date() };
    if (lastTradePrice !== undefined) {
      updateData.lastTradePrice = lastTradePrice;
    }
    await db
      .update(words)
      .set(updateData)
      .where(eq(words.id, id));
  }

  async updateWordShares(id: string, outstandingShares: number): Promise<void> {
    await db
      .update(words)
      .set({ outstandingShares, updatedAt: new Date() })
      .where(eq(words.id, id));
  }

  async updateWordIpoStatus(id: string, ipoStatus: string): Promise<void> {
    await db
      .update(words)
      .set({ ipoStatus, updatedAt: new Date() })
      .where(eq(words.id, id));
  }

  async updateWordIpoPrice(id: string, ipoCurrentPrice: string): Promise<void> {
    await db
      .update(words)
      .set({ ipoCurrentPrice, updatedAt: new Date() })
      .where(eq(words.id, id));
  }

  async updateWordIpoSharesSold(id: string, ipoSharesSold: number): Promise<void> {
    await db
      .update(words)
      .set({ ipoSharesSold, updatedAt: new Date() })
      .where(eq(words.id, id));
  }

  async updateWordStats(id: string, stats: { volume24h?: number; tradeCount?: number; marketCap?: string }): Promise<void> {
    await db
      .update(words)
      .set({ ...stats, updatedAt: new Date() })
      .where(eq(words.id, id));
  }

  // Holding operations
  async getHolding(userId: string, wordId: string): Promise<Holding | undefined> {
    const [holding] = await db
      .select()
      .from(holdings)
      .where(and(eq(holdings.userId, userId), eq(holdings.wordId, wordId)));
    return holding;
  }

  async createHolding(data: {
    userId: string;
    wordId: string;
    quantity: number;
    availableQuantity: number;
    lockedQuantity: number;
    averageCost: string;
  }): Promise<Holding> {
    const [holding] = await db
      .insert(holdings)
      .values(data)
      .returning();
    return holding;
  }

  async updateHolding(id: string, data: {
    quantity?: number;
    availableQuantity?: number;
    lockedQuantity?: number;
    averageCost?: string;
  }): Promise<void> {
    await db
      .update(holdings)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(holdings.id, id));
  }

  async getUserPortfolio(userId: string): Promise<any[]> {
    const results = await db
      .select({
        holding: holdings,
        word: words,
      })
      .from(holdings)
      .innerJoin(words, eq(holdings.wordId, words.id))
      .where(eq(holdings.userId, userId));
    
    // Transform to frontend format
    return results.map(({ holding, word }) => {
      const avgCostPerShare = parseFloat(holding.averageCost || '0');
      const currentPricePerShare = parseFloat(word.currentPrice || '0');

      const currentValue = holding.quantity * currentPricePerShare;
      const totalCostBasis = holding.quantity * avgCostPerShare;
      const profitLoss = currentValue - totalCostBasis;
      const profitLossPercent = totalCostBasis > 0 ? (profitLoss / totalCostBasis) * 100 : 0;

      return {
        word: {
          id: word.id,
          textNormalized: word.textNormalized,
          currentPrice: word.currentPrice,
        },
        quantity: holding.quantity,
        costBasis: totalCostBasis.toFixed(2),
        currentValue,
        profitLoss,
        profitLossPercent,
      };
    });
  }

  async getWordHolders(wordId: string): Promise<Holding[]> {
    return await db
      .select()
      .from(holdings)
      .where(eq(holdings.wordId, wordId));
  }

  // Order operations
  async createOrder(data: {
    userId: string;
    wordId: string;
    side: string;
    orderType: string;
    quantity: number;
    remainingQuantity: number;
    limitPrice?: string;
  }): Promise<Order> {
    const [order] = await db
      .insert(orders)
      .values(data)
      .returning();
    return order;
  }

  async getOrder(id: string): Promise<Order | undefined> {
    const [order] = await db.select().from(orders).where(eq(orders.id, id));
    return order;
  }

  async getUserOrders(userId: string, status?: string): Promise<Order[]> {
    const conditions = [eq(orders.userId, userId)];
    if (status) {
      conditions.push(eq(orders.status, status));
    }
    return await db
      .select()
      .from(orders)
      .where(and(...conditions))
      .orderBy(desc(orders.createdAt));
  }

  async getWordOrders(wordId: string, side?: string, status?: string): Promise<Order[]> {
    const conditions = [eq(orders.wordId, wordId)];
    if (side) {
      conditions.push(eq(orders.side, side));
    }
    if (status) {
      conditions.push(eq(orders.status, status));
    }
    return await db
      .select()
      .from(orders)
      .where(and(...conditions))
      .orderBy(desc(orders.createdAt));
  }

  async getOpenOrders(wordId: string, side: string): Promise<Order[]> {
    return await db
      .select()
      .from(orders)
      .where(and(
        eq(orders.wordId, wordId),
        eq(orders.side, side),
        or(eq(orders.status, 'OPEN'), eq(orders.status, 'PARTIALLY_FILLED'))
      ))
      .orderBy(
        side === 'BUY' ? desc(orders.limitPrice) : asc(orders.limitPrice),
        asc(orders.createdAt)
      );
  }

  async updateOrder(id: string, data: {
    filledQuantity?: number;
    remainingQuantity?: number;
    status?: string;
  }): Promise<void> {
    await db
      .update(orders)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(orders.id, id));
  }

  async cancelOrder(id: string): Promise<void> {
    await db
      .update(orders)
      .set({ status: 'CANCELLED', updatedAt: new Date() })
      .where(eq(orders.id, id));
  }

  // Trade operations
  async createTrade(data: {
    wordId: string;
    buyerId: string;
    sellerId: string;
    buyOrderId?: string;
    sellOrderId?: string;
    quantity: number;
    price: string;
    totalValue: string;
    buyerFee: string;
    sellerFee: string;
    isIpo: boolean;
  }): Promise<Trade> {
    const [trade] = await db
      .insert(trades)
      .values(data)
      .returning();
    return trade;
  }

  async getWordTrades(wordId: string, limit: number): Promise<Trade[]> {
    return await db
      .select()
      .from(trades)
      .where(eq(trades.wordId, wordId))
      .orderBy(desc(trades.createdAt))
      .limit(limit);
  }

  async getUserTrades(userId: string, limit: number): Promise<Trade[]> {
    return await db
      .select()
      .from(trades)
      .where(or(eq(trades.buyerId, userId), eq(trades.sellerId, userId)))
      .orderBy(desc(trades.createdAt))
      .limit(limit);
  }

  // Vesting operations
  async createVestingSchedule(data: {
    userId: string;
    wordId: string;
    totalShares: number;
    schedule: any;
  }): Promise<VestingSchedule> {
    const [vesting] = await db
      .insert(vestingSchedules)
      .values(data)
      .returning();
    return vesting;
  }

  async getVestingSchedule(userId: string, wordId: string): Promise<VestingSchedule | undefined> {
    const [vesting] = await db
      .select()
      .from(vestingSchedules)
      .where(and(eq(vestingSchedules.userId, userId), eq(vestingSchedules.wordId, wordId)));
    return vesting;
  }

  async getAllVestingSchedules(): Promise<VestingSchedule[]> {
    return await db.select().from(vestingSchedules);
  }

  async updateVestingSchedule(id: string, unlockedShares: number): Promise<void> {
    await db
      .update(vestingSchedules)
      .set({ unlockedShares, updatedAt: new Date() })
      .where(eq(vestingSchedules.id, id));
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
}

export const storage = new DatabaseStorage();
