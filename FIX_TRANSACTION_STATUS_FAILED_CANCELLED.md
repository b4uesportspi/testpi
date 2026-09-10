# Fix Transaction Status for Failed and Cancelled Payments

## Issue Identified

Cancelled or failed payments due to insufficient funds are showing as "pending" instead of properly showing as "failed" or "cancelled". This happens because:

1. **Failed payments not properly marked**: The payment completion endpoint always sets transaction status to "completed" regardless of Pi Network completion success
2. **Missing proper error handling**: Failed Pi Network completions don't update transaction status to "failed"
3. **Incomplete status tracking**: The system doesn't properly track all payment states (pending, approved, completed, failed, cancelled)

## Root Cause Analysis

### Backend Issue
In [api/main.ts](file://c:\b4uesports\api\main.ts), the payment completion endpoint has incorrect logic:
```typescript
// Even if Pi Network completion fails, it still updates transaction status to "completed"
await client.query(
  'UPDATE transactions SET status = $1, txid = $2, updated_at = NOW() WHERE id = $3',
  ['completed', txid, transaction.id]
);
```

This means that even when Pi Network completion fails (e.g., due to insufficient funds), the transaction is still marked as "completed" instead of "failed".

## Fixes Applied

### 1. Enhanced Payment Completion Endpoint Error Handling

Modified [api/main.ts](file://c:\b4uesports\api\main.ts) to properly handle failed Pi Network completions:

```typescript
if (!completed) {
  console.log('Payment Complete endpoint: Payment completion failed with Pi Network API');
  // Update transaction status to failed in database
  if (transaction) {
    await client.query(
      'UPDATE transactions SET status = $1, updated_at = NOW() WHERE id = $2',
      ['failed', transaction.id]
    );
    console.log('Payment Complete endpoint: Transaction marked as failed in database');
  }
  // Return error response
  return res.status(500).json({ 
    message: 'Payment completion failed with Pi Network API', 
    paymentId,
    txid
  });
}
```

### 2. Updated Transaction Status Update Logic

Modified [api/main.ts](file://c:\b4uesports\api\main.ts) to only update transaction status to "completed" when Pi Network completion is successful:

```typescript
// Update transaction with txid and completed status only if Pi Network completion was successful
if (completed) {
  await client.query(
    'UPDATE transactions SET status = $1, txid = $2, updated_at = NOW() WHERE id = $3',
    ['completed', txid, transaction.id]
  );
  console.log('Payment Complete endpoint: Transaction completed successfully', { transactionId: transaction.id });
}
```

### 3. Updated Success Response Logic

Modified [api/main.ts](file://c:\b4uesports\api\main.ts) to only send success response when completion was successful:

```typescript
if (completed) {
  res.status(200).json({ success: true, transactionId: transaction.id, txid });
}
```

## How the Fix Works

1. **Successful payment**:
   - Pi Network completion succeeds
   - Transaction status updated to "completed"
   - Success response sent to frontend

2. **Failed payment (insufficient funds)**:
   - Pi Network completion fails
   - Transaction status updated to "failed"
   - Error response sent to frontend

3. **Cancelled payment**:
   - User cancels payment
   - Frontend calls [/api/payment/cancel](file://c:\b4uesports\api\main.ts#L77-L77) endpoint
   - Transaction status updated to "cancelled"
   - Success response sent to frontend

## Files Modified

1. [api/main.ts](file://c:\b4uesports\api\main.ts) - Enhanced payment completion endpoint error handling
2. [FIX_TRANSACTION_STATUS_FAILED_CANCELLED.md](file://c:\b4uesports\FIX_TRANSACTION_STATUS_FAILED_CANCELLED.md) - Documentation of the fix

## Expected Results

With these fixes:
- Failed payments due to insufficient funds properly show as "failed" instead of "pending"
- Cancelled payments properly show as "cancelled" instead of "pending"
- Transaction status tracking is accurate for all payment states
- Users see correct payment status in their transaction history
- Better user experience with clear payment status indicators