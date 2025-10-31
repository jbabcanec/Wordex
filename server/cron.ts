import cron from 'node-cron';
import { storage } from './storage';
import { db } from './db';
import { words, holdings, vestingSchedules, users, transactions, trades } from '@shared/schema';
import { eq, and, sql } from 'drizzle-orm';
import {
  IPO_DURATION_HOURS,
  IPO_END_PRICE,
  MIN_IPO_SHARES_SOLD,
  calculateIpoPrice,
  calculateVestingUnlocked,
} from '@shared/constants';

// Refund all participants of a failed IPO
async function refundFailedIpo(wordId: string) {
  try {
    // Find all IPO trades for this word
    const ipoTrades = await db
      .select()
      .from(trades)
      .where(and(eq(trades.wordId, wordId), eq(trades.isIpo, true)));

    for (const trade of ipoTrades) {
      await db.transaction(async (tx) => {
        // Refund the buyer
        const [buyer] = await tx
          .select()
          .from(users)
          .where(eq(users.id, trade.buyerId))
          .for('update');

        if (!buyer) {
          console.error(`[REFUND] Buyer ${trade.buyerId} not found for trade ${trade.id}`);
          return;
        }

        const refundAmount = parseFloat(trade.totalValue) + parseFloat(trade.buyerFee);
        const newBalance = (parseFloat(buyer.wbBalance) + refundAmount).toFixed(2);

        await tx
          .update(users)
          .set({ wbBalance: newBalance, updatedAt: new Date() })
          .where(eq(users.id, buyer.id));

        // Remove the holding
        await tx
          .delete(holdings)
          .where(and(eq(holdings.userId, trade.buyerId), eq(holdings.wordId, wordId)));

        // Create refund transaction record
        await tx
          .insert(transactions)
          .values({
            userId: trade.buyerId,
            wordId,
            tradeId: trade.id,
            type: 'IPO_REFUND',
            quantity: trade.quantity,
            pricePerShare: trade.price,
            totalAmount: refundAmount.toFixed(2),
            fee: '0.00',
            balanceBefore: buyer.wbBalance,
            balanceAfter: newBalance,
            description: `IPO refund: ${trade.quantity} shares refunded (IPO failed)`,
          });

        console.log(`[REFUND] Refunded ${refundAmount.toFixed(2)} WB to user ${trade.buyerId} for failed IPO`);
      });
    }
  } catch (error) {
    console.error(`[REFUND] Error refunding failed IPO for word ${wordId}:`, error);
  }
}

// Update IPO prices hourly (Dutch auction price drop)
export function setupIpoPriceUpdates() {
  // Run every hour
  cron.schedule('0 * * * *', async () => {
    try {
      console.log('[CRON] Running IPO price updates...');
      
      const activeIpos = await storage.getActiveIpos();
      
      for (const word of activeIpos) {
        if (!word.ipoStartedAt || !word.ipoEndsAt) {
          continue;
        }

        const now = new Date();
        const elapsedHours = (now.getTime() - word.ipoStartedAt.getTime()) / (1000 * 60 * 60);
        
        // Check if IPO has expired
        if (now > word.ipoEndsAt || elapsedHours >= IPO_DURATION_HOURS) {
          // IPO expired - determine success or failure
          const soldPercent = word.ipoSharesSold / word.ipoSharesOffered;
          
          if (word.ipoSharesSold >= MIN_IPO_SHARES_SOLD) {
            // IPO succeeded
            await storage.updateWordIpoStatus(word.id, 'TRADING');
            console.log(`[CRON] IPO succeeded for word: ${word.textNormalized} (${word.ipoSharesSold}/${word.ipoSharesOffered} shares sold)`);
          } else {
            // IPO failed - refund all participants
            await storage.updateWordIpoStatus(word.id, 'IPO_FAILED');
            console.log(`[CRON] IPO failed for word: ${word.textNormalized} (only ${word.ipoSharesSold}/${word.ipoSharesOffered} shares sold) - refunding participants`);
            
            // Refund all IPO participants
            await refundFailedIpo(word.id);
          }
        } else {
          // IPO still active - update current price
          const newPrice = calculateIpoPrice(elapsedHours);
          await storage.updateWordIpoPrice(word.id, newPrice.toFixed(2));
          console.log(`[CRON] Updated IPO price for ${word.textNormalized}: ${newPrice.toFixed(2)} WB (${elapsedHours.toFixed(1)}h elapsed)`);
        }
      }
      
      console.log(`[CRON] IPO price updates complete. Processed ${activeIpos.length} active IPOs.`);
    } catch (error) {
      console.error('[CRON] Error updating IPO prices:', error);
    }
  });

  console.log('[CRON] IPO price update job scheduled (runs hourly)');
}

// Unlock vested shares daily at midnight
export function setupVestingUnlocks() {
  // Run daily at midnight
  cron.schedule('0 0 * * *', async () => {
    try {
      console.log('[CRON] Running vesting unlock checks...');
      
      const allVestingSchedules = await storage.getAllVestingSchedules();
      let unlockedCount = 0;
      
      for (const vesting of allVestingSchedules) {
        // Get the word to check creation date
        const word = await storage.getWord(vesting.wordId);
        if (!word || !word.createdAt) {
          continue;
        }

        const now = new Date();
        const daysElapsed = Math.floor((now.getTime() - word.createdAt.getTime()) / (1000 * 60 * 60 * 24));
        
        // Calculate how many shares should be unlocked based on vesting schedule
        const shouldBeUnlocked = calculateVestingUnlocked(daysElapsed, vesting.totalShares);
        
        // If more shares should be unlocked than currently are
        if (shouldBeUnlocked > vesting.unlockedShares) {
          const sharesToUnlock = shouldBeUnlocked - vesting.unlockedShares;
          
          // Update vesting schedule
          await storage.updateVestingSchedule(vesting.id, shouldBeUnlocked);
          
          // Move shares from locked to available in holdings
          const holding = await storage.getHolding(vesting.userId, vesting.wordId);
          if (holding) {
            await db.transaction(async (tx) => {
              const newAvailable = holding.availableQuantity + sharesToUnlock;
              const newLocked = holding.lockedQuantity - sharesToUnlock;
              
              await tx
                .update(holdings)
                .set({
                  availableQuantity: newAvailable,
                  lockedQuantity: newLocked,
                  updatedAt: new Date(),
                })
                .where(eq(holdings.id, holding.id));
            });
            
            console.log(`[CRON] Unlocked ${sharesToUnlock} shares for user ${vesting.userId} in word ${word.textNormalized} (day ${daysElapsed})`);
            unlockedCount++;
          }
        }
      }
      
      console.log(`[CRON] Vesting unlock complete. Unlocked shares for ${unlockedCount} holdings.`);
    } catch (error) {
      console.error('[CRON] Error unlocking vested shares:', error);
    }
  });

  console.log('[CRON] Vesting unlock job scheduled (runs daily at midnight)');
}

// Initialize all cron jobs
export function initializeCronJobs() {
  console.log('[CRON] Initializing scheduled jobs...');
  setupIpoPriceUpdates();
  setupVestingUnlocks();
  console.log('[CRON] All cron jobs initialized successfully');
}
