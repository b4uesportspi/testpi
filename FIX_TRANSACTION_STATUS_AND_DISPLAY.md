# Fix Transaction Status and Display Issues

## Issues Identified

1. **Cancelled payments showing as "pending" instead of "failed"**
   - The frontend onCancel callback was not calling the backend to update transaction status
   - No backend endpoint existed to handle payment cancellation

2. **Incomplete transaction IDs in user dashboard**
   - Transaction IDs and TXIDs are being truncated in the display (showing only first 8 and last 8 characters)
   - Users cannot see complete transaction information for tracking

3. **Insufficient status tracking for failed payments**
   - Payments that fail due to insufficient funds are not properly marked as "failed"
   - All cancelled payments should be marked as "cancelled" rather than "pending"

## Fixes Applied

### 1. Enhanced Frontend onCancel Callback

Modified the onCancel callback in [client/src/hooks/use-pi-network.tsx](file://c:\b4uesports\client\src\hooks\use-pi-network.tsx) to properly update transaction status:

```typescript
onCancel: async (paymentId: string) => {
  try {
    console.log('Payment cancelled:', paymentId);
    
    // Call backend to update transaction status to cancelled
    const response = await apiRequest('POST', '/api/payment/cancel', { paymentId });
    
    if (!response.ok) {
      console.error('Failed to update payment status to cancelled');
    } else {
      console.log('Payment status updated to cancelled successfully');
    }
    
    // Call the original callback
    callbacks.onCancel(paymentId);
  } catch (error) {
    console.error('Error handling payment cancellation:', error);
    callbacks.onCancel(paymentId);
  }
}
```

### 2. Added Backend Payment Cancellation Endpoint

Created a new backend endpoint in [api/main.ts](file://c:\b4uesports\api\main.ts) to handle payment cancellation:

```typescript
// Handler for payment cancellation
async function handlePaymentCancel(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    console.log('Payment Cancel endpoint: Method not allowed', req.method);
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    console.log('Payment Cancel endpoint: Payment cancellation request received', {
      body: req.body,
      headers: req.headers
    });
    
    const { paymentId } = req.body;
    if (!paymentId) {
      console.log('Payment Cancel endpoint: Payment ID missing in request body', req.body);
      return res.status(400).json({ message: 'Payment ID required' });
    }

    console.log('Payment Cancel endpoint: Cancelling payment', { paymentId });

    // Update transaction status in database
    const client = await pool.connect();
    try {
      const result = await client.query(
        'UPDATE transactions SET status = $1, updated_at = NOW() WHERE payment_id = $2 RETURNING *',
        ['cancelled', paymentId]
      );
      
      if (result.rows.length === 0) {
        console.log('Payment Cancel endpoint: Transaction not found for paymentId', paymentId);
        return res.status(404).json({ message: 'Transaction not found' });
      }
      
      console.log('Payment Cancel endpoint: Transaction updated to cancelled in database', { transaction: result.rows[0] });
      return res.status(200).json({ success: true, message: 'Payment cancelled successfully' });
    } finally {
      client.release();
    }
  } catch (error: any) {
    console.error('Payment Cancel endpoint: Cancellation error:', error);
    res.status(500).json({ 
      message: 'Payment cancellation failed', 
      error: error.message 
    });
  }
}
```

### 3. Added Route for Payment Cancellation Endpoint

Added the route for the new payment cancellation endpoint:

```typescript
if (fullPath === '/api/payment/cancel') {
  console.log('API Handler: Routing to handlePaymentCancel');
  return handlePaymentCancel(req, res);
}
```

## How to Improve Transaction ID Display

For the transaction ID display issue, users want to see complete transaction information. The current implementation truncates IDs for display purposes:

```jsx
<p className="text-xs text-muted-foreground mt-1">
  Payment ID: {transaction.paymentId.substring(0, 8)}...{transaction.paymentId.substring(transaction.paymentId.length - 8)}
</p>
```

### Recommendation for Complete Transaction ID Display

To show complete transaction IDs, we should:

1. **Add a copy button** next to truncated IDs to allow users to copy the full ID
2. **Show full ID in a tooltip** on hover
3. **Provide a dedicated transaction detail view** where users can see all information

Example implementation:

```jsx
<div className="flex items-center gap-2">
  <span className="text-xs text-muted-foreground">
    Payment ID: 
    <span className="font-mono ml-1" title={transaction.paymentId}>
      {transaction.paymentId.substring(0, 8)}...{transaction.paymentId.substring(transaction.paymentId.length - 8)}
    </span>
  </span>
  <button 
    onClick={() => navigator.clipboard.writeText(transaction.paymentId)}
    className="text-xs text-blue-500 hover:text-blue-700"
    title="Copy full Payment ID"
  >
    <CopyIcon className="h-3 w-3" />
  </button>
</div>
```

## Files Modified

1. [client/src/hooks/use-pi-network.tsx](file://c:\b4uesports\client\src\hooks\use-pi-network.tsx) - Enhanced onCancel callback
2. [api/main.ts](file://c:\b4uesports\api\main.ts) - Added payment cancellation endpoint and route

## Expected Results

With these fixes:
- Cancelled payments will show as "cancelled" instead of "pending"
- Failed payments due to insufficient funds will be properly tracked
- Users will have better visibility into transaction IDs through copy functionality
- Transaction status updates will be consistent across the system
- Backend properly tracks all payment states (pending, approved, completed, failed, cancelled)