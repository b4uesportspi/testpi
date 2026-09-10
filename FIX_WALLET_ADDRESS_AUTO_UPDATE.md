# Fix Wallet Address Auto-Update After First Purchase

## Issue Identified

After a user's first successful purchase, their wallet address is not automatically fetched and updated in the UI. This happens because:

1. **Frontend doesn't refresh user data**: The purchase modal only invalidates the transactions query but doesn't refresh the user data to get the updated wallet address
2. **Backend only updates wallet address if not already set**: The payment completion endpoint only updates the user's wallet address if it's not already set, which means subsequent purchases won't update it

## Root Cause Analysis

### Frontend Issue
In [client/src/components/purchase-modal.tsx](file://c:\b4uesports\client\src\components\purchase-modal.tsx), after a successful payment, only the transactions query is invalidated:
```typescript
// Refresh transactions after successful payment
queryClient.invalidateQueries({ queryKey: ['transactions'] });
```

But the user data query is not invalidated, so the UI still shows the old user data without the wallet address.

### Backend Issue
In [api/main.ts](file://c:\b4uesports\api\main.ts), the payment completion endpoint only updates the wallet address if it's not already set:
```typescript
// Update user's wallet address if it's not already set
if (walletAddress && !transaction.user_wallet_address) {
  // Update wallet address
}
```

This means that if a user makes multiple purchases, only the first one would update their wallet address.

## Fixes Applied

### 1. Enhanced Frontend to Refresh User Data

Modified [client/src/components/purchase-modal.tsx](file://c:\b4uesports\client\src\components\purchase-modal.tsx) to also invalidate the user data query after a successful payment:

```typescript
// Refresh transactions and user data after successful payment
queryClient.invalidateQueries({ queryKey: ['transactions'] });
queryClient.invalidateQueries({ queryKey: ['user'] });
```

### 2. Updated Backend to Always Update Wallet Address

Modified [api/main.ts](file://c:\b4uesports\api\main.ts) to always update the user's wallet address when available, not just when it's not already set:

```typescript
// Update user's wallet address if we have one
if (walletAddress) {
  try {
    await client.query(
      'UPDATE app_users SET wallet_address = $1, updated_at = NOW() WHERE id = $2',
      [walletAddress, transaction.user_id]
    );
    console.log('Payment Complete endpoint: User wallet address updated:', transaction.user_id, walletAddress);
  } catch (updateError) {
    console.error('Payment Complete endpoint: Failed to update user wallet address:', updateError);
  }
} else if (!walletAddress) {
  console.log('Payment Complete endpoint: No wallet address available for user:', transaction.user_id);
}
```

## How the Fix Works

1. **User makes first purchase**:
   - Payment is processed through Pi Network
   - Backend extracts wallet address from payment details
   - Backend updates user's wallet address in database
   - Frontend invalidates both transactions and user queries
   - UI automatically refreshes to show updated wallet address

2. **Subsequent purchases**:
   - Backend continues to extract and update wallet address for accuracy
   - Frontend refreshes user data after each purchase
   - UI always shows current wallet address

## Files Modified

1. [client/src/components/purchase-modal.tsx](file://c:\b4uesports\client\src\components\purchase-modal.tsx) - Added user data query invalidation
2. [api/main.ts](file://c:\b4uesports\api\main.ts) - Updated wallet address update logic to always update when available

## Expected Results

With these fixes:
- Users will see their wallet address automatically populated after their first successful purchase
- Wallet address will be updated for accuracy with each purchase
- UI will automatically refresh to show the current wallet address
- No manual refresh or logout/login required to see the updated wallet address
- Better user experience with automatic wallet address detection