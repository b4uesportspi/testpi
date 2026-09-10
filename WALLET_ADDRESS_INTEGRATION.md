# Wallet Address Integration - MAINNET

## 📋 OVERVIEW

Automatic wallet address fetching and storage for all users (new and existing) during Pi Network authentication.

**Status:** ✅ Complete  
**Network:** Pi Network Mainnet  
**Last Updated:** April 15, 2026

---

## 🚀 WHAT'S NEW

### 1. **Automatic Wallet Address Fetching**
- ✅ Fetches wallet address during every login
- ✅ Saves to database automatically
- ✅ Works for both new and existing users
- ✅ Uses Pi UID for identification

### 2. **Updated Authentication Scopes**
- ✅ Added `wallet_address` scope
- ✅ Required for A2U payments and refunds
- ✅ User consent during login

### 3. **Database Storage**
- ✅ Wallet address saved on first login
- ✅ Updated on subsequent logins if changed
- ✅ Ready for A2U refund processing

---

## 🔧 CHANGES MADE

### Backend Changes

#### 1. **Pi Network Service** (`server/services/pi-network.ts`)

**Added Method:**
```typescript
async getUserWalletAddress(accessToken: string): Promise<string | null>
```

**What it does:**
- Calls Pi Network API endpoint `/v2/me/wallet_address`
- Requires `wallet_address` scope in authentication
- Returns user's wallet address or null
- Handles errors gracefully

**Example:**
```typescript
const walletAddress = await piNetworkService.getUserWalletAddress(accessToken);
console.log('Wallet address:', walletAddress);
// Output: Wallet address: GAXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
```

#### 2. **Authentication Endpoint** (`server/routes.ts`)

**Updated:** `POST /api/auth/pi`

**New Features:**
1. Fetches wallet address from Pi Network
2. Saves wallet address for new users
3. Updates wallet address for existing users
4. Logs all wallet operations

**Flow:**
```
User Login
  ↓
Verify Access Token
  ↓
🆕 Fetch Wallet Address
  ↓
User Exists?
  ├─ NO → Create user WITH wallet address
  └─ YES → Update wallet address if changed
  ↓
Return User Data (includes wallet address)
```

**Code Example:**
```typescript
// Fetch wallet address
let walletAddress = '';
try {
  walletAddress = await piNetworkService.getUserWalletAddress(accessToken) || '';
  
  if (walletAddress) {
    console.log('✅ Wallet address obtained:', walletAddress);
  }
} catch (walletError) {
  console.error('❌ Error fetching wallet address:', walletError);
  // Don't fail authentication if wallet fetch fails
}

// For new users
const newUser = {
  piUID: piUser.uid,
  username: piUser.username,
  walletAddress: walletAddress, // 🆕 Saved immediately
  // ... other fields
};

// For existing users
if (walletAddress && walletAddress !== user.walletAddress) {
  await storage.updateUser(user.id, { walletAddress });
  console.log('✅ User wallet address updated');
}
```

### Frontend Changes

#### **Authentication Hook** (`client/src/hooks/use-pi-network.tsx`)

**Updated Scopes:**
```typescript
// BEFORE
const authResult = await piSDK.authenticate(
  ['payments', 'username'], 
  onIncompletePaymentFound
);

// AFTER 🆕
const authResult = await piSDK.authenticate(
  ['username', 'payments', 'wallet_address'], 
  onIncompletePaymentFound
);
```

**Required Scopes:**
- `username` - User identification
- `payments` - Payment permissions
- `wallet_address` - 🆕 Wallet address access (for A2U refunds)

**Error Handling:**
```typescript
// Updated error messages
if (errorMessage.includes('wallet')) {
  errorMessage = "Permissions missing. Please ensure you grant all requested permissions including payments and wallet address when authenticating.";
}
```

---

## 📊 DATABASE SCHEMA

### Users Table (`app_users`)

```sql
-- Wallet address column (already exists)
wallet_address TEXT

-- Now automatically populated during authentication
```

**Example Data:**
```sql
SELECT id, username, pi_uid, wallet_address 
FROM app_users 
WHERE wallet_address IS NOT NULL;

-- Results:
-- id | username    | pi_uid        | wallet_address
-- 1  | john_doe    | abc123xyz     | GAXXXXXXXXXXXXXX...
-- 2  | jane_smith  | def456uvw     | GAYYYYYYYYYYYYYY...
```

---

## 🔄 USER FLOW

### New User Registration

```
1. User opens app in Pi Browser
   ↓
2. Pi SDK authenticates with scopes:
   ['username', 'payments', 'wallet_address']
   ↓
3. User grants permissions (including wallet_address)
   ↓
4. Backend receives access token
   ↓
5. Backend fetches wallet address from Pi Network
   ↓
6. Backend creates user record WITH wallet address
   ↓
7. User can now receive A2U payments/refunds
```

### Existing User Login

```
1. User logs in
   ↓
2. Pi SDK authenticates with wallet_address scope
   ↓
3. Backend fetches current wallet address
   ↓
4. Backend checks if wallet address changed
   ↓
5. If changed → Updates database
   ↓
6. If same → No update needed
   ↓
7. User data returned (includes wallet address)
```

---

## 🎯 USAGE EXAMPLES

### Example 1: Check User's Wallet Address

```typescript
// After authentication
const user = await storage.getUser(userId);
console.log('User wallet address:', user.walletAddress);
```

### Example 2: Use Wallet Address for A2U Refund

```typescript
// Get user with wallet address
const user = await storage.getUserByPiUID(uid);

if (!user.walletAddress) {
  console.error('User has no wallet address - they need to login again');
  return;
}

// Process refund using wallet address
const refund = await piNetworkService.createEnhancedServerTransfer(
  user.piUID,  // Use Pi UID
  amount,
  'Refund',
  { type: 'refund' }
);
```

### Example 3: Query Users with Wallet Addresses

```sql
-- Get all users with wallet addresses
SELECT 
  id, 
  username, 
  pi_uid, 
  wallet_address,
  created_at
FROM app_users
WHERE wallet_address IS NOT NULL 
  AND wallet_address != ''
ORDER BY created_at DESC;

-- Count users with wallet addresses
SELECT COUNT(*) as users_with_wallet
FROM app_users
WHERE wallet_address IS NOT NULL 
  AND wallet_address != '';
```

---

## ⚠️ IMPORTANT NOTES

### 1. **User Consent Required**
Users MUST grant the `wallet_address` permission during authentication. If they deny it:
- Authentication still succeeds
- Wallet address will be empty
- A2U refunds will fail for that user

**Solution:** Ask user to login again and grant all permissions.

### 2. **Wallet Address Updates**
- Fetched on EVERY login
- Updated in database if changed
- Ensures you always have the latest address

### 3. **Backward Compatibility**
- Existing users without wallet addresses: Will get address on next login
- New users: Get address immediately on registration
- No data loss or migration needed

### 4. **Error Handling**
- If wallet fetch fails, authentication continues
- Wallet address will be empty string
- Log warnings for monitoring

### 5. **Pi UID Usage**
- All A2U payments use Pi UID (not wallet address)
- Wallet address stored for reference and future use
- Pi UID is the primary identifier

---

## 🔍 MONITORING & VERIFICATION

### Check Console Logs

**Successful Wallet Fetch:**
```
📡 Fetching wallet address for user: abc123xyz
✅ Wallet address obtained: GAXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
✅ New user created: user-id-123
💾 Wallet address saved: GAXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
```

**Existing User Update:**
```
👤 Existing user found: user-id-123
✅ User wallet address updated: user-id-123 GAXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
```

**No Wallet Address:**
```
📡 Fetching wallet address for user: abc123xyz
⚠️  No wallet address returned - user may need to grant wallet_address permission
```

### Database Queries

```sql
-- Check which users have wallet addresses
SELECT 
  COUNT(*) FILTER (WHERE wallet_address IS NOT NULL AND wallet_address != '') as with_wallet,
  COUNT(*) FILTER (WHERE wallet_address IS NULL OR wallet_address = '') as without_wallet,
  COUNT(*) as total
FROM app_users;

-- Find users without wallet addresses (need to login again)
SELECT id, username, pi_uid, created_at
FROM app_users
WHERE wallet_address IS NULL OR wallet_address = ''
ORDER BY created_at DESC;
```

---

## 🧪 TESTING

### Test New User Registration

1. Clear browser data
2. Login with Pi Network
3. Grant all permissions (including wallet_address)
4. Check console logs for wallet address
5. Verify database has wallet address

### Test Existing User Login

1. Login with existing user (no wallet address)
2. Grant wallet_address permission
3. Check console logs for update
4. Verify database updated with wallet address

### Test Without Permission

1. Login and DENY wallet_address permission
2. Authentication should still succeed
3. Wallet address should be empty
4. User can login again later to grant permission

---

## 📦 FILES MODIFIED

| File | Changes |
|------|---------|
| `server/services/pi-network.ts` | Added `getUserWalletAddress()` method |
| `server/routes.ts` | Updated `/api/auth/pi` to fetch & save wallet |
| `client/src/hooks/use-pi-network.tsx` | Added `wallet_address` scope |

---

## 🚀 BENEFITS

### 1. **Ready for A2U Refunds**
- All users have wallet addresses stored
- Easy to process refunds using Pi UID
- No manual wallet address collection needed

### 2. **Automatic Updates**
- Wallet address updated on every login
- Always current information
- No stale data

### 3. **User Experience**
- Seamless - no extra steps for users
- One-time permission grant
- Works in background

### 4. **Developer Experience**
- Easy to query wallet addresses
- Ready for A2U payment processing
- Comprehensive logging

---

## 🔗 RELATED FEATURES

- **A2U Payments:** `/api/payments/a2u` endpoint
- **Refund Processing:** `npm run process:refund`
- **Pi UID Authentication:** Primary user identifier
- **Mainnet Integration:** All production-ready

---

## 📞 TROUBLESHOOTING

### Issue: Wallet address not saved

**Check:**
1. User granted `wallet_address` permission?
2. Console logs show fetch attempt?
3. Pi Network API key correct?
4. Database connection working?

**Solution:**
- Ask user to login again
- Ensure they grant ALL permissions
- Check console for errors

### Issue: User denied wallet_address permission

**Symptoms:**
- Authentication succeeds
- Wallet address is empty
- Console shows warning

**Solution:**
- User must logout and login again
- Grant wallet_address permission this time
- Wallet address will be saved on next login

### Issue: Wallet address not updating

**Check:**
1. Wallet address actually changed?
2. Database update query successful?
3. Console shows update log?

**Solution:**
- Check Pi Network for actual wallet address
- Verify database connection
- Check for errors in logs

---

**Last Updated:** April 15, 2026  
**Version:** 1.0.0  
**Status:** ✅ Production Ready
