# B4U Esports Pi Mainnet Token Ecosystem

## Overview
This architecture introduces a production-ready reward-token ecosystem for B4U Esports with:
- Pi Network Mainnet integration
- PostgreSQL storage with Prisma schema + SQL schema
- Token ledger, redemption engine, treasury controls, fraud protection
- Admin controls for audits, redemptions, treasury, and system configuration
- Frontend reward center, wallet dashboard, and redemption flow

## Goals
- Give users a secure reward token balance tied to Pi mainnet wallets
- Enable purchase reward accrual, referral bonus, tournament awards, and staking incentives
- Support safe token redemption to Pi wallet or digital goods
- Provide admin tools for treasury monitoring, fraud flags, and configurable rules
- Scale cleanly with Redis rate limiting, JWT auth, and production best practices

---

## Folder Structure

```
prisma/
  schema.prisma
sql/
  token-ecosystem-schema.sql
server/
  prismaClient.ts
  middleware/
    auth.ts
    rateLimiter.ts
  services/
    tokenService.ts
    treasuryService.ts
    fraudService.ts
  routes/
    tokenRoutes.ts
    adminTokenRoutes.ts
client/src/pages/
  token-wallet.tsx
  reward-center.tsx
  rewards-redemption.tsx
  treasury-status.tsx
client/src/lib/
  pi-token.ts
```

---

## Data Model

- `User`: core user record with Pi UID, wallet address, referral metadata, and risk flags
- `Wallet`: user wallet registry with on-chain network and verification state
- `RewardBalance`: tracked token balance separate from account credit and Pi spendable value
- `PiTransaction`: all Pi deposit/withdrawal activity from external network events
- `TokenTransaction`: internal reward ledger for issuance, transfer, redemption, fees
- `RedemptionRequest`: user redemption intent for Pi transfers or in-app digital rewards
- `TreasuryLog`: treasury issuance, burn, reserve, and operational events
- `RewardHistory`: earned reward events with campaign metadata
- `Referral`: referral relationships and completed reward status
- `PurchaseReward`: purchase-driven token awards
- `FraudFlag`: event-level fraud scoring and review signals
- `TournamentReward`: tokens issued for tournament participation and placement
- `WithdrawalLimit`: rate limits and daily caps per user
- `AdminLog`: admin actions and audit events
- `Notification`: user-facing notification record for token events
- `SystemSetting`: runtime feature flags and thresholds

---

## Prisma Schema
See `prisma/schema.prisma` for the canonical entity model.

---

## SQL Schema
See `sql/token-ecosystem-schema.sql` for raw PostgreSQL DDL.

---

## Backend Architecture

### Core layers
- `server/prismaClient.ts`: shared Prisma singleton with dev hot-reload safety
- `server/services/tokenService.ts`: token issuance, transfer, redemption, balance, ledger
- `server/services/treasuryService.ts`: treasury accounting, reserve management, burn controls
- `server/services/fraudService.ts`: event scoring, red flag injection, transaction throttling
- `server/routes/tokenRoutes.ts`: public token endpoints for authenticated users
- `server/routes/adminTokenRoutes.ts`: admin endpoints for treasury, redemptions, and log review
- `server/middleware/auth.ts`: JWT validation, admin guarding, and request hygiene
- `server/middleware/rateLimiter.ts`: Redis-backed throttle for risk-sensitive endpoints

### Identity and auth
- JWTs for user sessions and admin sessions
- `Authorization: Bearer <token>` header for all API routes
- User JWT payload includes `userId`, `piUID`, `sessionVersion`
- Admin tokens separate and issued on secure login with short TTL

---

## API Endpoints

### User-facing
- `POST /api/auth/pi` — Pi authentication, wallet scope, create/update user, return JWT
- `GET /api/token/balance` — get current reward and on-chain wallet totals
- `GET /api/token/ledger` — list internal token transactions and reward history
- `POST /api/token/redeem` — request redemption to Pi wallet or digital reward
- `POST /api/token/claim/daily` — claim daily reward bonus
- `GET /api/token/rewards` — list available reward offers, tournaments, referral bonuses
- `GET /api/token/notifications` — token event notifications

### Admin-facing
- `GET /api/admin/token/treasury` — treasury balances and reserve status
- `GET /api/admin/token/redemptions` — pending and completed redemption requests
- `POST /api/admin/token/redemptions/:id/review` — approve / reject redemption
- `GET /api/admin/token/logs` — audit trail for token issuance, burn, and manual adjustments
- `POST /api/admin/token/settings` — update thresholds, caps, referral bonuses, and fraud rules

---

## Frontend Pages

### `token-wallet.tsx`
User wallet dashboard with:
- reward token balance
- Pi wallet address
- active token campaigns
- quick actions: claim daily reward, redeem tokens, view ledger

### `reward-center.tsx`
Reward marketplace with:
- referral bonus progress
- tournament bonuses
- purchase rewards summary
- bonus multiplier tracker

### `rewards-redemption.tsx`
Redemption flow UI:
- choose Pi transfer vs digital reward
- preview payout and fees
- submit review request

### `treasury-status.tsx`
Admin-like overview card for treasury health:
- total issued tokens
- reserve balance
- burn rate
- redemption backlog

---

## Pi Mainnet Integration

### Key patterns
- Add Pi wallet authorization scope: `['username', 'payments', 'wallet_address']`
- Persist `walletAddress` and `piUID` during auth flow
- Use Pi backend SDK for on-chain transfer request creation and verification
- Reconcile Pi webhooks to `PiTransaction` records
- Protect against double-spend by idempotent `transactionReference`

### Wallet flow
1. User authenticates through Pi Browser
2. Backend verifies access token and wallet address
3. If wallet address is missing, prompt user to reauthorize with scope
4. On redemption approval, the backend creates a Pi transfer request
5. Pi callback updates `PiTransaction` and marks redemption complete

---

## Security and Anti-Fraud

- Rate limit all reward and redemption endpoints using Redis
- Validate user wallet ownership on Pi auth and redemption actions
- Use `referralCode` and `referredBy` for tracked bonus issuance
- Flag suspicious activity by amount, frequency, IP, wallet changes
- Require manual review for large redemptions or repeated decline patterns
- Log admin action and system changes in `AdminLog`
- Keep production secrets in environment variables only

---

## Environment Variables

Required production vars:
- `DATABASE_URL`
- `JWT_SECRET`
- `PI_API_KEY`
- `PI_API_SECRET`
- `PI_WEBHOOK_SECRET`
- `REDIS_URL`
- `NODE_ENV=production`
- `SESSION_SECRET`
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`

Optional:
- `PI_SANDBOX_MODE`
- `REWARD_DAILY_AMOUNT`
- `REWARD_REFERRAL_BONUS`
- `REWARD_TOURNAMENT_MULTIPLIER`
- `TOKEN_REDEMPTION_FEE_PERCENT`

---

## Deployment Best Practices

- Use a managed PostgreSQL cluster (Supabase, Neon, AWS RDS)
- Use Redis for rate limiting and session cache
- Run database migrations on deploy with Prisma or drizzle tooling
- Keep `JWT_SECRET` and Pi keys in secret store, never in source control
- Use HTTPS and HSTS for all user-facing endpoints
- Enable health checks for `GET /api/health` and `GET /api/monitoring/email-health`
- Build front-end assets separately and serve them from Vercel or CDN

---

## Scaling Recommendations

- Keep token ledger writes in a single transactional path
- Use background workers for batch reward issuance and reconciliation
- Move fraud scoring to a separate async queue if volume grows
- Add read replicas for reporting views and analytics
- Cache reward metadata with Redis and keep shard-friendly ID lookups
- Enforce daily redemption caps and monitoring alerts for spikes

---

## Next Steps

1. Apply the Prisma schema and generate client code.
2. Connect new routes into `server/routes.ts`.
3. Wire frontend pages and add route entries in `client/src/App.tsx`.
4. Add Redis-backed rate limiting and Pi webhook reconciliation.
5. Add admin UI, audit trails, and review queue.
