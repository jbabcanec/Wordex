# WORDEX - Trade the Power of Language

## Overview

WORDEX is a speculative trading platform where users trade shares in individual words using real supply and demand mechanics. The platform features a stock market-style interface where word prices increase when people buy and decrease when people sell, powered by a bonding curve pricing algorithm. Users compete on leaderboards and build portfolios using the virtual WordBucks (WB) currency.

**Tagline**: "Short the patriarchy. Long your vocabulary. Trade the zeitgeist."

The application is built as a full-stack TypeScript application with a React frontend and Express backend, using username/password authentication and designed to work organically from a single user upward without requiring other traders to function.

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

**Routing**: Wouter for lightweight client-side routing with two main routes: Landing page (unauthenticated) and Dashboard (authenticated).

**Key Design Patterns**:
- Component composition with shadcn/ui primitives
- Real-time data updates via polling (5-30 second intervals)
- Optimistic UI updates with query invalidation
- Toast notifications for user feedback
- Modal-based interactions for trading and word submission

### Backend Architecture

**Framework**: Express.js with TypeScript running on Node.js.

**API Design**: RESTful API endpoints with the following categories:
- Authentication (`/api/auth/*`)
- Words (`/api/words/*`)
- Trading (`/api/trade`)
- Portfolio (`/api/portfolio`)
- Leaderboard (`/api/leaderboard`)
- Receipts (`/api/receipts/*`)

**Session Management**: Express-session with PostgreSQL session store (connect-pg-simple) for persistent user sessions.

**Key Business Logic**:
- **Word Normalization**: All words stored in uppercase without spaces for consistent matching
- **Trading Mechanics**: 2% platform spread (buy at price × 1.02, sell at price × 0.98), 0.5% transaction fee
- **Supply/Demand Pricing**: Bonding curve algorithm where price increases with shares sold. Each word starts at 1.00 WB base price with 1,000 total shares. Price formula: `basePrice × (1 + 0.5 × sharesOutstanding / totalShares)`
- **Word Submission**: Costs 10 WB to submit a word, submitter automatically receives 50 shares (5% of total supply)
- **WordBucks Economy**: Virtual currency system with initial 10,000 WB signup bonus

### Database Architecture

**ORM**: Drizzle ORM with Neon Serverless PostgreSQL driver.

**Schema Design**:
- `users`: User profiles with WB balance tracking and earnings
- `words`: Submitted words with normalized text, current price (calculated via bonding curve), and share metrics
- `shareHoldings`: User portfolio positions with cost basis tracking
- `transactions`: Complete transaction history for receipts and audit trail
- `receipts`: Persistent transaction records
- `sessions`: Session storage for authentication

**Key Constraints**:
- Word text must be unique (normalized uppercase without spaces)
- Share holdings track cost basis for profit/loss calculations
- Foreign key relationships maintain referential integrity
- Decimal precision for financial values (20 digits, 2 decimal places)

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