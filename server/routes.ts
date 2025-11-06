import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { db } from "./db";
import { words, users, transactions, holdings, orders, trades, vestingSchedules } from "@shared/schema";
import { eq, and, sql, desc, asc, or } from "drizzle-orm";
import bcrypt from "bcryptjs";
import {
  SUBMISSION_FEE,
  SHARES_PER_WORD,
  CREATOR_SHARES,
  IPO_SHARES,
  TRADING_FEE_PERCENT,
  IPO_START_PRICE,
  IPO_END_PRICE,
  IPO_DURATION_HOURS,
  VESTING_SCHEDULE,
  DAILY_LOGIN_BONUS,
  MIN_IPO_SHARES_SOLD,
  calculateIpoPrice,
  calculateTradingFee,
  calculateVestingUnlocked,
} from "@shared/constants";

// Helper function to normalize word text: ALL CAPS, NO SPACES
function normalizeWord(text: string): string {
  return text.toUpperCase().replace(/\s+/g, '');
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);

  // Signup endpoint
  app.post('/api/signup', async (req, res, next) => {
    try {
      const { username, password, email, firstName, lastName } = req.body;

      if (!username || !password) {
        return res.status(400).json({ message: "Username and password are required" });
      }

      if (username.length < 3 || username.length > 50) {
        return res.status(400).json({ message: "Username must be 3-50 characters" });
      }

      if (password.length < 6) {
        return res.status(400).json({ message: "Password must be at least 6 characters" });
      }

      const [existingUser] = await db
        .select()
        .from(users)
        .where(eq(users.username, username))
        .limit(1);

      if (existingUser) {
        return res.status(400).json({ message: "Username already taken" });
      }

      const hashedPassword = await bcrypt.hash(password, 10);

      const [newUser] = await db
        .insert(users)
        .values({
          username,
          password: hashedPassword,
          email: email || null,
          firstName: firstName || null,
          lastName: lastName || null,
        })
        .returning();

      req.login({
        claims: {
          sub: newUser.id,
          email: newUser.email,
          first_name: newUser.firstName,
          last_name: newUser.lastName,
        },
        isLocal: true,
      }, (err) => {
        if (err) {
          return res.status(500).json({ message: "Signup successful but login failed" });
        }
        res.json({ 
          id: newUser.id,
          username: newUser.username,
          email: newUser.email,
          firstName: newUser.firstName,
          lastName: newUser.lastName,
          wbBalance: newUser.wbBalance,
        });
      });
    } catch (error: any) {
      console.error("Signup error:", error);
      res.status(500).json({ message: "Signup failed" });
    }
  });

  // Login endpoint
  app.post('/api/login', async (req, res, next) => {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ message: "Username and password are required" });
    }

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.username, username))
      .limit(1);

    if (!user || !user.password) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // Daily login bonus
    const lastLogin = user.lastLogin ? new Date(user.lastLogin) : null;
    const now = new Date();
    const daysSinceLogin = lastLogin ? (now.getTime() - lastLogin.getTime()) / (1000 * 60 * 60 * 24) : 999;
    
    if (daysSinceLogin >= 1) {
      const currentBalance = parseFloat(user.wbBalance);
      const newBalance = (currentBalance + DAILY_LOGIN_BONUS).toFixed(2);
      await storage.updateUserBalance(user.id, newBalance);
      await storage.createTransaction({
        userId: user.id,
        type: 'DAILY_LOGIN',
        totalAmount: DAILY_LOGIN_BONUS.toFixed(2),
        fee: '0.00',
        balanceBefore: user.wbBalance,
        balanceAfter: newBalance,
        description: `Daily login bonus`,
      });
      user.wbBalance = newBalance;
    }

    await storage.updateUserLogin(user.id);

    req.login({
      claims: {
        sub: user.id,
        email: user.email,
        first_name: user.firstName,
        last_name: user.lastName,
      },
      isLocal: true,
    }, (err) => {
      if (err) {
        return res.status(500).json({ message: "Login failed" });
      }
      res.json({
        id: user.id,
        username: user.username,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        wbBalance: user.wbBalance,
      });
    });
  });

  // Get current user
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      res.json({
        id: user.id,
        username: user.username,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        wbBalance: user.wbBalance,
        totalEarnings: user.totalEarnings,
      });
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Submit word (creates IPO)
  app.post('/api/words', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { text } = req.body;

      if (!text || typeof text !== 'string') {
        return res.status(400).json({ message: "Word text is required" });
      }

      const normalized = normalizeWord(text);
      if (normalized.length === 0 || normalized.length > 100) {
        return res.status(400).json({ message: "Word must be 1-100 characters (spaces removed)" });
      }

      const result = await db.transaction(async (tx) => {
        const [existingWord] = await tx
          .select()
          .from(words)
          .where(eq(words.textNormalized, normalized))
          .for('update');

        if (existingWord) {
          throw new Error("This word already exists");
        }

        const [user] = await tx
          .select()
          .from(users)
          .where(eq(users.id, userId))
          .for('update');

        if (!user) {
          throw new Error("User not found");
        }

        const balance = parseFloat(user.wbBalance);
        if (balance < SUBMISSION_FEE) {
          throw new Error(`Insufficient balance. Need ${SUBMISSION_FEE} WB to submit a word.`);
        }
        const newBalance = (balance - SUBMISSION_FEE).toFixed(2);

        await tx
          .update(users)
          .set({ wbBalance: newBalance, updatedAt: new Date() })
          .where(eq(users.id, userId));

        const ipoStartedAt = new Date();
        const ipoEndsAt = new Date(ipoStartedAt.getTime() + IPO_DURATION_HOURS * 60 * 60 * 1000);

        const [word] = await tx
          .insert(words)
          .values({
            textNormalized: normalized,
            displayText: text,
            creatorId: userId,
            ipoStartedAt,
            ipoEndsAt,
          })
          .returning();

        // Create vesting schedule for creator shares
        await tx
          .insert(vestingSchedules)
          .values({
            userId,
            wordId: word.id,
            totalShares: CREATOR_SHARES,
            unlockedShares: 0,
            schedule: VESTING_SCHEDULE,
          });

        // Create holding for creator (all shares locked initially)
        await tx
          .insert(holdings)
          .values({
            userId,
            wordId: word.id,
            quantity: CREATOR_SHARES,
            availableQuantity: 0,
            lockedQuantity: CREATOR_SHARES,
            averageCost: '0.00',
          });

        const [transaction] = await tx
          .insert(transactions)
          .values({
            userId,
            wordId: word.id,
            type: 'SUBMIT_WORD',
            totalAmount: `-${SUBMISSION_FEE.toFixed(2)}`,
            fee: '0.00',
            balanceBefore: user.wbBalance,
            balanceAfter: newBalance,
            description: `Submitted word: ${normalized} (IPO started, ${CREATOR_SHARES} shares vesting)`,
          })
          .returning();

        return { word, transaction };
      });

      res.json(result);
    } catch (error: any) {
      console.error("Error submitting word:", error);
      res.status(500).json({ message: error.message || "Failed to submit word" });
    }
  });

  // Buy IPO shares
  app.post('/api/words/:wordId/ipo/buy', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { wordId } = req.params;
      const { quantity } = req.body;

      if (!quantity || quantity <= 0) {
        return res.status(400).json({ message: "Invalid quantity" });
      }

      const result = await db.transaction(async (tx) => {
        const [word] = await tx
          .select()
          .from(words)
          .where(eq(words.id, wordId))
          .for('update');

        if (!word) {
          throw new Error("Word not found");
        }

        if (word.ipoStatus !== 'IPO_ACTIVE') {
          throw new Error("IPO is not active for this word");
        }

        const now = new Date();
        if (!word.ipoStartedAt || !word.ipoEndsAt) {
          throw new Error("IPO not properly initialized");
        }

        if (now > word.ipoEndsAt) {
          throw new Error("IPO has ended");
        }

        const elapsedHours = (now.getTime() - word.ipoStartedAt.getTime()) / (1000 * 60 * 60);
        const currentIpoPrice = calculateIpoPrice(elapsedHours);

        const sharesAvailable = word.ipoSharesOffered - word.ipoSharesSold;
        if (quantity > sharesAvailable) {
          throw new Error(`Only ${sharesAvailable} shares available in IPO`);
        }

        const [user] = await tx
          .select()
          .from(users)
          .where(eq(users.id, userId))
          .for('update');

        if (!user) {
          throw new Error("User not found");
        }

        const totalValue = quantity * currentIpoPrice;
        const fee = calculateTradingFee(totalValue);
        const totalCost = totalValue + fee;

        const balance = parseFloat(user.wbBalance);
        if (balance < totalCost) {
          throw new Error(`Insufficient balance. Need ${totalCost.toFixed(2)} WB (${totalValue.toFixed(2)} + ${fee.toFixed(2)} fee)`);
        }

        const newBalance = (balance - totalCost).toFixed(2);
        await tx
          .update(users)
          .set({ wbBalance: newBalance, updatedAt: new Date() })
          .where(eq(users.id, userId));

        const newIpoSharesSold = word.ipoSharesSold + quantity;
        const newOutstanding = word.outstandingShares + quantity;

        let newIpoStatus = word.ipoStatus;
        if (newIpoSharesSold >= word.ipoSharesOffered) {
          newIpoStatus = 'TRADING';
        }

        await tx
          .update(words)
          .set({
            ipoSharesSold: newIpoSharesSold,
            ipoCurrentPrice: currentIpoPrice.toFixed(2),
            outstandingShares: newOutstanding,
            ipoStatus: newIpoStatus,
            lastTradePrice: currentIpoPrice.toFixed(2),
            currentPrice: currentIpoPrice.toFixed(2),
            marketCap: (currentIpoPrice * (SHARES_PER_WORD)).toFixed(2),
            tradeCount: word.tradeCount + 1,
            updatedAt: new Date(),
          })
          .where(eq(words.id, wordId));

        const [holding] = await tx
          .select()
          .from(holdings)
          .where(and(eq(holdings.userId, userId), eq(holdings.wordId, wordId)));

        if (holding) {
          const newQuantity = holding.quantity + quantity;
          const newAvailable = holding.availableQuantity + quantity;
          const newCost = (parseFloat(holding.averageCost) * holding.quantity + totalValue) / newQuantity;
          await tx
            .update(holdings)
            .set({
              quantity: newQuantity,
              availableQuantity: newAvailable,
              averageCost: newCost.toFixed(2),
              updatedAt: new Date(),
            })
            .where(eq(holdings.id, holding.id));
        } else {
          await tx
            .insert(holdings)
            .values({
              userId,
              wordId,
              quantity,
              availableQuantity: quantity,
              lockedQuantity: 0,
              averageCost: currentIpoPrice.toFixed(2),
            });
        }

        const [trade] = await tx
          .insert(trades)
          .values({
            wordId,
            buyerId: userId,
            sellerId: word.creatorId,
            quantity,
            price: currentIpoPrice.toFixed(2),
            totalValue: totalValue.toFixed(2),
            buyerFee: fee.toFixed(2),
            sellerFee: '0.00',
            isIpo: true,
          })
          .returning();

        await tx
          .insert(transactions)
          .values({
            userId,
            wordId,
            tradeId: trade.id,
            type: 'IPO_BUY',
            quantity,
            pricePerShare: currentIpoPrice.toFixed(2),
            totalAmount: `-${totalCost.toFixed(2)}`,
            fee: fee.toFixed(2),
            balanceBefore: user.wbBalance,
            balanceAfter: newBalance,
            description: `IPO purchase: ${quantity} shares of ${word.textNormalized} at ${currentIpoPrice.toFixed(2)} WB`,
          });

        return { trade, word };
      });

      res.json(result);
    } catch (error: any) {
      console.error("Error buying IPO shares:", error);
      res.status(500).json({ message: error.message || "Failed to buy IPO shares" });
    }
  });

  // Place order
  app.post('/api/orders', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { wordId, side, orderType, quantity, limitPrice } = req.body;

      console.log('📝 Order request:', { userId, wordId, side, orderType, quantity, limitPrice });

      if (!wordId || !side || !orderType || !quantity) {
        return res.status(400).json({ message: "Missing required fields" });
      }

      if (!['BUY', 'SELL'].includes(side)) {
        return res.status(400).json({ message: "Side must be BUY or SELL" });
      }

      if (!['LIMIT', 'MARKET'].includes(orderType)) {
        return res.status(400).json({ message: "Order type must be LIMIT or MARKET" });
      }

      if (orderType === 'LIMIT' && (!limitPrice || limitPrice <= 0)) {
        return res.status(400).json({ message: "Limit price required for limit orders" });
      }

      if (quantity <= 0) {
        return res.status(400).json({ message: "Quantity must be positive" });
      }

      const result = await db.transaction(async (tx) => {
        const [word] = await tx
          .select()
          .from(words)
          .where(eq(words.id, wordId))
          .for('update');

        if (!word) {
          console.log('❌ Word not found:', wordId);
          throw new Error("Word not found");
        }

        console.log('✅ Word found:', { id: word.id, name: word.textNormalized, ipoStatus: word.ipoStatus });

        // Only allow trading for TRADING words, or IPO_FAILED (users can trade their failed IPO shares)
        if (word.ipoStatus === 'IPO_ACTIVE') {
          console.log('❌ Word still in IPO:', { ipoStatus: word.ipoStatus });
          throw new Error("Word is in IPO. Use the IPO modal to buy shares during the IPO period.");
        }

        // TRADING and IPO_FAILED words can be traded
        if (word.ipoStatus !== 'TRADING' && word.ipoStatus !== 'IPO_FAILED') {
          console.log('❌ Word in invalid state for trading:', { ipoStatus: word.ipoStatus });
          throw new Error("Word is not available for trading.");
        }

        const [user] = await tx
          .select()
          .from(users)
          .where(eq(users.id, userId))
          .for('update');

        if (!user) {
          console.log('❌ User not found:', userId);
          throw new Error("User not found");
        }

        console.log('✅ User found:', { username: user.username, balance: user.wbBalance });

        if (side === 'BUY') {
          const estimatedPrice = orderType === 'MARKET' ? parseFloat(word.currentPrice) : limitPrice;
          const estimatedCost = quantity * estimatedPrice + calculateTradingFee(quantity * estimatedPrice);
          const balance = parseFloat(user.wbBalance);

          console.log('💰 Balance check:', { balance, estimatedCost, sufficient: balance >= estimatedCost });

          if (balance < estimatedCost) {
            console.log('❌ Insufficient balance');
            throw new Error(`Insufficient balance. Need approximately ${estimatedCost.toFixed(2)} WB`);
          }
        } else {
          const [holding] = await tx
            .select()
            .from(holdings)
            .where(and(eq(holdings.userId, userId), eq(holdings.wordId, wordId)))
            .for('update');

          console.log('📦 Holding check:', {
            found: !!holding,
            available: holding?.availableQuantity || 0,
            needed: quantity
          });

          if (!holding || holding.availableQuantity < quantity) {
            console.log('❌ Insufficient shares');
            throw new Error(`Insufficient shares. You have ${holding?.availableQuantity || 0} available.`);
          }

          await tx
            .update(holdings)
            .set({
              availableQuantity: holding.availableQuantity - quantity,
              lockedQuantity: holding.lockedQuantity + quantity,
              updatedAt: new Date(),
            })
            .where(eq(holdings.id, holding.id));

          console.log('🔒 Shares locked');
        }

        console.log('✍️ Creating order...');
        const [order] = await tx
          .insert(orders)
          .values({
            userId,
            wordId,
            side,
            orderType,
            quantity,
            remainingQuantity: quantity,
            limitPrice: limitPrice ? limitPrice.toFixed(2) : null,
          })
          .returning();

        console.log('✅ Order created:', order.id);
        return { order };
      });

      // Try to match the order immediately
      console.log('🔄 Attempting to match order...');
      await matchOrders(wordId, result.order.id);

      // For market orders, fail-fast if they didn't fully fill
      if (orderType === 'MARKET') {
        console.log('⚡ Market order - checking if filled...');
        const [updatedOrder] = await db
          .select()
          .from(orders)
          .where(eq(orders.id, result.order.id));

        if (updatedOrder && (updatedOrder.status === 'OPEN' || updatedOrder.status === 'PARTIALLY_FILLED')) {
          // Market order didn't fully fill - cancel it
          await db.transaction(async (tx) => {
            // If sell order, unlock remaining shares
            if (side === 'SELL' && updatedOrder.remainingQuantity > 0) {
              const [holding] = await tx
                .select()
                .from(holdings)
                .where(and(eq(holdings.userId, userId), eq(holdings.wordId, wordId)))
                .for('update');

              if (holding) {
                await tx
                  .update(holdings)
                  .set({
                    availableQuantity: holding.availableQuantity + updatedOrder.remainingQuantity,
                    lockedQuantity: holding.lockedQuantity - updatedOrder.remainingQuantity,
                    updatedAt: new Date(),
                  })
                  .where(eq(holdings.id, holding.id));
              }
            }

            // Cancel the order
            await tx
              .update(orders)
              .set({ status: 'CANCELLED', updatedAt: new Date() })
              .where(eq(orders.id, updatedOrder.id));
          });

          const filledQty = updatedOrder.filledQuantity;
          const cancelledQty = updatedOrder.remainingQuantity;

          if (filledQty > 0) {
            throw new Error(`Market order partially filled: ${filledQty} shares executed, ${cancelledQty} shares cancelled. No ${side === 'BUY' ? 'sellers' : 'buyers'} available for remaining quantity.`);
          } else {
            throw new Error(`Market order failed: No ${side === 'BUY' ? 'sellers' : 'buyers'} available. Use a limit order instead.`);
          }
        }
      }

      console.log('✅ Order placed successfully!');
      res.json(result);
    } catch (error: any) {
      console.error("❌ Error placing order:", error.message || error);
      res.status(500).json({ error: error.message || "Failed to place order" });
    }
  });

  // Cancel order
  app.delete('/api/orders/:orderId', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { orderId } = req.params;

      await db.transaction(async (tx) => {
        const [order] = await tx
          .select()
          .from(orders)
          .where(eq(orders.id, orderId))
          .for('update');

        if (!order) {
          throw new Error("Order not found");
        }

        if (order.userId !== userId) {
          throw new Error("Unauthorized");
        }

        if (order.status === 'FILLED' || order.status === 'CANCELLED') {
          throw new Error("Cannot cancel this order");
        }

        if (order.side === 'SELL' && order.remainingQuantity > 0) {
          const [holding] = await tx
            .select()
            .from(holdings)
            .where(and(eq(holdings.userId, userId), eq(holdings.wordId, order.wordId)))
            .for('update');

          if (holding) {
            await tx
              .update(holdings)
              .set({
                availableQuantity: holding.availableQuantity + order.remainingQuantity,
                lockedQuantity: holding.lockedQuantity - order.remainingQuantity,
                updatedAt: new Date(),
              })
              .where(eq(holdings.id, holding.id));
          }
        }

        await tx
          .update(orders)
          .set({ status: 'CANCELLED', updatedAt: new Date() })
          .where(eq(orders.id, orderId));
      });

      res.json({ message: "Order cancelled successfully" });
    } catch (error: any) {
      console.error("Error cancelling order:", error);
      res.status(500).json({ message: error.message || "Failed to cancel order" });
    }
  });

  // Get order book for a word
  app.get('/api/words/:wordId/orderbook', async (req, res) => {
    try {
      const { wordId } = req.params;

      const buyOrders = await storage.getOpenOrders(wordId, 'BUY');
      const sellOrders = await storage.getOpenOrders(wordId, 'SELL');

      const aggregateBids: { [price: string]: number } = {};
      const aggregateAsks: { [price: string]: number } = {};

      for (const order of buyOrders) {
        const price = order.limitPrice || '0';
        aggregateBids[price] = (aggregateBids[price] || 0) + order.remainingQuantity;
      }

      for (const order of sellOrders) {
        const price = order.limitPrice || '0';
        aggregateAsks[price] = (aggregateAsks[price] || 0) + order.remainingQuantity;
      }

      const bids = Object.entries(aggregateBids)
        .map(([price, quantity]) => ({ price: parseFloat(price), quantity }))
        .sort((a, b) => b.price - a.price);

      const asks = Object.entries(aggregateAsks)
        .map(([price, quantity]) => ({ price: parseFloat(price), quantity }))
        .sort((a, b) => a.price - b.price);

      res.json({ bids, asks });
    } catch (error) {
      console.error("Error fetching order book:", error);
      res.status(500).json({ message: "Failed to fetch order book" });
    }
  });

  // Get my orders
  app.get('/api/orders/my', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;

      // Get orders with word data joined
      const userOrders = await db
        .select({
          order: orders,
          word: words,
        })
        .from(orders)
        .innerJoin(words, eq(orders.wordId, words.id))
        .where(
          and(
            eq(orders.userId, userId),
            or(
              eq(orders.status, 'OPEN'),
              eq(orders.status, 'PARTIALLY_FILLED')
            )
          )
        )
        .orderBy(desc(orders.createdAt));

      res.json(userOrders);
    } catch (error) {
      console.error("Error fetching user orders:", error);
      res.status(500).json({ message: "Failed to fetch orders" });
    }
  });

  // Get all words (dictionary)
  app.get('/api/allwords', async (req, res) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 50;
      const offset = (page - 1) * limit;

      const allWords = await storage.getAllWords(offset, limit);
      res.json(allWords);
    } catch (error) {
      console.error("Error fetching all words:", error);
      res.status(500).json({ message: "Failed to fetch words" });
    }
  });

  // Get all traders
  app.get('/api/traders', async (req, res) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 50;
      const query = (req.query.query as string) || "";
      const offset = (page - 1) * limit;

      // If there's a search query, search by username
      if (query) {
        const traders = await db
          .select()
          .from(users)
          .where(sql`LOWER(${users.username}) LIKE LOWER(${'%' + query + '%'})`)
          .orderBy(desc(users.wbBalance))
          .limit(limit)
          .offset(offset);
        return res.json(traders);
      }

      const allTraders = await storage.getAllTraders(offset, limit);
      res.json(allTraders);
    } catch (error) {
      console.error("Error fetching traders:", error);
      res.status(500).json({ message: "Failed to fetch traders" });
    }
  });

  // Get top words (for dashboard)
  app.get('/api/words/top', async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 10;
      const topWords = await storage.getTopWords(limit);
      res.json(topWords);
    } catch (error) {
      console.error("Error fetching top words:", error);
      res.status(500).json({ message: "Failed to fetch top words" });
    }
  });

  // Get ticker words (for stock ticker with filters)
  app.get('/api/words/ticker', async (req, res) => {
    try {
      const filter = req.query.filter as string || 'trending';
      const limit = 20; // Show 20 words in ticker

      let orderByClause;
      // Show both TRADING and IPO_FAILED words (failed IPOs are still tradeable)
      let whereCondition = or(eq(words.ipoStatus, 'TRADING'), eq(words.ipoStatus, 'IPO_FAILED'));

      switch (filter) {
        case 'gainers':
          // Top gainers - would need 24h price change calculation
          // For now, sort by current price change or volume
          orderByClause = desc(words.volume24h);
          break;
        case 'losers':
          // Top losers - similar to gainers
          orderByClause = asc(words.volume24h);
          break;
        case 'volume':
          // Most traded
          orderByClause = desc(words.tradeCount);
          break;
        case 'trending':
        default:
          // Mix of volume and recent activity
          orderByClause = desc(words.volume24h);
          break;
      }

      const tickerWords = await db
        .select({
          id: words.id,
          textNormalized: words.textNormalized,
          displayText: words.displayText,
          currentPrice: words.currentPrice,
          change24h: sql<number>`0`, // TODO: Calculate actual 24h change
          tradeCount: words.tradeCount,
          ipoStatus: words.ipoStatus,
        })
        .from(words)
        .where(whereCondition)
        .orderBy(orderByClause)
        .limit(limit);

      res.json(tickerWords);
    } catch (error) {
      console.error("Error fetching ticker words:", error);
      res.status(500).json({ message: "Failed to fetch ticker words" });
    }
  });

  // Get leaderboard (top traders)
  app.get('/api/leaderboard', async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 10;
      const topTraders = await storage.getTopTraders(limit);
      res.json(topTraders);
    } catch (error) {
      console.error("Error fetching leaderboard:", error);
      res.status(500).json({ message: "Failed to fetch leaderboard" });
    }
  });

  // Get portfolio
  app.get('/api/portfolio', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const portfolio = await storage.getUserPortfolio(userId);
      res.json(portfolio);
    } catch (error) {
      console.error("Error fetching portfolio:", error);
      res.status(500).json({ message: "Failed to fetch portfolio" });
    }
  });

  // Get transactions with word data, filtering, and search
  app.get('/api/transactions', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 50;
      const offset = (page - 1) * limit;
      const type = req.query.type as string; // ALL, BUY, SELL, IPO
      const search = req.query.search as string;

      // Build conditions array
      let conditions: any[] = [eq(transactions.userId, userId)];

      // Filter by transaction type
      if (type === "BUY") {
        conditions.push(
          or(
            eq(transactions.type, "LIMIT_BUY"),
            eq(transactions.type, "MARKET_BUY")
          )
        );
      } else if (type === "SELL") {
        conditions.push(
          or(
            eq(transactions.type, "LIMIT_SELL"),
            eq(transactions.type, "MARKET_SELL")
          )
        );
      } else if (type === "IPO") {
        conditions.push(eq(transactions.type, "IPO_BUY"));
      }

      // Filter by word search
      if (search && search.trim()) {
        const { ilike } = await import("drizzle-orm");
        conditions.push(ilike(words.displayText, `%${search.trim()}%`));
      }

      // Get transactions with word data joined
      const userTransactions = await db
        .select({
          transaction: transactions,
          word: words,
        })
        .from(transactions)
        .leftJoin(words, eq(transactions.wordId, words.id))
        .where(and(...conditions))
        .orderBy(desc(transactions.createdAt))
        .limit(limit)
        .offset(offset);

      res.json(userTransactions);
    } catch (error) {
      console.error("Error fetching transactions:", error);
      res.status(500).json({ message: "Failed to fetch transactions" });
    }
  });

  // Get active IPOs
  app.get('/api/ipos/active', async (req, res) => {
    try {
      const activeIpos = await storage.getActiveIpos();
      res.json(activeIpos);
    } catch (error) {
      console.error("Error fetching active IPOs:", error);
      res.status(500).json({ message: "Failed to fetch active IPOs" });
    }
  });

  // Get word by ID
  app.get('/api/words/:wordId', async (req, res) => {
    try {
      const { wordId } = req.params;
      const word = await storage.getWord(wordId);
      if (!word) {
        return res.status(404).json({ message: "Word not found" });
      }
      res.json(word);
    } catch (error) {
      console.error("Error fetching word:", error);
      res.status(500).json({ message: "Failed to fetch word" });
    }
  });

  // Get trades for a word
  app.get('/api/words/:wordId/trades', async (req, res) => {
    try {
      const { wordId } = req.params;
      const limit = parseInt(req.query.limit as string) || 50;
      const wordTrades = await storage.getWordTrades(wordId, limit);
      res.json(wordTrades);
    } catch (error) {
      console.error("Error fetching word trades:", error);
      res.status(500).json({ message: "Failed to fetch trades" });
    }
  });

  // Get word price history (all trades for a word)
  app.get('/api/words/:id/history', async (req, res) => {
    try {
      const { id } = req.params;

      // Get all trades for this word ordered by time
      const priceHistory = await db
        .select({
          price: trades.price,
          quantity: trades.quantity,
          totalValue: trades.totalValue,
          createdAt: trades.createdAt,
          isIpo: trades.isIpo,
        })
        .from(trades)
        .where(eq(trades.wordId, id))
        .orderBy(desc(trades.createdAt))
        .limit(100);

      res.json(priceHistory);
    } catch (error) {
      console.error("Error fetching word price history:", error);
      res.status(500).json({ message: "Failed to fetch price history" });
    }
  });

  // Get user profile data (for viewing other users)
  app.get('/api/users/:id', async (req, res) => {
    try {
      const { id } = req.params;

      // Get user basic info
      const [user] = await db
        .select({
          id: users.id,
          username: users.username,
          wbBalance: users.wbBalance,
          totalEarnings: users.totalEarnings,
          createdAt: users.createdAt,
        })
        .from(users)
        .where(eq(users.id, id))
        .limit(1);

      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Get user's portfolio
      const portfolio = await db
        .select({
          holding: holdings,
          word: words,
        })
        .from(holdings)
        .leftJoin(words, eq(holdings.wordId, words.id))
        .where(eq(holdings.userId, id))
        .orderBy(desc(holdings.quantity));

      // Get user's recent trades (last 20)
      const recentTrades = await db
        .select({
          trade: trades,
          word: words,
        })
        .from(trades)
        .leftJoin(words, eq(trades.wordId, words.id))
        .where(or(eq(trades.buyerId, id), eq(trades.sellerId, id)))
        .orderBy(desc(trades.createdAt))
        .limit(20);

      // Get word submission stats
      const [submittedWords] = await db
        .select({ count: sql<number>`count(*)` })
        .from(words)
        .where(eq(words.creatorId, id));

      res.json({
        user,
        portfolio,
        recentTrades,
        submittedWordsCount: Number(submittedWords.count),
      });
    } catch (error) {
      console.error("Error fetching user profile:", error);
      res.status(500).json({ message: "Failed to fetch user profile" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}

// Order matching engine (simplified version)
export async function matchOrders(wordId: string, newOrderId: string) {
  try {
    const newOrder = await storage.getOrder(newOrderId);
    if (!newOrder || newOrder.status === 'FILLED' || newOrder.status === 'CANCELLED') {
      return;
    }

    const oppositeSide = newOrder.side === 'BUY' ? 'SELL' : 'BUY';
    const oppositeOrders = await storage.getOpenOrders(wordId, oppositeSide);

    for (const oppositeOrder of oppositeOrders) {
      if (newOrder.remainingQuantity <= 0) {
        break;
      }

      const canMatch = newOrder.orderType === 'MARKET' || oppositeOrder.orderType === 'MARKET' ||
        (newOrder.side === 'BUY' && parseFloat(newOrder.limitPrice || '0') >= parseFloat(oppositeOrder.limitPrice || '0')) ||
        (newOrder.side === 'SELL' && parseFloat(newOrder.limitPrice || '999999') <= parseFloat(oppositeOrder.limitPrice || '999999'));

      if (!canMatch) {
        continue;
      }

      const matchQuantity = Math.min(newOrder.remainingQuantity, oppositeOrder.remainingQuantity);
      const matchPrice = parseFloat(oppositeOrder.limitPrice || newOrder.limitPrice || '0');

      await executeTrade(newOrder, oppositeOrder, matchQuantity, matchPrice);

      const updatedNewOrder = await storage.getOrder(newOrderId);
      if (!updatedNewOrder || updatedNewOrder.remainingQuantity <= 0) {
        break;
      }
      Object.assign(newOrder, updatedNewOrder);
    }
  } catch (error) {
    console.error("Error matching orders:", error);
  }
}

// Execute a trade between two orders
async function executeTrade(buyOrder: any, sellOrder: any, quantity: number, price: number) {
  await db.transaction(async (tx) => {
    const totalValue = quantity * price;
    const buyerFee = calculateTradingFee(totalValue);
    const sellerFee = calculateTradingFee(totalValue);

    const [buyer] = await tx.select().from(users).where(eq(users.id, buyOrder.userId)).for('update');
    const [seller] = await tx.select().from(users).where(eq(users.id, sellOrder.userId)).for('update');
    const [word] = await tx.select().from(words).where(eq(words.id, buyOrder.wordId)).for('update');

    if (!buyer || !seller || !word) {
      throw new Error("Missing buyer, seller, or word");
    }

    const buyerBalance = parseFloat(buyer.wbBalance);
    const totalCost = totalValue + buyerFee;

    if (buyerBalance < totalCost) {
      throw new Error("Buyer insufficient balance");
    }

    const newBuyerBalance = (buyerBalance - totalCost).toFixed(2);
    const sellerBalance = parseFloat(seller.wbBalance);
    const sellerReceives = totalValue - sellerFee;
    const newSellerBalance = (sellerBalance + sellerReceives).toFixed(2);

    await tx.update(users).set({ wbBalance: newBuyerBalance, updatedAt: new Date() }).where(eq(users.id, buyer.id));
    await tx.update(users).set({ wbBalance: newSellerBalance, updatedAt: new Date() }).where(eq(users.id, seller.id));

    const [buyerHolding] = await tx.select().from(holdings).where(and(eq(holdings.userId, buyer.id), eq(holdings.wordId, word.id))).for('update');

    if (buyerHolding) {
      await tx.update(holdings).set({
        quantity: buyerHolding.quantity + quantity,
        availableQuantity: buyerHolding.availableQuantity + quantity,
        updatedAt: new Date(),
      }).where(eq(holdings.id, buyerHolding.id));
    } else {
      await tx.insert(holdings).values({
        userId: buyer.id,
        wordId: word.id,
        quantity,
        availableQuantity: quantity,
        lockedQuantity: 0,
        averageCost: price.toFixed(2),
      });
    }

    const [sellerHolding] = await tx.select().from(holdings).where(and(eq(holdings.userId, seller.id), eq(holdings.wordId, word.id))).for('update');

    if (sellerHolding) {
      await tx.update(holdings).set({
        quantity: sellerHolding.quantity - quantity,
        lockedQuantity: sellerHolding.lockedQuantity - quantity,
        updatedAt: new Date(),
      }).where(eq(holdings.id, sellerHolding.id));
    }

    await tx.update(words).set({
      lastTradePrice: price.toFixed(2),
      currentPrice: price.toFixed(2),
      tradeCount: word.tradeCount + 1,
      updatedAt: new Date(),
    }).where(eq(words.id, word.id));

    const [trade] = await tx.insert(trades).values({
      wordId: word.id,
      buyerId: buyer.id,
      sellerId: seller.id,
      buyOrderId: buyOrder.id,
      sellOrderId: sellOrder.id,
      quantity,
      price: price.toFixed(2),
      totalValue: totalValue.toFixed(2),
      buyerFee: buyerFee.toFixed(2),
      sellerFee: sellerFee.toFixed(2),
      isIpo: false,
    }).returning();

    await tx.insert(transactions).values({
      userId: buyer.id,
      wordId: word.id,
      tradeId: trade.id,
      type: 'BUY',
      quantity,
      pricePerShare: price.toFixed(2),
      totalAmount: `-${totalCost.toFixed(2)}`,
      fee: buyerFee.toFixed(2),
      balanceBefore: buyer.wbBalance,
      balanceAfter: newBuyerBalance,
      description: `Bought ${quantity} shares of ${word.textNormalized} at ${price.toFixed(2)} WB`,
    });

    await tx.insert(transactions).values({
      userId: seller.id,
      wordId: word.id,
      tradeId: trade.id,
      type: 'SELL',
      quantity,
      pricePerShare: price.toFixed(2),
      totalAmount: sellerReceives.toFixed(2),
      fee: sellerFee.toFixed(2),
      balanceBefore: seller.wbBalance,
      balanceAfter: newSellerBalance,
      description: `Sold ${quantity} shares of ${word.textNormalized} at ${price.toFixed(2)} WB`,
    });

    const newBuyRemaining = buyOrder.remainingQuantity - quantity;
    const newBuyFilled = buyOrder.filledQuantity + quantity;
    const newBuyStatus = newBuyRemaining <= 0 ? 'FILLED' : 'PARTIALLY_FILLED';

    await tx.update(orders).set({
      filledQuantity: newBuyFilled,
      remainingQuantity: newBuyRemaining,
      status: newBuyStatus,
      updatedAt: new Date(),
    }).where(eq(orders.id, buyOrder.id));

    const newSellRemaining = sellOrder.remainingQuantity - quantity;
    const newSellFilled = sellOrder.filledQuantity + quantity;
    const newSellStatus = newSellRemaining <= 0 ? 'FILLED' : 'PARTIALLY_FILLED';

    await tx.update(orders).set({
      filledQuantity: newSellFilled,
      remainingQuantity: newSellRemaining,
      status: newSellStatus,
      updatedAt: new Date(),
    }).where(eq(orders.id, sellOrder.id));
  });
}
