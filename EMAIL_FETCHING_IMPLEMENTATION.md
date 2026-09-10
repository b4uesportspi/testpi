# Email Fetching Implementation

This document explains how to fetch user and admin emails from the database for sending notifications in the B4U Esports application.

## Implementation Details

The email fetching functionality has been implemented in two files:

1. [server/storage.ts](file://c:\b4uesports\server\storage.ts) - Added database methods
2. [server/services/email-utils.ts](file://c:\b4uesports\server\services\email-utils.ts) - Added utility functions

## Database Methods Added

### 1. getAllUserEmails()
Fetches all user email addresses from the users table.

### 2. getAllAdminEmails()
Fetches all admin email addresses from the admins table.

## Utility Functions

### 1. getAllUserEmails()
Wrapper function that calls the storage method and handles errors.

### 2. getAllAdminEmails()
Wrapper function that calls the storage method and handles errors.

### 3. getAllEmails()
Fetches both user and admin emails in a single call.

### 4. sendBulkEmails()
Example function showing how to use the email fetching functions.

## How to Use

### Fetch User Emails Only
```javascript
import { getAllUserEmails } from '../server/services/email-utils.js';

const userEmails = await getAllUserEmails();
console.log('User emails:', userEmails);
```

### Fetch Admin Emails Only
```javascript
import { getAllAdminEmails } from '../server/services/email-utils.js';

const adminEmails = await getAllAdminEmails();
console.log('Admin emails:', adminEmails);
```

### Fetch Both User and Admin Emails
```javascript
import { getAllEmails } from '../server/services/email-utils.js';

const { userEmails, adminEmails } = await getAllEmails();
console.log('User emails:', userEmails);
console.log('Admin emails:', adminEmails);
```

## Testing

A test script has been created to demonstrate the functionality:

### Running the Test
```bash
npm run test:email-fetching
```

This will output all user and admin emails found in the database.

## Integration with Existing Email System

The fetched emails can be used with the existing email functions:

1. [sendPurchaseConfirmationEmail](file://c:\b4uesports\server\services\email.ts#L44-L206) - For user purchase confirmations
2. [sendProfileUpdateEmail](file://c:\b4uesports\server\services\email.ts#L209-L300) - For user profile updates
3. [sendAdminPurchaseNotification](file://c:\b4uesports\server\services\email.ts#L303-L474) - For admin notifications
4. [sendPaymentFailureNotification](file://c:\b4uesports\server\services\email.ts#L477-L630) - For payment failure notifications

## Example Usage in Payment Completion

```javascript
// After a successful payment
const userEmails = await getAllUserEmails();
for (const email of userEmails) {
  await sendPurchaseConfirmationEmail({
    to: email,
    username: 'User',
    packageName: 'Sample Package',
    piAmount: '10',
    usdAmount: '10',
    gameAccount: 'Sample Account',
    transactionId: 'sample-transaction-id',
    paymentId: 'sample-payment-id'
  });
}
```

## Security Considerations

1. All database queries are properly handled with error checking
2. Email addresses are filtered to remove empty or invalid entries
3. The functions return empty arrays in case of errors to prevent application crashes

## Error Handling

All functions include proper error handling:
- Database connection errors
- Query execution errors
- Empty result handling
- Invalid email filtering

The functions will log errors to the console but will not throw exceptions, ensuring the application continues to function even if email fetching fails.