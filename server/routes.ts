import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { db } from "./db";
import { words, users, transactions, receipts, shareHoldings } from "@shared/schema";
import { eq, and } from "drizzle-orm";
import bcrypt from "bcryptjs";
import passport from "passport";

// Helper function to normalize word text: ALL CAPS, NO SPACES
function normalizeWord(text: string): string {
  return text.toUpperCase().replace(/\s+/g, '');
}

// Supply/Demand Pricing: Linear bonding curve
// Price increases as more shares are sold from the pool
// Formula: basePrice * (1 + 0.5 * sharesOutstanding / totalShares)
// Price ranges from $1.025 (at 50 shares) to $1.50 (at 1000 shares)
function calculateCurrentPrice(sharesOutstanding: number, totalShares: number = 1000): number {
  const basePrice = 1.00;
  const k = 0.5; // Linear price multiplier
  const ratio = sharesOutstanding / totalShares;
  const price = basePrice * (1 + k * ratio);
  return Math.max(1.00, price); // Minimum $1.00
}

// Calculate price after a buy/sell transaction
function calculateNewPrice(currentShares: number, shareDelta: number, totalShares: number = 1000): number {
  const newShares = currentShares + shareDelta;
  return calculateCurrentPrice(newShares, totalShares);
}

// Helper function to calculate fee (0.5%)
function calculateFee(amount: number): number {
  return amount * 0.005;
}

// Apply platform spread (2% markup for buys, 2% markdown for sells)
function applySpread(currentPrice: number, isBuy: boolean): number {
  return isBuy ? currentPrice * 1.02 : currentPrice * 0.98;
}

// Helper function to generate receipt data
function generateReceiptData(transaction: any, word?: any): any {
  return {
    receiptId: transaction.id,
    date: transaction.createdAt,
    action: transaction.type,
    word: word?.textNormalized || null,
    quantity: transaction.quantity,
    pricePerShare: transaction.pricePerShare,
    totalAmount: transaction.totalAmount,
    fee: transaction.fee,
    balanceBefore: transaction.balanceBefore,
    balanceAfter: transaction.balanceAfter,
    description: transaction.description,
    transactionId: transaction.id,
  };
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);

  // Signup endpoint
  app.post('/api/signup', async (req, res, next) => {
    try {
      const { username, password, email, firstName, lastName } = req.body;

      // Validate required fields
      if (!username || !password) {
        return res.status(400).json({ message: "Username and password are required" });
      }

      if (username.length < 3 || username.length > 50) {
        return res.status(400).json({ message: "Username must be 3-50 characters" });
      }

      if (password.length < 6) {
        return res.status(400).json({ message: "Password must be at least 6 characters" });
      }

      // Check if username already exists
      const [existingUser] = await db
        .select()
        .from(users)
        .where(eq(users.username, username))
        .limit(1);

      if (existingUser) {
        return res.status(400).json({ message: "Username already taken" });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Create user
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

      // Log the user in automatically
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
        // Return only safe, non-sensitive user data
        res.json({ 
          message: "Signup successful", 
          user: {
            id: newUser.id,
            username: newUser.username,
            email: newUser.email,
            firstName: newUser.firstName,
            lastName: newUser.lastName,
          }
        });
      });
    } catch (error: any) {
      console.error("Signup error:", error);
      res.status(500).json({ message: "Failed to create account" });
    }
  });

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Check for daily login bonus (100 WB if last login was > 24 hours ago)
      const now = new Date();
      const lastLogin = user.lastLogin ? new Date(user.lastLogin) : null;
      
      if (!lastLogin || (now.getTime() - lastLogin.getTime()) > 24 * 60 * 60 * 1000) {
        // Use atomic transaction for daily bonus
        await db.transaction(async (tx) => {
          const dailyBonus = 100;
          const newBalance = (parseFloat(user.wbBalance) + dailyBonus).toFixed(2);
          const newEarnings = (parseFloat(user.totalEarnings) + dailyBonus).toFixed(2);
          
          // Update user balance and login atomically
          await tx
            .update(users)
            .set({ 
              wbBalance: newBalance,
              totalEarnings: newEarnings,
              lastLogin: now,
              updatedAt: new Date()
            })
            .where(eq(users.id, userId));
          
          // Create transaction record
          const [transaction] = await tx
            .insert(transactions)
            .values({
              userId,
              wordId: null,
              type: 'DAILY_LOGIN',
              quantity: null,
              pricePerShare: null,
              totalAmount: dailyBonus.toFixed(2),
              fee: '0.00',
              balanceBefore: user.wbBalance,
              balanceAfter: newBalance,
              description: 'Daily login bonus',
            })
            .returning();
          
          // Create receipt
          await tx
            .insert(receipts)
            .values({
              transactionId: transaction.id,
              receiptData: generateReceiptData(transaction),
            });
          
          user.wbBalance = newBalance;
          user.totalEarnings = newEarnings;
          user.lastLogin = now;
        });
      }
      
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Word submission endpoint
  app.post('/api/words', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { text } = req.body;
      
      if (!text || typeof text !== 'string') {
        return res.status(400).json({ message: "Invalid word text" });
      }
      
      const normalized = normalizeWord(text);
      
      if (normalized.length === 0 || normalized.length > 100) {
        return res.status(400).json({ message: "Word must be 1-100 characters after normalization" });
      }
      
      const submissionFee = 10;
      
      // Use atomic transaction for word submission with validation inside
      const result = await db.transaction(async (tx) => {
        // Check for duplicates inside transaction
        const [existing] = await tx
          .select()
          .from(words)
          .where(eq(words.textNormalized, normalized))
          .limit(1);
        
        if (existing) {
          throw new Error("This word already exists");
        }
        
        // Get and validate user balance inside transaction (with row lock)
        const [user] = await tx
          .select()
          .from(users)
          .where(eq(users.id, userId))
          .for('update');
        
        if (!user) {
          throw new Error("User not found");
        }
        
        const balance = parseFloat(user.wbBalance);
        if (balance < submissionFee) {
          throw new Error("Insufficient balance. Need 10 WB to submit a word.");
        }
        const newBalance = (balance - submissionFee).toFixed(2);
        
        // Update user balance
        await tx
          .update(users)
          .set({ wbBalance: newBalance, updatedAt: new Date() })
          .where(eq(users.id, userId));
        
        // Create the word
        const [word] = await tx
          .insert(words)
          .values({
            textNormalized: normalized,
            displayText: text,
            submitterId: userId,
          })
          .returning();
        
        // Grant creator 50 shares
        const creatorShares = 50;
        const costBasis = '0.00';
        await tx
          .insert(shareHoldings)
          .values({
            userId,
            wordId: word.id,
            quantity: creatorShares,
            costBasis,
          });
        
        // Create transaction record
        const [transaction] = await tx
          .insert(transactions)
          .values({
            userId,
            wordId: word.id,
            type: 'SUBMIT_WORD',
            quantity: creatorShares,
            pricePerShare: '0.00',
            totalAmount: `-${submissionFee.toFixed(2)}`,
            fee: '0.00',
            balanceBefore: user.wbBalance,
            balanceAfter: newBalance,
            description: `Submitted word: ${normalized} (received ${creatorShares} creator shares)`,
          })
          .returning();
        
        // Create receipt
        await tx
          .insert(receipts)
          .values({
            transactionId: transaction.id,
            receiptData: generateReceiptData(transaction, word),
          });
        
        return { word, transaction };
      });
      
      res.json({ ...result, receiptId: result.transaction.id });
    } catch (error: any) {
      console.error("Error submitting word:", error);
      res.status(500).json({ message: error.message || "Failed to submit word" });
    }
  });

  // Trading endpoint (buy/sell)
  app.post('/api/trade', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { wordId, quantity, action } = req.body;
      
      if (!wordId || !quantity || !action) {
        return res.status(400).json({ message: "Missing required fields" });
      }
      
      if (!['buy', 'sell'].includes(action)) {
        return res.status(400).json({ message: "Action must be 'buy' or 'sell'" });
      }
      
      const quantityNum = parseInt(quantity);
      if (isNaN(quantityNum) || quantityNum <= 0) {
        return res.status(400).json({ message: "Invalid quantity" });
      }
      
      const isBuy = action === 'buy';
      
      if (isBuy) {
        // BUY logic - all validation inside transaction
        const result = await db.transaction(async (tx) => {
          // Lock and get word data
          const [word] = await tx
            .select()
            .from(words)
            .where(eq(words.id, wordId))
            .for('update');
          
          if (!word) {
            throw new Error("Word not found");
          }
          
          // Lock and get user data
          const [user] = await tx
            .select()
            .from(users)
            .where(eq(users.id, userId))
            .for('update');
          
          if (!user) {
            throw new Error("User not found");
          }
          
          // Calculate prices with locked data
          const userBalance = parseFloat(user.wbBalance);
          const currentPrice = parseFloat(word.currentPrice);
          const pricePerShare = applySpread(currentPrice, true); // Buy at current price + 2% spread
          const subtotal = pricePerShare * quantityNum;
          const fee = calculateFee(subtotal);
          const total = subtotal + fee;
          
          // Validate inside transaction
          const availableShares = word.totalShares - word.sharesOutstanding;
          if (quantityNum > availableShares) {
            throw new Error(`Only ${availableShares} shares available from platform`);
          }
          
          if (total > userBalance) {
            throw new Error("Insufficient balance");
          }
          const newBalance = (userBalance - total).toFixed(2);
          
          // Calculate new price after buying (price goes UP)
          const newPrice = calculateNewPrice(word.sharesOutstanding, quantityNum, word.totalShares);
          
          // Update user balance
          await tx
            .update(users)
            .set({ wbBalance: newBalance, updatedAt: new Date() })
            .where(eq(users.id, userId));
          
          // Update shares outstanding AND price
          await tx
            .update(words)
            .set({ 
              sharesOutstanding: word.sharesOutstanding + quantityNum,
              currentPrice: newPrice.toFixed(2),
              updatedAt: new Date()
            })
            .where(eq(words.id, wordId));
          
          // Lock and update or create shareholding
          const [existingHolding] = await tx
            .select()
            .from(shareHoldings)
            .where(and(eq(shareHoldings.userId, userId), eq(shareHoldings.wordId, wordId)))
            .for('update');
          
          if (existingHolding) {
            const newQuantity = existingHolding.quantity + quantityNum;
            const newCostBasis = (parseFloat(existingHolding.costBasis) + subtotal).toFixed(2);
            await tx
              .update(shareHoldings)
              .set({ quantity: newQuantity, costBasis: newCostBasis, updatedAt: new Date() })
              .where(eq(shareHoldings.id, existingHolding.id));
          } else {
            await tx
              .insert(shareHoldings)
              .values({ userId, wordId, quantity: quantityNum, costBasis: subtotal.toFixed(2) });
          }
          
          // Create transaction record
          const [transaction] = await tx
            .insert(transactions)
            .values({
              userId,
              wordId,
              type: 'BUY',
              quantity: quantityNum,
              pricePerShare: pricePerShare.toFixed(2),
              totalAmount: subtotal.toFixed(2),
              fee: fee.toFixed(2),
              balanceBefore: user.wbBalance,
              balanceAfter: newBalance,
              description: `Bought ${quantityNum} shares of ${word.textNormalized}`,
            })
            .returning();
          
          // Create receipt
          await tx
            .insert(receipts)
            .values({
              transactionId: transaction.id,
              receiptData: generateReceiptData(transaction, word),
            });
          
          return transaction;
        });
        
        res.json({ success: true, transaction: result, receiptId: result.id });
      } else {
        // SELL logic - all validation inside transaction
        const result = await db.transaction(async (tx) => {
          // Lock and get word data
          const [word] = await tx
            .select()
            .from(words)
            .where(eq(words.id, wordId))
            .for('update');
          
          if (!word) {
            throw new Error("Word not found");
          }
          
          // Lock and get user data
          const [user] = await tx
            .select()
            .from(users)
            .where(eq(users.id, userId))
            .for('update');
          
          if (!user) {
            throw new Error("User not found");
          }
          
          // Lock and get holding data
          const [holding] = await tx
            .select()
            .from(shareHoldings)
            .where(and(eq(shareHoldings.userId, userId), eq(shareHoldings.wordId, wordId)))
            .for('update');
          
          if (!holding || holding.quantity < quantityNum) {
            throw new Error(`You only own ${holding?.quantity || 0} shares`);
          }
          
          // Calculate prices with locked data
          const userBalance = parseFloat(user.wbBalance);
          const currentPrice = parseFloat(word.currentPrice);
          const pricePerShare = applySpread(currentPrice, false); // Sell at current price - 2% spread
          const subtotal = pricePerShare * quantityNum;
          const fee = calculateFee(subtotal);
          const proceeds = subtotal - fee;
          const newBalance = (userBalance + proceeds).toFixed(2);
          
          // Calculate new price after selling (price goes DOWN)
          const newPrice = calculateNewPrice(word.sharesOutstanding, -quantityNum, word.totalShares);
          
          // Update user balance
          await tx
            .update(users)
            .set({ wbBalance: newBalance, updatedAt: new Date() })
            .where(eq(users.id, userId));
          
          // Update shares outstanding AND price
          await tx
            .update(words)
            .set({ 
              sharesOutstanding: word.sharesOutstanding - quantityNum,
              currentPrice: newPrice.toFixed(2),
              updatedAt: new Date()
            })
            .where(eq(words.id, wordId));
          
          // Update or delete shareholding
          const newQuantity = holding.quantity - quantityNum;
          if (newQuantity > 0) {
            const costBasisPerShare = parseFloat(holding.costBasis) / holding.quantity;
            const newCostBasis = (costBasisPerShare * newQuantity).toFixed(2);
            await tx
              .update(shareHoldings)
              .set({ quantity: newQuantity, costBasis: newCostBasis, updatedAt: new Date() })
              .where(eq(shareHoldings.id, holding.id));
          } else {
            await tx
              .delete(shareHoldings)
              .where(eq(shareHoldings.id, holding.id));
          }
          
          // Create transaction record
          const [transaction] = await tx
            .insert(transactions)
            .values({
              userId,
              wordId,
              type: 'SELL',
              quantity: quantityNum,
              pricePerShare: pricePerShare.toFixed(2),
              totalAmount: subtotal.toFixed(2),
              fee: fee.toFixed(2),
              balanceBefore: user.wbBalance,
              balanceAfter: newBalance,
              description: `Sold ${quantityNum} shares of ${word.textNormalized}`,
            })
            .returning();
          
          // Create receipt
          await tx
            .insert(receipts)
            .values({
              transactionId: transaction.id,
              receiptData: generateReceiptData(transaction, word),
            });
          
          return transaction;
        });
        
        res.json({ success: true, transaction: result, receiptId: result.id });
      }
    } catch (error: any) {
      console.error("Error executing trade:", error);
      res.status(500).json({ message: error.message || "Failed to execute trade" });
    }
  });

  // Get top words by intrinsic value
  app.get('/api/words/top', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const topWords = await storage.getTopWords(20);
      
      // Enrich with user's shareholdings
      const enrichedWords = await Promise.all(
        topWords.map(async (word) => {
          const holding = await storage.getShareHolding(userId, word.id);
          return {
            ...word,
            userShares: holding?.quantity || 0,
          };
        })
      );
      
      res.json(enrichedWords);
    } catch (error) {
      console.error("Error fetching top words:", error);
      res.status(500).json({ message: "Failed to fetch words" });
    }
  });

  // Get trending words for ticker
  app.get('/api/words/trending', async (req, res) => {
    try {
      const trendingWords = await storage.getTopWords(10);
      
      const enriched = trendingWords.map((word) => ({
        id: word.id,
        textNormalized: word.textNormalized,
        currentPrice: word.currentPrice,
        change24h: 0, // TODO: Calculate from historical data
      }));
      
      res.json(enriched);
    } catch (error) {
      console.error("Error fetching trending words:", error);
      res.status(500).json({ message: "Failed to fetch trending words" });
    }
  });

  // Get user portfolio
  app.get('/api/portfolio', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const holdings = await storage.getUserPortfolio(userId);
      
      const enriched = await Promise.all(
        holdings.map(async (holding) => {
          const word = await storage.getWord(holding.wordId);
          if (!word) return null;
          
          const currentValue = parseFloat(word.currentPrice) * holding.quantity;
          const costBasis = parseFloat(holding.costBasis);
          const profitLoss = currentValue - costBasis;
          const profitLossPercent = costBasis > 0 ? (profitLoss / costBasis) * 100 : 0;
          
          return {
            word: {
              id: word.id,
              textNormalized: word.textNormalized,
              currentPrice: word.currentPrice,
            },
            quantity: holding.quantity,
            costBasis: holding.costBasis,
            currentValue,
            profitLoss,
            profitLossPercent,
          };
        })
      );
      
      res.json(enriched.filter(Boolean));
    } catch (error) {
      console.error("Error fetching portfolio:", error);
      res.status(500).json({ message: "Failed to fetch portfolio" });
    }
  });

  // Get leaderboard (sorted by total portfolio value)
  app.get('/api/leaderboard', async (req, res) => {
    try {
      // Fetch all users with their holdings and word prices in a single efficient query
      const allUsers = await db.select().from(users);
      
      // Fetch all holdings with word prices in one join query
      const holdingsWithPrices = await db
        .select({
          userId: shareHoldings.userId,
          quantity: shareHoldings.quantity,
          currentPrice: words.currentPrice,
        })
        .from(shareHoldings)
        .leftJoin(words, eq(shareHoldings.wordId, words.id));
      
      // Group holdings by userId and calculate total holdings value
      const holdingsValueByUser = new Map<string, number>();
      for (const holding of holdingsWithPrices) {
        const currentValue = holdingsValueByUser.get(holding.userId) || 0;
        const holdingValue = holding.quantity * parseFloat(holding.currentPrice || '0');
        holdingsValueByUser.set(holding.userId, currentValue + holdingValue);
      }
      
      // Calculate portfolio value for each user
      const usersWithValue = allUsers.map((user) => {
        const holdingsValue = holdingsValueByUser.get(user.id) || 0;
        const cashBalance = parseFloat(user.wbBalance);
        const totalValue = cashBalance + holdingsValue;
        
        return {
          ...user,
          portfolioValue: totalValue,
          holdingsValue: holdingsValue,
        };
      });
      
      // Sort by portfolio value (numeric) and take top 10
      const sorted = usersWithValue
        .sort((a, b) => b.portfolioValue - a.portfolioValue)
        .slice(0, 10)
        .map((user, index) => ({
          ...user,
          portfolioValue: user.portfolioValue.toFixed(2),
          holdingsValue: user.holdingsValue.toFixed(2),
          rank: index + 1,
        }));
      
      res.json(sorted);
    } catch (error) {
      console.error("Error fetching leaderboard:", error);
      res.status(500).json({ message: "Failed to fetch leaderboard" });
    }
  });

  const httpServer = createServer(app);

  // WebSocket for real-time updates - see blueprint javascript_websocket
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });
  
  wss.on('connection', (ws: WebSocket) => {
    console.log('WebSocket client connected');
    
    ws.on('close', () => {
      console.log('WebSocket client disconnected');
    });
  });

  return httpServer;
}
