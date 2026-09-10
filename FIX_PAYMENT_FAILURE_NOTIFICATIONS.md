# Fix Payment Failure Notifications

## Issue Identified

When users' payments are cancelled or fail, they are not receiving email notifications with reasons for these failures. Only admins were receiving notifications, but users should also be informed about payment issues to improve their experience and understanding.

## Root Cause Analysis

1. **Missing email notification function**: No function to send payment failure notifications to users
2. **Incomplete backend logic**: Payment completion and cancellation endpoints weren't sending failure notifications
3. **Sync endpoint missing notifications**: Transaction status sync endpoint wasn't notifying users of failed/cancelled transactions

## Fixes Applied

### 1. Added Payment Failure Notification Function

Enhanced [server/services/email.ts](file://c:\b4uesports\server\services\email.ts) with a new function to send payment failure notifications to users:

```typescript
export async function sendPaymentFailureNotification(params: PaymentFailureNotificationParams): Promise<boolean> {
  // Implementation that sends failure notifications to users with:
  // - Reason for failure/cancellation
  // - Transaction details
  // - Support contact information
  // - Clear call-to-action
}
```

### 2. Enhanced Payment Completion Endpoint

Modified [api/main.ts](file://c:\b4uesports\api\main.ts) to send failure notifications when payments fail:

```typescript
// Send failure notification email to user
try {
  if (transaction.user_email && transaction.package_name) {
    // Load email service dynamically
    const emailModule = await import('../dist/server/services/email.js');
    const { sendPaymentFailureNotification } = emailModule;
    
    console.log('Payment Complete endpoint: Attempting to send payment failure notification email to user:', transaction.user_email);
    const emailResult = await sendPaymentFailureNotification({
      to: transaction.user_email,
      username: transaction.user_username,
      packageName: transaction.package_name,
      piAmount: transaction.pi_amount,
      failureReason: 'Payment completion failed with Pi Network API',
      transactionId: transaction.id,
      paymentId: paymentId,
      isCancelled: false
    });
    
    if (emailResult) {
      console.log('Payment Complete endpoint: Payment failure notification email sent successfully to user:', transaction.user_email);
    } else {
      console.log('Payment Complete endpoint: Failed to send payment failure notification email to user:', transaction.user_email);
    }
  } else {
    console.log('Payment Complete endpoint: Skipping failure notification email - missing user email or package name');
  }
} catch (emailError) {
  console.error('Payment Complete endpoint: Payment failure notification email sending failed:', emailError);
}
```

### 3. Enhanced Payment Cancellation Endpoint

Modified [api/main.ts](file://c:\b4uesports\api\main.ts) to send cancellation notifications when payments are cancelled:

```typescript
// Send cancellation notification email to user
try {
  if (transaction.user_email && transaction.package_name) {
    // Load email service dynamically
    const emailModule = await import('../dist/server/services/email.js');
    const { sendPaymentFailureNotification } = emailModule;
    
    console.log('Payment Cancel endpoint: Attempting to send payment cancellation notification email to user:', transaction.user_email);
    const emailResult = await sendPaymentFailureNotification({
      to: transaction.user_email,
      username: transaction.user_username,
      packageName: transaction.package_name,
      piAmount: transaction.pi_amount,
      failureReason: 'Payment cancelled by user',
      transactionId: transaction.id,
      paymentId: paymentId,
      isCancelled: true
    });
    
    if (emailResult) {
      console.log('Payment Cancel endpoint: Payment cancellation notification email sent successfully to user:', transaction.user_email);
    } else {
      console.log('Payment Cancel endpoint: Failed to send payment cancellation notification email to user:', transaction.user_email);
    }
  } else {
    console.log('Payment Cancel endpoint: Skipping cancellation notification email - missing user email or package name');
  }
} catch (emailError) {
  console.error('Payment Cancel endpoint: Payment cancellation notification email sending failed:', emailError);
}
```

### 4. Enhanced Transaction Sync Endpoint

Modified [api/main.ts](file://c:\b4uesports\api\main.ts) to send failure notifications when transactions are marked as failed or cancelled during sync:

```typescript
// Send failure notification email to user if transaction is failed or cancelled
if ((newStatus === 'failed' || newStatus === 'cancelled') && failureReason) {
  try {
    // Get full transaction details with user and package info
    const fullTransaction = await storage.getTransaction(transaction.id);
    if (fullTransaction && fullTransaction.user_email && fullTransaction.package_name) {
      // Load email service dynamically
      const emailModule = await import('../dist/server/services/email.js');
      const { sendPaymentFailureNotification } = emailModule;
      
      console.log('Sync Transaction Statuses endpoint: Attempting to send payment failure notification email to user:', fullTransaction.user_email);
      const emailResult = await sendPaymentFailureNotification({
        to: fullTransaction.user_email,
        username: fullTransaction.user_username,
        packageName: fullTransaction.package_name,
        piAmount: fullTransaction.pi_amount,
        failureReason: failureReason,
        transactionId: fullTransaction.id,
        paymentId: fullTransaction.payment_id,
        isCancelled: newStatus === 'cancelled'
      });
      
      if (emailResult) {
        console.log('Sync Transaction Statuses endpoint: Payment failure notification email sent successfully to user:', fullTransaction.user_email);
      } else {
        console.log('Sync Transaction Statuses endpoint: Failed to send payment failure notification email to user:', fullTransaction.user_email);
      }
    } else {
      console.log('Sync Transaction Statuses endpoint: Skipping failure notification email - missing user email or package name');
    }
  } catch (emailError) {
    console.error('Sync Transaction Statuses endpoint: Payment failure notification email sending failed:', emailError);
  }
}
```

## How the Fix Works

1. **Payment failures**: When a payment fails during completion, users receive an email with the reason
2. **Payment cancellations**: When a payment is cancelled, users receive an email with the reason
3. **Sync failures**: When the sync process detects failed/cancelled transactions, users receive emails
4. **Admin notifications**: Admins continue to receive purchase notifications as before
5. **User experience**: Users are informed about payment issues and can take appropriate action

## Files Modified

1. [server/services/email.ts](file://c:\b4uesports\server\services\email.ts) - Added payment failure notification function
2. [api/main.ts](file://c:\b4uesports\api\main.ts) - Enhanced endpoints to send failure notifications
3. [FIX_PAYMENT_FAILURE_NOTIFICATIONS.md](file://c:\b4uesports\FIX_PAYMENT_FAILURE_NOTIFICATIONS.md) - Documentation

## Expected Results

With these fixes:
- Users receive email notifications when their payments fail or are cancelled
- Notifications include clear reasons for the failure/cancellation
- Admins continue to receive purchase notifications as before
- Better user experience with transparent communication
- Reduced support requests due to clear error messaging