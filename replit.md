# WORDEX - Trade the Power of Language

## Overview

WORDEX is a speculative trading platform where users trade shares in words based on their cultural and social power. The platform gamifies language trends through a stock market metaphor, allowing users to buy and sell shares in words, earn dividends from cultural events, and compete on leaderboards.

**Tagline**: "Short the patriarchy. Long your vocabulary. Trade the zeitgeist."

The application is built as a full-stack TypeScript application with a React frontend and Express backend, designed to work organically from a single user upward without requiring other traders to function.

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
- Events (`/api/events/*`)
- Leaderboard (`/api/leaderboard`)
- Receipts (`/api/receipts/*`)

**Session Management**: Express-session with PostgreSQL session store (connect-pg-simple) for persistent user sessions.

**Key Business Logic**:
- **Word Normalization**: All words stored in uppercase without spaces for consistent matching
- **Trading Mechanics**: 2% platform spread (buy at IV × 1.02, sell at IV × 0.98), 0.5% transaction fee
- **Intrinsic Value Calculation**: Base value of $1.00 plus event-driven value with time-weighted decay (100% weight ≤7 days, 50% ≤30 days, 25% ≤90 days, 0% >90 days)
- **WordBucks Economy**: Virtual currency system with initial 10,000 WB signup bonus, daily login rewards, and dividend payouts

### Database Architecture

**ORM**: Drizzle ORM with Neon Serverless PostgreSQL driver.

**Schema Design**:
- `users`: User profiles with WB balance tracking and earnings
- `words`: Submitted words with normalized text, intrinsic value, and share metrics
- `shareHoldings`: User portfolio positions with cost basis tracking
- `transactions`: Complete transaction history for receipts and audit trail
- `events`: Cultural events affecting word values with point-based impact
- `eventVotes`: Community validation of events
- `receipts`: Persistent transaction records
- `sessions`: Session storage for authentication

**Key Constraints**:
- Word text must be unique (normalized uppercase without spaces)
- Share holdings track cost basis for profit/loss calculations
- Foreign key relationships maintain referential integrity
- Decimal precision for financial values (20 digits, 2 decimal places)

### Authentication System

**Provider**: Replit Authentication with OpenID Connect (OIDC).

**Implementation**: Passport.js strategy for OIDC with automatic user provisioning on first login.

**Session Handling**: Secure HTTP-only cookies with 1-week expiration, stored in PostgreSQL.

**Authorization**: Middleware-based authentication checks (`isAuthenticated`) protecting all trading and user-specific endpoints.

## External Dependencies

### Third-Party Services

**Authentication**: Replit OIDC (`process.env.ISSUER_URL`, `process.env.REPL_ID`) for user login and identity management.

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
- `openid-client`: OIDC authentication
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
- `ISSUER_URL`: OIDC issuer URL (defaults to Replit)
- `REPL_ID`: Replit application identifier (required in Replit environment)
- `NODE_ENV`: Environment mode (development/production)

**Font Dependencies**: Google Fonts CDN for Inter, JetBrains Mono, and Space Grotesk typefaces used in the trading interface design system.