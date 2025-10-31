import { sql } from 'drizzle-orm';
import {
  index,
  jsonb,
  pgTable,
  timestamp,
  varchar,
  decimal,
  integer,
  text,
  boolean,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table (mandatory for Replit Auth)
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table (extended for Wordex)
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  username: varchar("username").unique(),
  password: varchar("password"),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  wbBalance: decimal("wb_balance", { precision: 20, scale: 2 }).notNull().default('10000.00'),
  totalEarnings: decimal("total_earnings", { precision: 20, scale: 2 }).notNull().default('10000.00'),
  lastLogin: timestamp("last_login").defaultNow(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;

// Words table - stores all submitted words with IPO and trading data
export const words = pgTable("words", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  textNormalized: varchar("text_normalized", { length: 100 }).notNull().unique(), // ALL CAPS, NO SPACES
  displayText: varchar("display_text", { length: 100 }).notNull(), // Original submission (for display)
  creatorId: varchar("creator_id").notNull().references(() => users.id),
  
  // Share structure
  totalShares: integer("total_shares").notNull().default(1000),
  creatorShares: integer("creator_shares").notNull().default(20), // 2% to creator
  outstandingShares: integer("outstanding_shares").notNull().default(0), // Shares issued to public
  
  // IPO fields
  ipoStatus: varchar("ipo_status", { length: 20 }).notNull().default('IPO_ACTIVE'), // 'IPO_ACTIVE', 'TRADING', 'IPO_FAILED'
  ipoStartPrice: decimal("ipo_start_price", { precision: 10, scale: 2 }).notNull().default('2.00'),
  ipoCurrentPrice: decimal("ipo_current_price", { precision: 10, scale: 2 }).notNull().default('2.00'),
  ipoEndPrice: decimal("ipo_end_price", { precision: 10, scale: 2 }).notNull().default('0.10'),
  ipoSharesOffered: integer("ipo_shares_offered").notNull().default(980), // 980 shares (98% of total, 2% to creator)
  ipoSharesSold: integer("ipo_shares_sold").notNull().default(0),
  ipoStartedAt: timestamp("ipo_started_at"),
  ipoEndsAt: timestamp("ipo_ends_at"),
  
  // Trading data
  lastTradePrice: decimal("last_trade_price", { precision: 10, scale: 2 }),
  currentPrice: decimal("current_price", { precision: 10, scale: 2 }).notNull().default('2.00'), // Defaults to IPO start price
  marketCap: decimal("market_cap", { precision: 20, scale: 2 }).notNull().default('2000.00'), // 1000 shares × $2.00
  volume24h: integer("volume_24h").notNull().default(0),
  tradeCount: integer("trade_count").notNull().default(0),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("idx_words_ipo_status").on(table.ipoStatus),
  index("idx_words_current_price").on(table.currentPrice),
  index("idx_words_market_cap").on(table.marketCap),
  index("idx_words_created_at").on(table.createdAt),
]);

export const wordsRelations = relations(words, ({ one, many }) => ({
  creator: one(users, {
    fields: [words.creatorId],
    references: [users.id],
  }),
  holdings: many(holdings),
  transactions: many(transactions),
  orders: many(orders),
  trades: many(trades),
  vestingSchedules: many(vestingSchedules),
}));

export const insertWordSchema = createInsertSchema(words).omit({
  id: true,
  totalShares: true,
  creatorShares: true,
  outstandingShares: true,
  ipoStatus: true,
  ipoStartPrice: true,
  ipoCurrentPrice: true,
  ipoEndPrice: true,
  ipoSharesOffered: true,
  ipoSharesSold: true,
  ipoStartedAt: true,
  ipoEndsAt: true,
  lastTradePrice: true,
  currentPrice: true,
  marketCap: true,
  volume24h: true,
  tradeCount: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertWord = z.infer<typeof insertWordSchema>;
export type Word = typeof words.$inferSelect;

// Holdings table - tracks user ownership of word shares with vesting
export const holdings = pgTable("holdings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  wordId: varchar("word_id").notNull().references(() => words.id),
  quantity: integer("quantity").notNull(), // Total shares owned
  availableQuantity: integer("available_quantity").notNull().default(0), // Shares available for trading
  lockedQuantity: integer("locked_quantity").notNull().default(0), // Shares locked in orders or vesting
  averageCost: decimal("average_cost", { precision: 10, scale: 2 }).notNull().default('0.00'), // Average cost per share
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("idx_holdings_user").on(table.userId),
  index("idx_holdings_word").on(table.wordId),
]);

export const holdingsRelations = relations(holdings, ({ one }) => ({
  user: one(users, {
    fields: [holdings.userId],
    references: [users.id],
  }),
  word: one(words, {
    fields: [holdings.wordId],
    references: [words.id],
  }),
}));

export type Holding = typeof holdings.$inferSelect;

// Orders table - limit and market orders for the order book
export const orders = pgTable("orders", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  wordId: varchar("word_id").notNull().references(() => words.id),
  side: varchar("side", { length: 10 }).notNull(), // 'BUY' or 'SELL'
  orderType: varchar("order_type", { length: 10 }).notNull(), // 'LIMIT' or 'MARKET'
  quantity: integer("quantity").notNull(), // Original order quantity
  filledQuantity: integer("filled_quantity").notNull().default(0), // Shares filled so far
  remainingQuantity: integer("remaining_quantity").notNull(), // Shares remaining to be filled
  limitPrice: decimal("limit_price", { precision: 10, scale: 2 }), // Null for market orders
  status: varchar("status", { length: 20 }).notNull().default('OPEN'), // 'OPEN', 'PARTIALLY_FILLED', 'FILLED', 'CANCELLED'
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("idx_orders_user").on(table.userId),
  index("idx_orders_word").on(table.wordId),
  index("idx_orders_status").on(table.status),
  index("idx_orders_side_status").on(table.side, table.status),
  index("idx_orders_created_at").on(table.createdAt),
]);

export const ordersRelations = relations(orders, ({ one, many }) => ({
  user: one(users, {
    fields: [orders.userId],
    references: [users.id],
  }),
  word: one(words, {
    fields: [orders.wordId],
    references: [words.id],
  }),
  tradesAsBuyer: many(trades, { relationName: 'buyOrder' }),
  tradesAsSeller: many(trades, { relationName: 'sellOrder' }),
}));

export type Order = typeof orders.$inferSelect;

// Trades table - executed trades between users
export const trades = pgTable("trades", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  wordId: varchar("word_id").notNull().references(() => words.id),
  buyerId: varchar("buyer_id").notNull().references(() => users.id),
  sellerId: varchar("seller_id").notNull().references(() => users.id),
  buyOrderId: varchar("buy_order_id").references(() => orders.id),
  sellOrderId: varchar("sell_order_id").references(() => orders.id),
  quantity: integer("quantity").notNull(),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(), // Price per share
  totalValue: decimal("total_value", { precision: 20, scale: 2 }).notNull(), // quantity × price
  buyerFee: decimal("buyer_fee", { precision: 20, scale: 2 }).notNull().default('0.00'), // 0.5% fee
  sellerFee: decimal("seller_fee", { precision: 20, scale: 2 }).notNull().default('0.00'), // 0.5% fee
  isIpo: boolean("is_ipo").notNull().default(false), // True if this was an IPO purchase
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("idx_trades_word").on(table.wordId),
  index("idx_trades_buyer").on(table.buyerId),
  index("idx_trades_seller").on(table.sellerId),
  index("idx_trades_created_at").on(table.createdAt),
]);

export const tradesRelations = relations(trades, ({ one }) => ({
  word: one(words, {
    fields: [trades.wordId],
    references: [words.id],
  }),
  buyer: one(users, {
    fields: [trades.buyerId],
    references: [users.id],
  }),
  seller: one(users, {
    fields: [trades.sellerId],
    references: [users.id],
  }),
  buyOrder: one(orders, {
    fields: [trades.buyOrderId],
    references: [orders.id],
    relationName: 'buyOrder',
  }),
  sellOrder: one(orders, {
    fields: [trades.sellOrderId],
    references: [orders.id],
    relationName: 'sellOrder',
  }),
}));

export type Trade = typeof trades.$inferSelect;

// Vesting schedules table - tracks creator share vesting over 60 days
export const vestingSchedules = pgTable("vesting_schedules", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  wordId: varchar("word_id").notNull().references(() => words.id),
  totalShares: integer("total_shares").notNull().default(20), // Total shares to vest
  unlockedShares: integer("unlocked_shares").notNull().default(0), // Shares unlocked so far
  schedule: jsonb("schedule").notNull(), // Array of {day: number, percent: number} checkpoints
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("idx_vesting_user").on(table.userId),
  index("idx_vesting_word").on(table.wordId),
]);

export const vestingSchedulesRelations = relations(vestingSchedules, ({ one }) => ({
  user: one(users, {
    fields: [vestingSchedules.userId],
    references: [users.id],
  }),
  word: one(words, {
    fields: [vestingSchedules.wordId],
    references: [words.id],
  }),
}));

export type VestingSchedule = typeof vestingSchedules.$inferSelect;

// Transactions table - complete audit trail of all transactions
export const transactions = pgTable("transactions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  wordId: varchar("word_id").references(() => words.id), // Null for non-trading transactions
  tradeId: varchar("trade_id").references(() => trades.id), // Link to trade if applicable
  type: varchar("type", { length: 50 }).notNull(), // 'BUY', 'SELL', 'SUBMIT_WORD', 'DAILY_LOGIN', 'IPO_BUY'
  quantity: integer("quantity"), // Null for non-share transactions
  pricePerShare: decimal("price_per_share", { precision: 10, scale: 2 }), // Null for non-trading
  totalAmount: decimal("total_amount", { precision: 20, scale: 2 }).notNull(),
  fee: decimal("fee", { precision: 20, scale: 2 }).notNull().default('0.00'),
  balanceBefore: decimal("balance_before", { precision: 20, scale: 2 }).notNull(),
  balanceAfter: decimal("balance_after", { precision: 20, scale: 2 }).notNull(),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("idx_transactions_user").on(table.userId),
  index("idx_transactions_word").on(table.wordId),
  index("idx_transactions_trade").on(table.tradeId),
  index("idx_transactions_created_at").on(table.createdAt),
]);

export const transactionsRelations = relations(transactions, ({ one }) => ({
  user: one(users, {
    fields: [transactions.userId],
    references: [users.id],
  }),
  word: one(words, {
    fields: [transactions.wordId],
    references: [words.id],
  }),
  trade: one(trades, {
    fields: [transactions.tradeId],
    references: [trades.id],
  }),
}));

export type Transaction = typeof transactions.$inferSelect;
