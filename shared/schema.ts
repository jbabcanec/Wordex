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

// Words table - stores all submitted words
export const words = pgTable("words", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  textNormalized: varchar("text_normalized", { length: 100 }).notNull().unique(), // ALL CAPS, NO SPACES
  displayText: varchar("display_text", { length: 100 }).notNull(), // Original submission (for display)
  submitterId: varchar("submitter_id").notNull().references(() => users.id),
  currentPrice: decimal("current_price", { precision: 10, scale: 2 }).notNull().default('1.00'),
  totalShares: integer("total_shares").notNull().default(100000),
  sharesOutstanding: integer("shares_outstanding").notNull().default(5000), // Starts with submitter's 5000 shares (5%)
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("idx_words_current_price").on(table.currentPrice),
  index("idx_words_created_at").on(table.createdAt),
]);

export const wordsRelations = relations(words, ({ one, many }) => ({
  submitter: one(users, {
    fields: [words.submitterId],
    references: [users.id],
  }),
  shareHoldings: many(shareHoldings),
  transactions: many(transactions),
}));

export const insertWordSchema = createInsertSchema(words).omit({
  id: true,
  currentPrice: true,
  totalShares: true,
  sharesOutstanding: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertWord = z.infer<typeof insertWordSchema>;
export type Word = typeof words.$inferSelect;

// ShareHoldings table - tracks user ownership of word shares
export const shareHoldings = pgTable("share_holdings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  wordId: varchar("word_id").notNull().references(() => words.id),
  quantity: integer("quantity").notNull(),
  costBasis: decimal("cost_basis", { precision: 20, scale: 2 }).notNull(), // Total amount paid
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("idx_share_holdings_user").on(table.userId),
  index("idx_share_holdings_word").on(table.wordId),
]);

export const shareHoldingsRelations = relations(shareHoldings, ({ one }) => ({
  user: one(users, {
    fields: [shareHoldings.userId],
    references: [users.id],
  }),
  word: one(words, {
    fields: [shareHoldings.wordId],
    references: [words.id],
  }),
}));

export type ShareHolding = typeof shareHoldings.$inferSelect;

// Transactions table - complete audit trail of all transactions
export const transactions = pgTable("transactions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  wordId: varchar("word_id").references(() => words.id), // Null for non-trading transactions
  type: varchar("type", { length: 50 }).notNull(), // 'BUY', 'SELL', 'SUBMIT_WORD', 'DAILY_LOGIN'
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
}));

export type Transaction = typeof transactions.$inferSelect;

// Receipts table - detailed receipts for all transactions
export const receipts = pgTable("receipts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  transactionId: varchar("transaction_id").notNull().unique().references(() => transactions.id),
  receiptData: jsonb("receipt_data").notNull(), // Full receipt JSON for display
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("idx_receipts_transaction").on(table.transactionId),
]);

export const receiptsRelations = relations(receipts, ({ one }) => ({
  transaction: one(transactions, {
    fields: [receipts.transactionId],
    references: [transactions.id],
  }),
}));

export type Receipt = typeof receipts.$inferSelect;
