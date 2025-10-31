# WORDEX Tutorial: Trade the Power of Language

**"Short the patriarchy. Long your vocabulary. Trade the zeitgeist."**

Welcome to WORDEX, a peer-to-peer trading platform where you can speculate on individual words like stocks. This tutorial will walk you through everything you need to know.

---

## Table of Contents

1. [What is WORDEX?](#what-is-wordex)
2. [Getting Started](#getting-started)
3. [Understanding Dutch Auction IPOs](#understanding-dutch-auction-ipos)
4. [Trading on the Order Book](#trading-on-the-order-book)
5. [Submitting New Words](#submitting-new-words)
6. [Your Portfolio & Stats](#your-portfolio--stats)
7. [Exploring Words & Traders](#exploring-words--traders)
8. [Economics & Fees](#economics--fees)
9. [Tips & Strategies](#tips--strategies)

---

## What is WORDEX?

WORDEX is a **peer-to-peer speculative trading platform** where you trade shares in individual words. Think of it as a stock market, but instead of companies, you're trading words.

### Key Concepts:

- **1,000 shares per word** - Each word has exactly 1,000 total shares
- **WordBucks (WB)** - The virtual currency used for all transactions
- **Dutch Auction IPOs** - New words launch with declining prices over 24 hours
- **Order Book Trading** - After IPO, words trade peer-to-peer with limit and market orders
- **Creator Shares** - Word submitters receive 20 shares (2%) that vest over 60 days
- **Pure Peer-to-Peer** - The platform is NOT a counterparty; all trades are between users

---

## Getting Started

### 1. Sign Up & Login

Create an account with a username and password. You'll receive **10,000 WB** as a welcome bonus to start trading!

### 2. Dashboard Overview

Your dashboard shows:
- **Balance** - Your available WordBucks
- **Active IPOs** - Words currently in their 24-hour auction phase
- **Top Words** - Most actively traded words with 24-hour price changes
- **Your Portfolio** - Your holdings and their current values
- **Leaderboard** - Top traders ranked by total earnings

### 3. Navigation

Use the buttons in the header to access:
- **📊 Transactions** - View your complete trade history
- **📖 Dictionary** - Browse and search all words
- **👥 Traders** - See top traders and view their profiles
- **❓ Help** - Reopen this interactive tour

---

## Understanding Dutch Auction IPOs

### What is a Dutch Auction?

When a new word is submitted, it goes through a 24-hour **Dutch auction IPO**:

1. **Starting Price**: $2.00 WB per share
2. **Ending Price**: $0.10 WB per share (after 24 hours)
3. **Price Updates**: Every hour, the price drops automatically
4. **Shares Available**: 980 shares (20 reserved for the creator)

### How It Works:

- **Buy at any time** during the 24-hour window
- **Earlier buyers pay more** but secure shares before they run out
- **Later buyers pay less** but risk shares selling out
- **0.5% transaction fee** applies to all purchases

### IPO Completion:

An IPO completes when either:
- ✅ **980 shares sell** (98% of total shares)
- ⏰ **24 hours elapse**

After completion, the word moves to **order book trading**.

### IPO Failure:

If fewer than 980 shares sell within 24 hours, the IPO **fails**:
- All buyers receive **full refunds** (including fees)
- Creator keeps their 20 shares but they're **locked** as "FAILED" status
- The word cannot be traded

### How to Buy During IPO:

1. Find active IPOs on the dashboard or Dictionary page
2. Click on a word card with the blue "IPO" badge
3. Click **"Buy Shares"** button
4. Enter the number of shares you want
5. Review the total cost (shares × current price + 0.5% fee)
6. Click **"Buy Shares"** to confirm

💡 **Tip**: Watch the countdown timer and current price to time your purchase!

---

## Trading on the Order Book

Once an IPO completes successfully, the word moves to **order book trading** where you can place limit and market orders.

### Order Types:

#### 1. **Market Orders** (Instant Execution)
- **Buy Market**: Purchase shares immediately at the best available ask price
- **Sell Market**: Sell shares immediately at the best available bid price
- Trades execute instantly by matching against existing limit orders
- Best for: When you want to trade NOW and don't want to wait

#### 2. **Limit Orders** (Set Your Price)
- **Buy Limit**: Place an order to buy shares at or below a specific price
- **Sell Limit**: Place an order to sell shares at or above a specific price
- Your order sits in the order book until someone matches it
- Best for: When you want to control your price and are willing to wait

### The Order Book:

The **order book** displays all pending limit orders:

**Asks (Sell Orders)** - Top of book
- People selling shares, sorted by lowest price first
- When you buy, you match against the lowest ask

**Spread** - The gap between best bid and best ask

**Bids (Buy Orders)** - Bottom of book
- People buying shares, sorted by highest price first
- When you sell, you match against the highest bid

### Order Matching (Price-Time Priority):

Orders are matched using **price-time priority**:
1. **Best price first** - Lowest asks, highest bids
2. **First in, first out** - Earlier orders at the same price fill first
3. **Partial fills allowed** - Large orders can fill incrementally

### How to Trade:

1. Go to a word's detail page (click any word card)
2. Review the **order book** to see current bids and asks
3. Click **"Trade"** button
4. Choose your order type:
   - **Market**: For instant execution at current market price
   - **Limit**: To set your own price and wait for a match
5. Select **Buy** or **Sell**
6. Enter the number of shares
7. For limit orders, enter your price per share
8. Review the estimated total cost/proceeds
9. Click **"Place Order"** to confirm

💡 **Pro Tip**: Use limit orders when you think the price will move in your favor. Use market orders when you want guaranteed execution.

---

## Submitting New Words

Have a word you think will be popular? Submit it for IPO!

### Requirements:

- **Cost**: 50 WB to submit a word
- **Reward**: 20 shares (2% of total) with 60-day vesting
- **Validation**: Words must be unique (case-insensitive, spaces normalized)

### Vesting Schedule:

Your 20 creator shares vest linearly over 60 days:
- **1 share unlocks every 3 days**
- **Locked shares** cannot be sold
- **Unlocked shares** can be traded freely
- **Vesting runs automatically** via daily midnight cron job

This ensures creators are incentivized for long-term success!

### How to Submit:

1. Click the **"+ Submit Word"** button on the dashboard
2. Enter your word (e.g., "innovation", "zeitgeist", "vibes")
3. Review the 50 WB submission fee
4. Click **"Submit"** to launch your word's IPO

Your word immediately enters a 24-hour Dutch auction starting at $2.00 WB!

---

## Your Portfolio & Stats

### Portfolio View:

Your portfolio shows all your holdings with:
- **Word name** and current status (IPO or TRADING)
- **Shares owned** (locked + unlocked)
- **Current value** (shares × current price)
- **Average cost** (your cost basis per share)
- **Profit/Loss** (current value - total cost)
- **P/L %** (percentage gain or loss)

Click any holding to go to that word's detail page!

### Transaction History:

Access via the **📊 Transactions** button in the header:
- View your complete trade history
- Filter by **Buy**, **Sell**, or **IPO** transactions
- See exact prices, quantities, and timestamps
- Search for specific words
- Paginated for easy browsing

### Stats Cards:

Track your performance with:
- **Total Portfolio Value** - Current value of all holdings
- **Total Invested** - How much WB you've spent
- **Total Profit/Loss** - Your overall gains or losses
- **Best Performer** - Your most profitable word

---

## Exploring Words & Traders

### Dictionary Page:

Browse and search all words on WORDEX:
- **Search** by word text
- **Filter** by status: All, IPO Active, Trading, Failed
- **Sort** by price, change, volume, or trade count
- **View details** by clicking any word card

### Word Detail Page:

Each word has a dedicated page with:
- **Price Chart** - Historical price movement over time
- **Order Book** - Live bids and asks with depth display
- **Trading Stats** - 24h change, volume, high/low
- **Share Distribution** - Creator shares vs. outstanding shares
- **Recent Trades** - Latest transactions with prices
- **IPO Info** (if applicable) - Progress, current price, countdown

### Traders Page:

See who's dominating the market:
- **Leaderboard** ranked by total earnings
- **Trophy icons** for top 3 traders
- **Balance**, **Earnings**, and **Portfolio Value** for each trader
- **Click any trader** to view their profile

### User Profile Page:

View any trader's public profile:
- **Balance** and **Total Earned**
- **Portfolio Value** and **Words Submitted**
- **Holdings** - All their current positions
- **Recent Trades** - Their latest transactions

---

## Economics & Fees

### Trading Fees:

**0.5% transaction fee** on all trades:
- Applies to IPO purchases
- Applies to limit order fills
- Applies to market order fills
- Deducted from your balance automatically

**Example**: Buying 100 shares at $1.50 each:
- Subtotal: 100 × $1.50 = $150 WB
- Fee: 0.5% × $150 = $0.75 WB
- **Total**: $150.75 WB

### Share Economics:

**Total Shares**: 1,000 per word
- **Creator**: 20 shares (2%, vesting over 60 days)
- **Public IPO**: 980 shares (98%, available immediately)

**IPO Revenue**:
- At $2.00: 980 shares = $1,960 WB gross revenue
- At $0.10: 980 shares = $98 WB gross revenue
- Average outcome depends on market demand!

### Supply & Demand:

WORDEX uses **pure market dynamics**:
- ✅ Fixed supply (1,000 shares, never changes)
- ✅ Variable demand (based on trader interest)
- ✅ No artificial intervention
- ✅ No platform counterparty
- ✅ True price discovery

---

## Tips & Strategies

### For IPO Trading:

1. **Early Bird**: Buy early if you believe in long-term potential (higher price, but guaranteed shares)
2. **Bargain Hunter**: Wait for price drops if you're willing to risk missing out
3. **Watch the Clock**: Price drops hourly, so timing matters
4. **Check Progress**: High IPO progress = strong demand = potential for higher post-IPO price

### For Order Book Trading:

1. **Study the Spread**: Tight spreads = liquid market, wide spreads = opportunity or risk
2. **Order Book Depth**: Many orders at similar prices = strong support/resistance
3. **Use Limit Orders**: Avoid overpaying by setting your max/min price
4. **Patience Pays**: Don't chase prices - let the market come to you
5. **Track Volume**: High trade counts = active market, better liquidity

### For Word Selection:

1. **Trending Topics**: Words related to current events often see demand spikes
2. **Timeless Words**: Universal concepts may have stable long-term value
3. **Meme Potential**: Funny or ironic words can generate trading activity
4. **Cultural Moments**: Words capturing zeitgeist moments can be gold

### Risk Management:

1. **Diversify**: Don't put all WB into one word
2. **Set Limits**: Use stop-loss strategies with limit orders
3. **Start Small**: Test strategies with small positions first
4. **Track History**: Learn from your transaction history
5. **Watch Vesting**: Creator shares unlock over time, potentially increasing supply

---

## Advanced Features

### Price Charts:

Each word's detail page shows a **price chart** powered by Recharts:
- **X-axis**: Time (chronological order of trades)
- **Y-axis**: Price per share in WB
- **Line**: Connects transaction prices
- **Tooltip**: Hover to see exact price and time

Use this to identify:
- **Trends**: Upward, downward, or sideways movement
- **Volatility**: Sharp spikes indicate high activity
- **Support/Resistance**: Price levels where trading clusters

### Order Book Visualization:

The order book displays in two sections:
- **Asks (Red)**: Sellers wanting higher prices (top)
- **Bids (Green)**: Buyers offering lower prices (bottom)
- **Quantity Bars**: Visual depth indicators
- **Price-Time Priority**: Best prices at the edges

### Live Updates:

Data refreshes automatically:
- **Order Books**: Every 5 seconds
- **IPO Prices**: Every 10 seconds (also updated hourly by cron)
- **Portfolio Values**: Every 30 seconds
- **Top Words**: Every 10 seconds

### Cron Jobs:

Two background jobs keep WORDEX running:

1. **IPO Price Updates** (Hourly):
   - Updates current IPO prices based on elapsed time
   - Moves completed IPOs to TRADING status
   - Fails expired IPOs with insufficient sales

2. **Vesting Unlocks** (Daily at Midnight):
   - Unlocks creator shares based on 60-day vesting schedule
   - 1 share per word every 3 days
   - Fully automatic, no action required

---

## Frequently Asked Questions

### Q: What happens if I run out of WordBucks?

A: You can't trade without WB. Sell some holdings or wait for submitted words to succeed and gain value!

### Q: Can I cancel a limit order?

A: Currently, limit orders cannot be cancelled once placed. Choose your prices carefully!

### Q: What if an IPO I bought fails?

A: You'll receive a **full refund** including the 0.5% fee. No loss!

### Q: Can I trade locked (vesting) shares?

A: No, only unlocked shares can be traded. Vesting shares unlock automatically over 60 days.

### Q: How is the leaderboard calculated?

A: By **total earnings** - the sum of all profits from your trades.

### Q: Can the same word be submitted twice?

A: No, all words are unique (normalized to uppercase, spaces removed).

### Q: What's the minimum/maximum order size?

A: Minimum is 1 share. Maximum depends on available shares in your portfolio (for sells) or market liquidity (for buys).

### Q: Are there any hidden fees?

A: No. The only fee is 0.5% on all transactions, clearly displayed before you confirm.

---

## Getting Help

Need assistance or have questions?

- **Interactive Tour**: Click the **?** Help button in the dashboard header
- **Replit Support**: Contact Replit support for technical issues
- **Community**: Discuss strategies and ideas with other traders

---

## Final Thoughts

WORDEX is a **speculative trading platform** driven entirely by **supply and demand**. Prices reflect collective belief in the cultural, memetic, or emotional value of language itself.

**Remember**:
- This is a game with virtual currency (WordBucks)
- All trades are peer-to-peer between users
- The platform doesn't manipulate prices or act as counterparty
- Past performance doesn't guarantee future results

**Have fun! Trade wisely! And may your words moon! 🚀**

---

*Built with ❤️ by Floj on Replit*
*Powered by: React, Express, PostgreSQL, Drizzle ORM, TanStack Query, Shadcn UI*
