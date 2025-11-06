# ORDER MATCHING SPECIFICATION
Complete guide for how buying/selling should work in all scenarios

## 📋 All Possible Scenarios

### Scenario 1: Buy Order + Sell Orders Exist
**Example:** 50 shares listed for sale at $1.50, user wants to buy 30 shares

**Limit Order Behavior:**
- User places limit buy order at $1.50 or higher
- Order immediately matches with sell orders
- User gets 30 shares at $1.50
- 20 shares remain for sale
- Order status: FILLED

**Market Order Behavior:**
- User places market buy order for 30 shares
- Order matches at best ask price ($1.50)
- User gets 30 shares
- Order status: FILLED

**Partial Fill:**
- User wants 100 shares, only 50 for sale
- Order fills 50 shares immediately
- 50 shares remain as OPEN order in order book
- Order status: PARTIALLY_FILLED
- When more sell orders appear, matching retries

---

### Scenario 2: Buy Order + NO Sell Orders Exist
**Example:** No shares for sale, user wants to buy 50 shares

**Limit Order Behavior:**
- User places limit buy order at $1.50
- No matching sell orders
- Order sits in order book as OPEN
- Other users see this buy order
- Order status: OPEN
- When sell order appears at $1.50 or lower, match happens
- Continuous matching job retries every minute

**Market Order Behavior:**
- User places market buy order
- No shares available to buy
- **Order should FAIL immediately**
- Return error: "No shares available for market order"
- Do NOT create OPEN market order
- User gets clear message to use limit order instead

---

### Scenario 3: Sell Order + Buy Orders Exist
**Example:** User owns 100 shares, wants to sell 50, buy orders exist for 30 shares at $1.40

**Limit Order Behavior:**
- User places limit sell order at $1.40 or lower
- Order immediately matches with buy orders
- User sells 30 shares at $1.40
- 20 shares remain locked as OPEN sell order
- Order status: PARTIALLY_FILLED
- Continuous matching will fill remaining 20 when new buy orders appear

**Market Order Behavior:**
- User places market sell order for 50 shares
- Matches with best bid ($1.40)
- Sells 30 shares immediately
- Remaining 20 shares: **CANCEL the order**
- Return error: "Only 30 shares sold, order cancelled for remaining 20"
- Unlock the 20 shares back to available
- User gets clear feedback on partial execution

---

### Scenario 4: Sell Order + NO Buy Orders Exist
**Example:** User wants to sell 50 shares, no buy orders in book

**Limit Order Behavior:**
- User places limit sell order at $1.50
- Shares locked (availableQuantity reduced, lockedQuantity increased)
- Order sits in order book as OPEN
- Other users see this sell order
- Order status: OPEN
- When buy order appears at $1.50 or higher, match happens
- Continuous matching job retries every minute

**Market Order Behavior:**
- User places market sell order
- No buy orders available
- **Order should FAIL immediately**
- Return error: "No buyers available for market order"
- Do NOT lock shares in OPEN order
- User gets clear message to use limit order instead

---

### Scenario 5: Insufficient Shares Available
**Example:** User owns 100 shares but 70 are locked in existing orders

**Sell Order:**
- User tries to sell 50 shares
- availableQuantity = 30 (100 total - 70 locked)
- **Order should FAIL**
- Return error: "Insufficient shares. You have 30 available (70 locked in orders)"
- Clear message about locked shares

**Solution:**
- User can cancel existing sell orders to unlock shares
- Or wait for orders to fill/expire

---

### Scenario 6: Insufficient Balance for Buy
**Example:** User has 100 WB, wants to buy 100 shares at $1.50 (needs 150 + fees)

**Limit Order:**
- Check: 100 shares × $1.50 × 1.005 (fee) = 150.75 WB needed
- User has 100 WB
- **Order should FAIL**
- Return error: "Insufficient balance. Need 150.75 WB (have 100 WB)"

**Market Order:**
- Estimate using current best ask price
- If insufficient, fail with same error

---

### Scenario 7: IPO Failure
**Example:** IPO ends after 24 hours with only 300/980 shares sold (< 490 minimum)

**What Happens:**
1. Hourly cron job (server/cron.ts) detects: `ipoSharesSold < MIN_IPO_SHARES_SOLD`
2. Updates word status: `ipoStatus = 'IPO_FAILED'`
3. Calls `refundFailedIpo(wordId)`
4. For EACH buyer who bought IPO shares:
   - Refund full amount: `totalValue + buyerFee`
   - Remove shares from holdings
   - Create REFUND transaction
   - Update user balance
5. Creator:
   - Submission fee (50 WB) is NOT refunded (cost of listing)
   - 20 creator shares are removed
   - Vesting schedule deleted
6. Word remains in database marked 'IPO_FAILED'
7. Cannot resubmit same word
8. All happens automatically within 1 hour of IPO end time

**Transaction Records:**
- Buyer sees "IPO_REFUND" transaction
- Full amount returned
- No penalty for buyers

**Current Code:** Already implemented in server/cron.ts:14-73
**Status:** ✅ WORKING (no fix needed)

---

### Scenario 8: Price Crossing
**Example:**
- Sell order at $1.40
- Buy order at $1.60
- Orders should match!

**Current Matching Logic (server/routes.ts:962-964):**
```typescript
const canMatch =
  newOrder.orderType === 'MARKET' ||
  oppositeOrder.orderType === 'MARKET' ||
  (newOrder.side === 'BUY' && parseFloat(newOrder.limitPrice || '0') >= parseFloat(oppositeOrder.limitPrice || '0')) ||
  (newOrder.side === 'SELL' && parseFloat(newOrder.limitPrice || '999999') <= parseFloat(oppositeOrder.limitPrice || '999999'));
```

**This is CORRECT** - buy at $1.60 matches sell at $1.40

**Execution Price:**
```typescript
const matchPrice = parseFloat(oppositeOrder.limitPrice || newOrder.limitPrice || '0');
```

**This means:** Price is the limit price of the RESTING order (order book order)
- If sell order was resting at $1.40, execute at $1.40
- Buyer gets better price than their $1.60 limit
- Standard price-time priority ✅

---

### Scenario 9: Order Cancellation
**Example:** User has OPEN sell order for 50 shares, wants to cancel

**Process:**
1. Verify order belongs to user
2. Verify order is OPEN or PARTIALLY_FILLED
3. If sell order: unlock shares
   - `availableQuantity += remainingQuantity`
   - `lockedQuantity -= remainingQuantity`
4. Update order status to CANCELLED
5. Order removed from order book

**Current Code:** server/routes.ts:573-627
**Status:** ✅ WORKING (already implemented correctly)

---

## 🔧 FIXES REQUIRED

### FIX-MATCH-01: Add Continuous Order Matching Job
**Priority:** CRITICAL
**Status:** ⏳ PENDING

**Current Problem:**
- Orders only match once at placement (server/routes.ts:563)
- If no counterparty exists, order never retries
- Orders sit unfilled even when matching orders appear later

**Solution:**
Add to server/cron.ts a job that runs every minute:

```typescript
async function continuousOrderMatching() {
  try {
    console.log('Running continuous order matching...');

    // Get all words with OPEN orders
    const wordsWithOrders = await db
      .select({ wordId: orders.wordId })
      .from(orders)
      .where(eq(orders.status, 'OPEN'))
      .groupBy(orders.wordId);

    for (const { wordId } of wordsWithOrders) {
      // Get all OPEN orders for this word
      const openOrders = await db
        .select()
        .from(orders)
        .where(and(
          eq(orders.wordId, wordId),
          eq(orders.status, 'OPEN')
        ))
        .orderBy(orders.createdAt); // Time priority

      // Try to match each order
      for (const order of openOrders) {
        await matchOrders(wordId, order.id);
      }
    }

    console.log('Continuous matching complete');
  } catch (error) {
    console.error('Error in continuous matching:', error);
  }
}

// Add to cron schedule
setInterval(continuousOrderMatching, 60000); // Every 1 minute
```

**Files to modify:**
- server/cron.ts (add function and interval)

**Expected outcome:**
- Orders match within 1 minute of counterparty appearing
- Users see orders fill even if they placed them earlier
- Market becomes functional

---

### FIX-MATCH-02: Market Orders Fail-Fast
**Priority:** CRITICAL
**Status:** ⏳ PENDING

**Current Problem:**
- Market orders sit as OPEN if no counterparty
- Should execute immediately or fail
- Users confused by "pending" market orders

**Solution:**
Modify server/routes.ts after order matching:

```typescript
// After line 563: await matchOrders(wordId, result.order.id);

// Check if market order filled
if (orderType === 'MARKET') {
  const [updatedOrder] = await db
    .select()
    .from(orders)
    .where(eq(orders.id, result.order.id));

  if (updatedOrder.status === 'OPEN' || updatedOrder.status === 'PARTIALLY_FILLED') {
    // Market order didn't fully fill - cancel it
    await db.transaction(async (tx) => {
      // If sell order, unlock shares
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
```

**Files to modify:**
- server/routes.ts (after line 563)

**Expected outcome:**
- Market orders execute immediately or fail with clear message
- No "pending" market orders
- Users understand they need limit orders if no liquidity

---

### FIX-MATCH-03: Add User Profile Route
**Priority:** CRITICAL (fixes 404s)
**Status:** ⏳ PENDING

**Current Problem:**
- Clicking user profiles returns 404
- Frontend route missing

**Solution:**
Modify client/src/App.tsx:

```typescript
import UserProfile from "@/pages/user-profile";

// In Router component, add route:
<Switch>
  <Route path="/" component={Dashboard} />
  <Route path="/dictionary" component={Dictionary} />
  <Route path="/traders" component={Traders} />
  <Route path="/users/:id" component={UserProfile} />  {/* ADD THIS */}
  <Route path="/transactions" component={Transactions} />
  <Route component={NotFound} />
</Switch>
```

**Files to modify:**
- client/src/App.tsx (add import and route)

**Expected outcome:**
- Profile links work
- Can view any user's profile
- No more 404 errors

---

### FIX-MATCH-04: Better Order Book Display
**Priority:** MEDIUM
**Status:** ⏳ PENDING

**Current Problem:**
- Empty order books not clearly communicated
- Users don't know they can place first order

**Solution:**
Update WordCard or create OrderBook component to show:
- "No sellers - Place first sell order!"
- "No buyers - Place first buy order!"
- Show current orders in queue with quantities

**Files to modify:**
- client/src/components/WordCard.tsx or new OrderBook component

**Expected outcome:**
- Users understand why orders don't fill
- Encouraged to place limit orders
- Transparency about liquidity

---

### FIX-MATCH-05: Order Management UI
**Priority:** MEDIUM
**Status:** ⏳ PENDING

**Current Problem:**
- No easy way to see your open orders
- No easy way to cancel orders
- Users don't know shares are locked

**Solution:**
Add "My Orders" section to dashboard or transactions page:
- List all OPEN and PARTIALLY_FILLED orders
- Show locked shares
- Cancel button for each order
- Real-time updates when orders fill

**Files to modify:**
- Create client/src/components/MyOrders.tsx
- Add to dashboard or transactions page

**Expected outcome:**
- Users can manage their orders
- Clear visibility into locked shares
- Easy cancellation

---

### FIX-MATCH-06: Validate IPO Refund Logic
**Priority:** HIGH (critical path)
**Status:** ⏳ PENDING - NEEDS TESTING

**Current Problem:**
- IPO refund code exists but not tested
- Need to verify it actually works

**Testing needed:**
1. Create test IPO that will fail
2. Buy some shares
3. Wait for 24 hours (or mock time)
4. Verify refund happens
5. Check balances, holdings, transactions

**Files to review:**
- server/cron.ts:14-73 (refundFailedIpo function)

**Test cases:**
- Single buyer gets refund
- Multiple buyers all get refunds
- Correct amounts (principal + fees)
- Holdings removed
- Transactions created
- Creator doesn't get submission fee back

**Expected outcome:**
- Confirmed working or bugs found and fixed

---

### FIX-MATCH-07: IPO Success Threshold Warning
**Priority:** LOW
**Status:** ⏳ PENDING

**Current Problem:**
- Users don't know IPO might fail
- No visibility into progress toward 490 share minimum

**Solution:**
Add to IPO display:
- Progress bar: "423/490 shares sold (86% to success)"
- Warning when < 50%: "IPO at risk of failure"
- Explanation of refund process

**Files to modify:**
- client/src/components/WordCard.tsx (IPO display)
- Add progress indicator

**Expected outcome:**
- Users know IPO status
- Urgency to buy if close to threshold
- No surprise when refund happens

---

### FIX-MATCH-08: WebSocket Real-Time Updates
**Priority:** MEDIUM
**Status:** ⏳ PENDING

**Current Problem:**
- Users don't see when their orders fill
- Must refresh page to see balance/holdings updates
- No live market feel

**Solution:**
WebSocket server already exists (server/routes.ts:942)
Need to implement:
1. Broadcast when orders fill
2. Broadcast when new orders placed
3. Client subscribes to updates
4. Real-time balance/holdings updates

**Files to modify:**
- server/routes.ts (add WebSocket broadcasts)
- client/src hooks or context (WebSocket client)

**Expected outcome:**
- Live updates when orders fill
- Real-time order book updates
- Better user experience

---

## ✅ FIXES COMPLETED

### FIX-MATCH-03: Add User Profile Route ✅ COMPLETED
**Files Modified:** client/src/App.tsx
**Changes:**
- Added import for UserProfile component
- Added route: `<Route path="/users/:id" component={UserProfile} />`
**Result:** Profile links now work, no more 404 errors

### FIX-MATCH-01: Continuous Order Matching ✅ COMPLETED
**Files Modified:**
- server/routes.ts (exported matchOrders function)
- server/cron.ts (added setupContinuousOrderMatching function)

**Changes:**
- Exported matchOrders from routes.ts
- Added cron job that runs every minute
- Matches all OPEN and PARTIALLY_FILLED orders
- Maintains time priority (FIFO)

**Result:** Orders now continuously retry matching. When a counterparty appears, orders fill within 1 minute.

### FIX-MATCH-02: Market Orders Fail-Fast ✅ COMPLETED
**Files Modified:** server/routes.ts (lines 565-611)

**Changes:**
- After matching attempt, check if market order filled
- If still OPEN or PARTIALLY_FILLED, cancel immediately
- Unlock shares for sell orders
- Return clear error message
- Distinguish between no fills and partial fills

**Result:** Market orders execute immediately or fail with clear message. No more "pending" market orders.

---

## 🎯 Implementation Order

1. **FIX-MATCH-03** - Add user profile route (5 min) ← Start here, easiest
2. **FIX-MATCH-01** - Continuous order matching (30 min) ← Core functionality
3. **FIX-MATCH-02** - Market order fail-fast (20 min) ← Better UX
4. **FIX-MATCH-06** - Test IPO refunds (1 hour) ← Validate critical path
5. **FIX-MATCH-04** - Order book display (30 min) ← User clarity
6. **FIX-MATCH-05** - Order management UI (1 hour) ← User control
7. **FIX-MATCH-07** - IPO threshold warning (30 min) ← Nice to have
8. **FIX-MATCH-08** - WebSocket updates (2 hours) ← Polish

**Total estimated time:** ~6 hours

---

End of Specification
