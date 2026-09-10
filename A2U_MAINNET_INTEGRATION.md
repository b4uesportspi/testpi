# A2U Payment Integration - TESTNET ONLY

> Pi's current official Advanced Payments documentation states that App-to-User (A2U) payments are available only on Testnet. This project therefore blocks A2U calls whenever `PI_SANDBOX_MODE=false`. Do not describe or enable these flows as Mainnet functionality until Pi changes that requirement.

## 📋 OVERVIEW

This document describes the App-to-User (A2U) payment implementation for **Pi Network Testnet/Sandbox**.

**Status:** ✅ Production Ready  
**Network:** Pi Network Mainnet  
**API Base:** `https://api.minepi.com`  
**Last Updated:** April 15, 2026

---

## 🚀 WHAT'S INCLUDED

### 1. **Pi Network Service** (`server/services/pi-network.ts`)
- ✅ `createA2UPayment()` - Step 1: Create payment
- ✅ `submitPaymentToBlockchain()` - Step 2: Submit to blockchain
- ✅ `completePaymentInServer()` - Step 3: Complete payment
- ✅ `processFullA2UPayment()` - Full 3-step flow
- ✅ `createEnhancedServerTransfer()` - For refunds/payouts

### 2. **API Routes** (`server/routes.ts`)
- ✅ `POST /api/payments/a2u` - A2U payment endpoint
- ✅ Full validation and error handling
- ✅ Database recording
- ✅ Mainnet configuration

### 3. **Refund Processing Script** (`scripts/process-a2u-refund-mainnet.ts`)
- ✅ Automated refund processing
- ✅ 3-step A2U flow
- ✅ Database integration
- ✅ Mock mode for testing

### 4. **Package.json Scripts**
- ✅ `npm run process:refund` - Production refunds
- ✅ `npm run process:refund:test` - Test mode

---

## 🔧 CONFIGURATION

### Environment Variables (`.env`)

```env
# Pi Network - MAINNET
PI_SERVER_API_KEY=your_mainnet_api_key_here
PI_SANDBOX_MODE=true

# Database
DATABASE_URL=postgresql://...

# Other settings
NETWORK=TESTNET
NODE_ENV=production
```

**IMPORTANT:** 
- `PI_SANDBOX_MODE=true` enables the Pi Testnet/Sandbox A2U flow
- Set to `false` for production U2A payments; A2U is blocked because Pi currently documents it as Testnet-only

---

## 📖 USAGE EXAMPLES

### Example 1: A2U Payment via API

```typescript
// Frontend call
const response = await fetch('/api/payments/a2u', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    uid: 'user_pi_uid_here',      // Pi Network user UID
    amount: 5.0,                   // Amount in Pi
    memo: 'Tournament reward',     // Payment description
    metadata: {                    // Optional metadata
      reason: 'tournament_win',
      tournament_id: '12345'
    }
  })
});

const result = await response.json();
console.log('A2U Payment result:', result);
```

**Response:**
```json
{
  "success": true,
  "paymentId": "payment_id_here",
  "txid": "blockchain_txid_here",
  "transactionId": "a2u_timestamp_random",
  "amount": 5.0,
  "user": {
    "id": "user_id",
    "username": "username",
    "piUID": "user_pi_uid"
  },
  "status": {
    "developer_approved": true,
    "transaction_verified": true,
    "developer_completed": true
  },
  "network": "mainnet",
  "timestamp": "2026-04-15T..."
}
```

### Example 2: Programmatic A2U Payment

```typescript
import { piNetworkService } from './server/services/pi-network';

const result = await piNetworkService.processFullA2UPayment({
  amount: 1.5,
  memo: 'Payment for service',
  metadata: { 
    orderId: '12345',
    network: 'mainnet'
  },
  uid: 'user_pi_uid_here'
});

console.log('Payment ID:', result.paymentId);
console.log('Transaction ID:', result.txid);
console.log('Payment Status:', result.payment.status);
```

### Example 3: Process Refunds

**Command:**
```bash
# Production (REAL refunds)
npm run process:refund

# Test mode (mock refunds)
npm run process:refund:test
```

**Script Behavior:**
1. Queries database for transactions with `status = 'refund_requested'`
2. Processes each refund using 3-step A2U flow
3. Records refund in database
4. Updates original transaction status to `'refunded'`
5. Provides detailed summary

---

## 🔄 A2U PAYMENT FLOW

### Step 1: Create Payment
```typescript
const paymentId = await piNetworkService.createA2UPayment({
  amount: 5.0,
  memo: 'Payment memo',
  metadata: { type: 'A2U', ... },
  uid: 'user_pi_uid'
});
```

**What happens:**
- Creates payment record in Pi Network
- Returns `paymentId` for tracking
- Payment is in "pending" state

### Step 2: Submit to Blockchain
```typescript
const txid = await piNetworkService.submitPaymentToBlockchain(paymentId);
```

**What happens:**
- Submits payment to Pi blockchain
- Returns blockchain `txid`
- Transaction is broadcast to network

### Step 3: Complete Payment
```typescript
const completedPayment = await piNetworkService.completePayment(paymentId, txid);
```

**What happens:**
- Marks payment as completed in Pi Network
- Finalizes the transaction
- User receives Pi tokens

---

## 🔐 FRONTEND AUTHENTICATION

Users MUST authenticate with proper scopes for A2U payments:

```typescript
// client/src/hooks/use-pi-network.tsx
const authResult = await piSDK.authenticate(
  ['username', 'payments', 'wallet_address'],  // ⚠️ Must include all scopes
  onIncompletePaymentFound
);
```

**Required Scopes:**
- `username` - User identification
- `payments` - Payment permissions
- `wallet_address` - Required for A2U refunds

**Error Handling:**
```typescript
if (errorMessage.includes('scope') || errorMessage.includes('payment')) {
  errorMessage = "Payment permissions missing. Please grant all requested permissions.";
}
```

---

## 📊 DATABASE SCHEMA

### Transactions Table (`app_transactions`)

```sql
CREATE TABLE app_transactions (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR NOT NULL REFERENCES app_users(id),
  package_id VARCHAR NOT NULL,
  payment_id TEXT NOT NULL UNIQUE,
  txid TEXT,
  pi_amount DECIMAL(18,8) NOT NULL,
  usd_amount DECIMAL(10,4) NOT NULL,
  pi_price_at_time DECIMAL(10,4) NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  failure_reason TEXT,
  success_reason TEXT,
  game_account JSONB NOT NULL,
  metadata JSONB,
  email_sent BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

**A2U Payment Values:**
- `package_id`: `'a2u_payment'` (special identifier)
- `status`: `'completed'`
- `metadata.type`: `'A2U'`
- `metadata.network`: `'mainnet'`

---

## ⚠️ IMPORTANT NOTES

### 1. **Mainnet vs Testnet**
```typescript
// MAINNET (Production)
PI_API_BASE = 'https://api.minepi.com'
PI_SANDBOX_MODE = false

// TESTNET (Development)
PI_API_BASE = 'https://api.minepi.com'  // Same endpoint
PI_SANDBOX_MODE = true  // Enables mock mode
```

### 2. **Payment ID Storage**
Always store the `paymentId` in your database after creation to:
- Prevent double-payments
- Enable payment tracking
- Support refund processing

### 3. **Transaction ID Storage**
Store the `txid` after blockchain submission for:
- Blockchain verification
- User transaction history
- Audit trails

### 4. **Error Handling**
Common errors:
- `missing_scope` - User hasn't granted proper permissions
- `invalid_uid` - Invalid Pi Network user ID
- `insufficient_balance` - App wallet has insufficient Pi

### 5. **Mock Mode**
The service auto-detects mock mode via `PI_SANDBOX_MODE`:
- `true` = Mock responses for testing
- `false` = Real mainnet transactions

### 6. **Pi UID Required**
A2U payments require the user's **Pi Network UID**, NOT wallet address:
```typescript
// ✅ Correct
uid: 'user_pi_uid_from_authentication'

// ❌ Wrong (this is for old server transfers)
to_address: 'wallet_address'
```

### 7. **Amount Validation**
```typescript
// Valid range: 0.001 to 1,000,000 Pi
if (amount < 0.001 || amount > 1000000) {
  return res.status(400).json({ error: "Invalid amount" });
}
```

---

## 🔗 API ENDPOINTS

### POST `/api/payments/a2u`

**Request Body:**
```json
{
  "uid": "pi_network_user_uid",
  "amount": 5.0,
  "memo": "Payment description",
  "metadata": {
    "type": "A2U",
    "reason": "tournament_win"
  }
}
```

**Success Response (200):**
```json
{
  "success": true,
  "paymentId": "...",
  "txid": "...",
  "transactionId": "...",
  "amount": 5.0,
  "user": { ... },
  "status": { ... },
  "network": "mainnet",
  "timestamp": "..."
}
```

**Error Responses:**
- `400` - Invalid request (missing uid/amount, invalid amount range)
- `404` - User not found
- `500` - Payment processing failed

---

## 🧪 TESTING

### Test Mode (Mock)
```bash
# Run refund script in mock mode
npm run process:refund:test

# Mock mode returns fake payment IDs and txids
# No real Pi is transferred
```

### Production Mode (Real)
```bash
# Run refund script in production mode
npm run process:refund

# REAL Pi tokens are transferred on mainnet
# Use with caution!
```

### Manual API Test
```bash
curl -X POST http://localhost:3000/api/payments/a2u \
  -H "Content-Type: application/json" \
  -d '{
    "uid": "test_user_uid",
    "amount": 1.0,
    "memo": "Test payment",
    "metadata": {"test": true}
  }'
```

---

## 📝 MONITORING & VERIFICATION

### Check Payment Status
```typescript
const payment = await piNetworkService.getPayment(paymentId);
console.log('Payment status:', payment.status);
```

### Blockchain Explorer
Verify transactions on Pi Network blockchain:
```
https://blockchain.minepi.com/transaction/{txid}
```

### Database Queries
```sql
-- Check A2U payments
SELECT * FROM app_transactions 
WHERE metadata->>'type' = 'A2U' 
ORDER BY created_at DESC;

-- Check refunds
SELECT * FROM app_transactions 
WHERE metadata->>'type' = 'refund' 
ORDER BY created_at DESC;
```

---

## 🛡️ SECURITY BEST PRACTICES

1. **Validate User Authentication**
   - Verify JWT token before processing payments
   - Ensure user has proper Pi Network scopes

2. **Validate Amounts**
   - Check amount range (0.001 - 1,000,000 Pi)
   - Prevent negative or zero amounts

3. **Prevent Double Payments**
   - Store payment IDs in database
   - Check for existing payment before creating new one

4. **Error Logging**
   - Log all payment attempts
   - Include paymentId, txid, and user info
   - Monitor for failed payments

5. **Admin Controls**
   - Restrict refund processing to admins
   - Require approval for large payments

---

## 📦 FILES MODIFIED

| File | Changes |
|------|---------|
| `server/services/pi-network.ts` | Added A2U payment methods |
| `server/routes.ts` | Added `/api/payments/a2u` endpoint |
| `scripts/process-a2u-refund-mainnet.ts` | New refund processing script |
| `package.json` | Added refund script commands |

---

## 🚀 DEPLOYMENT CHECKLIST

- [ ] Set `PI_SERVER_API_KEY` to mainnet API key
- [ ] Set `PI_SANDBOX_MODE=false` in production
- [ ] Verify database connection
- [ ] Test with mock mode first (`PI_SANDBOX_MODE=true`)
- [ ] Verify frontend authentication includes all scopes
- [ ] Test A2U payment endpoint
- [ ] Monitor first few real transactions
- [ ] Set up error logging and monitoring

---

## 📞 SUPPORT

If you encounter issues:

1. Check console logs for detailed error messages
2. Verify Pi Network API key is correct
3. Ensure user has granted all required scopes
4. Check database connection
5. Verify `PI_SANDBOX_MODE` setting

---

**Last Updated:** April 15, 2026  
**Version:** 1.0.0  
**Network:** Pi Network Mainnet  
**Status:** ✅ Production Ready
