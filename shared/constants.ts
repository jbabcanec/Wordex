// WORDEX Economic Constants - Order Book System

// Word Submission & Creation
export const SUBMISSION_FEE = 50; // WordBucks fee to submit a new word
export const SHARES_PER_WORD = 1000; // Total shares available per word
export const CREATOR_SHARES = 20; // Shares allocated to word creator (2%)
export const IPO_SHARES = 980; // Shares offered in IPO (98%)

// Trading Fees
export const TRADING_FEE_PERCENT = 0.005; // 0.5% fee on all trades

// IPO Dutch Auction Parameters
export const IPO_START_PRICE = 2.00; // Starting price in WordBucks
export const IPO_END_PRICE = 0.10; // Ending price in WordBucks
export const IPO_DURATION_HOURS = 24; // 24-hour Dutch auction

// Vesting Schedule (Creator shares unlock gradually over 60 days)
export const VESTING_SCHEDULE = [
  { day: 0, percent: 0.0 },    // Day 0: 0% unlocked
  { day: 7, percent: 0.2 },    // Day 7: 20% unlocked (4 shares)
  { day: 14, percent: 0.4 },   // Day 14: 40% unlocked (8 shares)
  { day: 30, percent: 0.7 },   // Day 30: 70% unlocked (14 shares)
  { day: 60, percent: 1.0 },   // Day 60: 100% unlocked (20 shares)
];

// User Defaults
export const INITIAL_BALANCE = 10000; // Starting WordBucks for new users
export const DAILY_LOGIN_BONUS = 100; // Bonus WB for daily login (if last login > 24h ago)

// IPO Thresholds
export const IPO_SUCCESS_THRESHOLD = 0.5; // IPO succeeds if 50%+ of shares sold
export const MIN_IPO_SHARES_SOLD = Math.floor(IPO_SHARES * IPO_SUCCESS_THRESHOLD); // 490 shares

// Order Book Limits
export const MAX_OPEN_ORDERS_PER_USER = 50; // Maximum open orders a user can have
export const MIN_ORDER_QUANTITY = 1; // Minimum shares per order
export const MAX_ORDER_QUANTITY = 1000; // Maximum shares per order

// Price Calculation Helpers
export function calculateIpoPrice(elapsedHours: number): number {
  // Linear price drop from IPO_START_PRICE to IPO_END_PRICE over IPO_DURATION_HOURS
  const progress = Math.min(elapsedHours / IPO_DURATION_HOURS, 1.0);
  const priceRange = IPO_START_PRICE - IPO_END_PRICE;
  const currentPrice = IPO_START_PRICE - (priceRange * progress);
  return Math.max(currentPrice, IPO_END_PRICE);
}

export function calculateTradingFee(totalValue: number): number {
  return totalValue * TRADING_FEE_PERCENT;
}

export function calculateVestingUnlocked(daysElapsed: number, totalShares: number): number {
  // Find the appropriate vesting checkpoint
  let unlockedPercent = 0;
  
  for (const checkpoint of VESTING_SCHEDULE) {
    if (daysElapsed >= checkpoint.day) {
      unlockedPercent = checkpoint.percent;
    } else {
      break;
    }
  }
  
  return Math.floor(totalShares * unlockedPercent);
}
