# WORDEX Design Guidelines

## Design Approach: Reference-Based (Financial Trading Platforms)

**Primary References:** Robinhood, Bloomberg Terminal, Coinbase Pro, TradingView

**Justification:** WORDEX is a data-intensive trading platform requiring real-time information display, clear numerical hierarchies, and professional financial UI patterns. The trading platform aesthetic provides established patterns for charts, tickers, order flows, and portfolio management while maintaining the platform's edgy, cultural commentary positioning.

**Key Design Principles:**
- Information density: Maximize data visibility without clutter
- Real-time feedback: Live updates feel immediate and responsive
- Numerical clarity: Financial data must be instantly scannable
- Professional edge: Serious trading interface with cultural commentary twist
- Desktop-first: Traders need screen real estate (responsive to mobile)

## Core Design Elements

### A. Typography

**Font Selection:**
- Primary: Inter or IBM Plex Sans (clean, excellent for data display)
- Monospace Numbers: JetBrains Mono or IBM Plex Mono (for prices, balances, timestamps)
- Display: Space Grotesk or Clash Display (for headers, WORDEX branding)

**Hierarchy:**
- Hero Branding: text-5xl to text-7xl, font-bold, tracking-tight
- Word Symbols: text-2xl to text-4xl, font-bold, uppercase, letter-spacing tracking-wider
- Prices/Values: text-xl to text-3xl, tabular-nums, monospace
- Labels: text-xs to text-sm, uppercase, tracking-wide, font-medium
- Body/Descriptions: text-sm to text-base
- Micro Data: text-xs, opacity-70

**Number Formatting:**
- All financial values: Monospace font, tabular figures
- Positive changes: Prefix with "+"
- Percentages: 2 decimal places
- WB amounts: Comma separators (e.g., "10,000 WB")

### B. Layout System

**Spacing Primitives:** Tailwind units 1, 2, 3, 4, 6, 8, 12, 16
- Tight spacing (1-2): Between related data points, chart elements
- Standard spacing (4-6): Component padding, card internals
- Section spacing (8-12): Between major UI sections
- Large gaps (16): Hero sections, page-level spacing

**Grid System:**
- Main Layout: 12-column grid for complex dashboards
- Trading View: 3-column (sidebar navigation | main chart/data | order panel)
- Portfolio Grid: 4 columns desktop, 2 tablet, 1 mobile
- Leaderboard: Single column with full-width rows

**Container Widths:**
- Full Dashboard: max-w-screen-2xl (dense data needs space)
- Modals: max-w-2xl for trading, max-w-md for simple actions
- Charts: Fluid width within containers

### C. Component Library

#### Navigation & Header
- **Top Bar:** Fixed header with WORDEX logo left, WB balance center-right, user menu right
- **Balance Display:** Large monospace number with "WB" label, real-time updates
- **Quick Actions:** Icon buttons for Submit Word, Portfolio, Settings

#### Trading Components
- **Stock Ticker:** Horizontal scrolling strip (like Bloomberg) showing word symbols, current prices, 24h change with up/down arrows
- **Price Chart:** Full-width interactive chart with timeframe selector (1D/1W/1M/3M/1Y), volume bars below, event markers as vertical lines
- **Order Panel:** Buy/Sell tabs, quantity input, price display, total cost calculation, prominent CTA button, fee breakdown
- **Word Card:** Symbol (large, bold), current intrinsic value, 24h change percentage, small sparkline chart, "Trade" button
- **Market Heatmap:** Grid of word tiles sized by market cap, intensity representing performance

#### Data Display
- **Portfolio Table:** Columns: Word | Shares | Avg Cost | Current Value | Gain/Loss | % Change | Actions
- **Transaction History:** Timeline format with icons, receipt links, expandable details
- **Event Feed:** Card-based vertical timeline, event type icon, points awarded, timestamp, affected word highlighted
- **Leaderboard:** Ranked list with position number, username, total WB, badge for top 3

#### Forms & Modals
- **Submit Word Modal:** Large input (converts to uppercase live), character counter, validation messages, submit button, cost display "-10 WB"
- **Trading Modal:** Word header with current stats, buy/sell toggle, quantity stepper/input, price summary table, confirmation button
- **Event Submission Modal:** Word selector dropdown, points input, description textarea, link/proof input, validation pending state

#### Visualizations
- **Line Charts:** Clean lines, gradient fills below, grid lines subtle, tooltips on hover
- **Candlestick Charts:** For price history, standard OHLC visualization
- **Pie Chart:** Portfolio allocation by word, percentages labeled
- **Bar Charts:** Volume indicators, dividend comparisons
- **Sparklines:** Mini inline charts showing 24h trends

#### Feedback & States
- **Price Change Indicators:** Up arrows (gains), down arrows (losses), inline with percentages
- **Loading States:** Skeleton screens for charts, shimmer effect for loading data
- **Empty States:** Illustrated empty portfolio, "Submit your first word" prompts
- **Success Confirmations:** Toast notifications for trades, receipt generation confirmation
- **Error Messages:** Inline validation, insufficient balance warnings

#### Receipts
- **Receipt Display:** Monospace typography throughout, transaction ID, timestamp, itemized breakdown, running balance before/after
- **Receipt Archive:** Searchable/filterable table, download individual receipts, export options

### D. Dashboard Layout Structure

**Homepage - Single Scrolling View:**

1. **Header Section:** (h-16, sticky)
   - WORDEX logo, tagline subtitle, balance display, user menu

2. **Hero Ticker:** (h-12, sticky below header)
   - Infinite scroll of trending words with live prices

3. **Main Dashboard Grid:** (3-column on xl, 2-column on lg, 1-column on mobile)
   - Left: Top Power Words list (ranked cards), Submit Word card
   - Center: Featured word chart (large, interactive), Event Feed below
   - Right: Your Portfolio summary, Quick Trade panel

4. **Market Overview:** (full-width)
   - Heatmap visualization, Biggest Gainers/Losers tables side-by-side

5. **Leaderboard Section:** (full-width table)
   - Global rankings with sorting options

**Responsive Behavior:**
- Desktop (xl): Full 3-column dashboard
- Tablet (lg): 2-column, reorder priority content
- Mobile: Single column stack, sticky bottom trade button

### E. Images

**No large hero image needed.** This is a functional trading platform - data takes precedence over marketing imagery.

**Icon Usage:**
- Use Heroicons throughout for consistency
- Trading icons: TrendingUp, TrendingDown, ChartBar, CurrencyDollar
- Action icons: Plus (add), ArrowPath (refresh), Cog (settings)
- Event icons: Fire (trending), Newspaper (news), ChatBubble (social)

**User Avatars:** Initials in circular containers (no photos needed initially)

### F. Interaction Patterns

**Trading Flow:**
1. Click "Buy" on word card → Modal opens
2. Enter quantity → Live price calculation
3. Confirm → Loading state → Success toast → Receipt link
4. Modal closes → Portfolio updates

**Event Validation:**
1. User submits event → Card appears in feed with "Pending" badge
2. Other users vote → Vote count updates live
3. 2/3 approval → "Validated" badge, dividend distributed, portfolio balances update

**Real-time Updates:**
- WebSocket for price changes: Numbers fade in/out on update
- Portfolio values recalculate automatically
- Ticker scrolls continuously without page refresh

**No animations beyond:** Subtle fade-ins for new data, smooth scrolling, modal transitions. Financial data should feel stable and immediate, not flashy.