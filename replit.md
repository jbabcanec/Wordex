# WORDEX - Trade the Power of Language

## Overview

WORDEX is a peer-to-peer speculative trading platform where users trade shares in individual words using a real order book system. New words launch through 24-hour Dutch auction IPOs (starting at $2.00, declining to $0.10). After IPO completion, words trade on a continuous order book with limit and market orders matched by price-time priority. The platform features a professional Bloomberg/Robinhood-style interface with live order books, real-time price updates, and leaderboard rankings.

**Tagline**: "Short the patriarchy. Long your vocabulary. Trade the zeitgeist."

The application is built as a full-stack TypeScript application with a React frontend and Express backend, using username/password authentication. The platform is purely peer-to-peer (platform is NOT a counterparty), with all trades occurring between users.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Framework**: React 18 with TypeScript, using Vite as the build tool and development server.

**UI Component Library**: Shadcn UI (radix-ui primitives) with Tailwind CSS for styling. The design system is inspired by financial trading platforms (Robinhood, Bloomberg Terminal, Coinbase Pro, TradingView) emphasizing:
- Information density without clutter
- Real-time feedback and live updates
- Numerical clarity with monospace fonts for financial data
- Professional trading interface aesthetic
- Desktop-first responsive design

**State Management**: TanStack Query (React Query) for server state management, with a custom query client configuration that handles authentication and error states.

**Routing**: Wouter for lightweight client-side routing with main pages:
- Landing page (unauthenticated)
- Dashboard (authenticated) - Active IPOs feed, portfolio, leaderboard
- Dictionary - Browse and search all words
- Traders - Browse and search all users

**Key Design Patterns**:
- Component composition with shadcn/ui primitives
- Real-time data updates via polling (5-30 second intervals for order books, 10s for IPOs)
- Optimistic UI updates with query invalidation
- Toast notifications for user feedback
- Modal-based interactions: TradeModal (limit/market orders), IpoBuyModal (Dutch auction), SubmitWordModal
- Live order book depth display with price-time priority
- Countdown timers for Dutch auction IPOs

### Backend Architecture

**Framework**: Express.js with TypeScript running on Node.js.

**API Design**: RESTful API endpoints with the following categories:
- Authentication (`/api/auth/*`)
- Words (`/api/words/*`) - Browse, search, get word details
- IPO (`/api/ipo/buy`) - Purchase shares during Dutch auction
- Trading (`/api/trade`) - Place limit/market orders
- Order Book (`/api/words/:id/orderbook`) - Get live bid/ask depth
- Portfolio (`/api/portfolio`) - User holdings and vested shares
- Leaderboard (`/api/leaderboard`)
- Traders (`/api/traders`) - Browse and search all users
- Receipts (`/api/receipts/*`)

**Background Jobs**: Node-cron scheduled tasks:
- **IPO Price Updates** (hourly): Updates Dutch auction prices for all active IPOs based on time elapsed
- **Vesting Unlocks** (daily at midnight): Unlocks creator shares that have reached their vesting date (60-day linear vesting)

**Session Management**: Express-session with PostgreSQL session store (connect-pg-simple) for persistent user sessions.

**Key Business Logic**:
- **Word Normalization**: All words stored in uppercase without spaces for consistent matching
- **IPO Dutch Auction**: New words launch with 24-hour declining price auction ($2.00 → $0.10). Price updates hourly via cron job. IPO completes when 980/1000 shares sell (98%) or 24 hours elapse.
- **Share Allocation**: 1,000 shares per word. Creator receives 20 shares (2%) with 60-day linear vesting. 980 shares available in IPO.
- **Word Submission**: Costs 50 WB to submit a word. Creator receives 20 shares vesting over 60 days (1 share every 3 days).
- **Order Book Trading**: After IPO completion, words trade peer-to-peer with limit and market orders. Price-time priority matching with atomic database transactions.
- **Trading Fees**: 0.5% transaction fee on all trades (both IPO purchases and order book trades)
- **Order Matching**: Limit orders stored in database with price-time priority. Market orders match against best available limit orders. Orders can be partially filled.
- **IPO Failure**: If fewer than 980 shares sell within 24 hours, IPO fails. All buyers receive full refunds (including fees). Creator keeps their 20 shares but they're locked as "FAILED" status.
- **WordBucks Economy**: Virtual currency system with initial 10,000 WB signup bonus

### Database Architecture

**ORM**: Drizzle ORM with Neon Serverless PostgreSQL driver.

**Schema Design**:
- `users`: User profiles with WB balance tracking and total earnings
- `words`: Submitted words with IPO status (IPO_ACTIVE, TRADING, IPO_FAILED), IPO pricing (startPrice, currentPrice, ipoStartTime, ipoEndTime), and share metrics
- `shareHoldings`: User portfolio positions tracking locked (vesting) and unlocked shares with cost basis
- `limitOrders`: Active limit orders (BUY/SELL) with price, quantity, and timestamps for price-time priority
- `transactions`: Complete transaction history including type (IPO_BUY, LIMIT_BUY, LIMIT_SELL, MARKET_BUY, MARKET_SELL)
- `receipts`: Persistent transaction records
- `sessions`: Session storage for authentication

**Key Constraints**:
- Word text must be unique (normalized uppercase without spaces)
- Share holdings track cost basis and separate locked/unlocked quantities for vesting
- Limit orders enforce positive prices and quantities
- Foreign key relationships maintain referential integrity with cascade deletes
- Decimal precision for financial values (20 digits, 2 decimal places)
- IPO times validated to ensure 24-hour duration
- Order matching uses database transactions for atomicity

### Authentication System

**Provider**: Username/password table-based authentication using Passport.js local strategy.

**Implementation**: Bcrypt password hashing with automatic user creation on signup. Passwords are never returned in API responses.

**Session Handling**: Secure HTTP-only cookies with 1-week expiration, stored in PostgreSQL.

**Authorization**: Middleware-based authentication checks (`isAuthenticated`) protecting all trading and user-specific endpoints.

**Power User**: Development account (username: `floj`, password: `floj123`) with 999,990 WB balance for testing.

## External Dependencies

### Third-Party Services

**Database**: Neon Serverless PostgreSQL (`process.env.DATABASE_URL`) as the primary data store.

### Key NPM Packages

**Frontend**:
- `@tanstack/react-query`: Server state management and caching
- `@radix-ui/*`: Accessible UI component primitives (dialogs, dropdowns, tooltips, etc.)
- `tailwindcss`: Utility-first CSS framework
- `wouter`: Lightweight routing
- `date-fns`: Date formatting and manipulation

**Backend**:
- `express`: Web server framework
- `drizzle-orm`: Type-safe ORM
- `@neondatabase/serverless`: PostgreSQL driver optimized for serverless
- `passport`: Authentication middleware
- `passport-local`: Username/password authentication strategy
- `bcryptjs`: Password hashing
- `express-session`: Session management
- `connect-pg-simple`: PostgreSQL session store
- `node-cron`: Scheduled jobs for IPO price updates and vesting unlocks

**Development**:
- `vite`: Build tool and dev server
- `typescript`: Type safety
- `tsx`: TypeScript execution for Node.js
- `esbuild`: Fast bundling for production

### Configuration Requirements

**Environment Variables**:
- `DATABASE_URL`: PostgreSQL connection string (required)
- `SESSION_SECRET`: Secret for session signing (required)
- `NODE_ENV`: Environment mode (development/production)

**Font Dependencies**: Google Fonts CDN for Inter, JetBrains Mono, and Space Grotesk typefaces used in the trading interface design system.