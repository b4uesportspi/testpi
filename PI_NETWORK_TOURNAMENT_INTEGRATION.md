# 🪙 Pi Network Tournament Entry Payment Integration - Complete Overview

## How Tournament Entry Payments Work (Simple Explanation)

Tournament entries use Pi Network's official SDK to accept 5 Pi entry fees. Here's the complete flow:

### 🔐 1. USER AUTHENTICATION
**Frontend (use-pi-network.tsx)**
```typescript
// Step 1: Initialize Pi SDK
await piSDK.init(false); // false = testnet mode

// Step 2: Authenticate user
const authResult = await piSDK.authenticate(
  ['payments', 'username'],  // Request permissions
  onIncompletePaymentFound   // Handle stuck payments
);

// Step 3: Send token to backend for verification
await apiRequest('POST', '/api/auth/pi', {
  accessToken: authResult.accessToken
});
```
**Backend (routes.ts)**
```typescript
// Verify token with Pi Network API
const piUser = await piNetworkService.verifyAccessToken(accessToken);

// Create/update user in database
const user = await storage.createUser({
  username: piUser.username,
  uid: piUser.uid,
  wallet_address: piUser.wallet_address
});
```

### 💳 2. TOURNAMENT PAYMENT PROCESS (3-Step Flow)

**Step A: User Clicks "Register for Tournament"**
**File: dashboard.tsx**
```typescript
const paymentData = {
  amount: 5, // Fixed 5 Pi entry fee
  memo: `PUBG Mobile Tournament Entry - ${teamName}`,
  metadata: {
    type: 'tournament_entry', // Different from package purchases
    userId: user.id,
    gameAccount: {
      tournament: 'PUBG Mobile Arena',
      mode: tournamentMode, // 'Solo', 'Duo', 'Squad'
      teamName: teamName,
      captainIgn: requiredPlayers[0].ign,
      captainUid: requiredPlayers[0].uid,
      players: requiredPlayers, // Array of player objects
      teamLogoName: teamLogo,
      entryFeePi: 5,
    },
  },
};

createPayment(paymentData, {
  // Callback 1: Server needs to approve
  onReadyForServerApproval: async (paymentId) => {
    await apiRequest('POST', '/api/payment/approve', { paymentId });
  },

  // Callback 2: User approved, server completes
  onReadyForServerCompletion: async (paymentId, txid) => {
    await apiRequest('POST', '/api/payment/complete', { paymentId, txid });
  },

  // Callback 3: User cancelled
  onCancel: async (paymentId) => {
    await apiRequest('POST', '/api/payment/cancel', { paymentId });
  },

  // Callback 4: Error occurred
  onError: (error) => {
    console.error('Tournament payment error:', error);
  }
});
```

**Step B: Backend Approves Tournament Payment**
**Endpoint: /api/payment/approve**
```typescript
app.post('/api/payment/approve', async (req, res) => {
  const { paymentId } = req.body;

  // 1. Find transaction in database (tournament entry)
  const transaction = await storage.getTransactionByPaymentId(paymentId);

  // 2. Call Pi Network API to approve
  const approved = await piNetworkService.approvePayment(paymentId);

  if (approved) {
    // 3. Update transaction status
    await storage.updateTransaction(transaction.id, {
      status: 'approved'
    });

    res.json({ success: true });
  } else {
    res.status(500).json({ message: 'Approval failed' });
  }
});
```
**Pi Network API Call:**
```
POST https://api.minepi.com/v2/payments/{paymentId}/approve
Headers: Authorization: Key YOUR_SERVER_API_KEY
```

**Step C: Backend Completes Tournament Payment**
**Endpoint: /api/payment/complete**
```typescript
app.post('/api/payment/complete', async (req, res) => {
  const { paymentId, txid } = req.body;

  // 1. Find transaction
  const transaction = await storage.getTransactionByPaymentId(paymentId);

  // 2. Call Pi Network API to complete
  const completed = await piNetworkService.completePayment(paymentId, txid);

  if (completed) {
    // 3. Mark as completed in database
    await storage.updateTransaction(transaction.id, {
      status: 'completed'
    });

    // 4. Save tournament registration details
    await apiRequest('POST', '/api/tournament-registration/save', {
      userId: transaction.userId,
      teamName: transaction.metadata.gameAccount.teamName,
      players: transaction.metadata.gameAccount.players,
      mode: transaction.metadata.gameAccount.mode,
      paymentId,
      txid
    });

    // 5. Send tournament confirmation email
    await sendTournamentConfirmationEmail({
      to: user.email,
      teamName: transaction.metadata.gameAccount.teamName,
      tournamentName: 'PUBG Mobile Arena',
      mode: transaction.metadata.gameAccount.mode,
      transactionId: transaction.id,
      players: transaction.metadata.gameAccount.players
    });

    // 6. Mark email as sent
    await storage.updateTransaction(transaction.id, {
      emailSent: true
    });

    res.json({ success: true });
  }
});
```
**Pi Network API Call:**
```
POST https://api.minepi.com/v2/payments/{paymentId}/complete
Body: { "txid": "blockchain_transaction_id" }
Headers: Authorization: Key YOUR_SERVER_API_KEY
```

### 📊 DATABASE FLOW FOR TOURNAMENT ENTRIES

**Transaction Lifecycle (app_transactions table)**
```sql
-- Initial state (created when tournament payment starts)
INSERT INTO app_transactions (
  id, user_id, package_id, payment_id,
  status, pi_amount, created_at
) VALUES (
  'uuid-123', 'user-456', NULL, 'pi-payment-abc',  -- No package_id for tournaments
  'pending', 5, NOW()
);

-- After approval
UPDATE app_transactions
SET status = 'approved', updated_at = NOW()
WHERE payment_id = 'pi-payment-abc';

-- After completion
UPDATE app_transactions
SET status = 'completed', updated_at = NOW(),
    email_sent = true
WHERE payment_id = 'pi-payment-abc';
```

**Tournament Registration (tournament_registrations table)**
```sql
-- Created after payment completion
INSERT INTO tournament_registrations (
  id, user_id, tournament_id, team_id,
  status, payment_status, paid_amount_pi,
  metadata, created_at
) VALUES (
  'reg-uuid', 'user-456', 'sample-duo-pubg-swiss', NULL,
  'registered', 'paid', '5',
  '{
    "teamName": "Dragon Squad",
    "players": [...],
    "mode": "Squad",
    "paymentId": "pi-payment-abc",
    "txid": "blockchain-tx-123"
  }',
  NOW()
);
```

### 🔄 COMPLETE TOURNAMENT PAYMENT TIMELINE

```
User clicks "Register for Tournament"
         ↓
Frontend calls Pi SDK createPayment() with tournament metadata
         ↓
┌─────────────────────────────────────┐
│ CALLBACK: onReadyForServerApproval  │
│ → Frontend calls /api/payment/approve│
│ → Backend calls Pi API /approve     │
│ → Database: status = 'approved'     │
└─────────────────────────────────────┘
         ↓
User sees Pi Browser popup
User confirms 5 Pi payment
         ↓
┌──────────────────────────────────────┐
│ CALLBACK: onReadyForServerCompletion │
│ → Frontend calls /api/payment/complete│
│ → Backend calls Pi API /complete     │
│ → Database: status = 'completed'     │
│ → Tournament registration saved      │
│ → Tournament confirmation email sent │
│ → Database: email_sent = true        │
└──────────────────────────────────────┘
         ↓
✅ Tournament registration successful!
User receives tournament confirmation email
Team registered for PUBG Mobile Arena
```

### 🛡️ ERROR HANDLING FOR TOURNAMENT PAYMENTS

**Cancelled Tournament Payments**
```typescript
onCancel: async (paymentId) => {
  // Update database
  await apiRequest('POST', '/api/payment/cancel', { paymentId });
  // Database: status = 'cancelled'
  // No tournament slot reserved
}
```

**Failed Tournament Payments**
```typescript
onError: (error) => {
  console.error('Tournament payment failed:', error);
  // Show error to user
  toast({
    title: "Tournament Registration Failed",
    description: error.message
  });
}
```

**Incomplete Tournament Payments (Stuck)**
```typescript
// Automatically detected when user returns to app
const onIncompletePaymentFound = async (payment) => {
  await apiRequest('POST', '/api/payment/incomplete', {
    paymentId: payment.identifier
  });
  // Backend retries approval/completion
  // Tournament registration may be pending
};
```

### 🔑 KEY DIFFERENCES FROM PACKAGE PURCHASES

| Aspect | Package Purchase | Tournament Entry |
|--------|------------------|------------------|
| **Type** | `'backend'` | `'tournament_entry'` |
| **Package ID** | Required | `null` (optional) |
| **Amount** | Variable (package price) | Fixed (5 Pi) |
| **Metadata** | `{packageId, userId, gameAccount}` | `{userId, gameAccount: {teamName, players, mode, ...}}` |
| **Database** | `app_transactions` only | `app_transactions` + `tournament_registrations` |
| **Email** | Purchase confirmation | Tournament registration confirmation |
| **Memo** | `"Purchase: Package Name"` | `"PUBG Mobile Tournament Entry - TeamName"` |

### ⚙️ CONFIGURATION FOR TOURNAMENT PAYMENTS

**Environment Variables (.env)**
```bash
PI_SERVER_API_KEY=your_key_here
PI_APP_ID=your_app_id
VITE_PI_APP_ID=your_app_id
PI_SANDBOX_MODE=true  # Uses real Pi API data, not mock
DATABASE_URL=postgresql://...
```

**Pi Network Settings**
- Testnet Mode: `piSDK.init(false)` during development
- Mainnet Mode: `piSDK.init(true)` for production
- Required Scopes: `['payments', 'username']`

### 🎯 WHAT MAKES TOURNAMENT PAYMENTS WORK

- Pi SDK handles blockchain communication
- 3-step callback system ensures security
- Backend verification prevents fraud
- Database tracking maintains transaction + registration history
- Tournament-specific metadata captures team/player details
- Email confirmations with tournament details
- Error recovery for incomplete/cancelled payments
- Fixed 5 Pi entry fee structure

### 📁 KEY FILES FOR TOURNAMENT PAYMENTS

| File | Purpose |
|------|---------|
| `client/src/lib/pi-sdk.ts` | Pi SDK wrapper class |
| `client/src/hooks/use-pi-network.tsx` | Authentication & payment hooks |
| `client/src/pages/dashboard.tsx` | Tournament registration UI & payment initiation |
| `server/services/pi-network.ts` | Backend Pi API service |
| `server/routes.ts` | API endpoints (/approve, /complete, /cancel, /tournament-registration/save) |
| `server/services/email.ts` | Tournament confirmation email sending |
| `server/storage.ts` | Database operations for transactions + tournament registrations |