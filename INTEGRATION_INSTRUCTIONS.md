# Integration Instructions for Pi Network Payment Fix

## Overview
This document provides step-by-step instructions for integrating the payment completion fix into your main API file.

## Prerequisites
1. Ensure all environment variables are properly configured in your `.env.production` file
2. Verify that the Pi Network API key is correct and active
3. Confirm that your application is configured for MAINNET (not sandbox)

## Steps to Integrate

### 1. Update Environment Variables
First, ensure your `.env.production` file has all required variables:

```env
# Database (PostgreSQL)
DATABASE_URL=postgresql://user:password@host:5432/database

# Pi Network
PI_SERVER_API_KEY=fnobm1afj6tpfn8ocfmv3htmnaedn5jnqf0uzylg0tf5doeuk6ajc9y7zofvhm8r
VALIDATION_KEY=your_actual_validation_key_here

# Authentication
JWT_SECRET=your-secure-jwt-secret-here
SESSION_SECRET=4d8bc6f0d7bdd59b5546ef8090c4b81af0ad11a5ef9dbe2f9c60346d40dfea6a80c2312bc688cfe2e48b9f81688bf764

# CoinGecko API
COINGECKO_API_KEY=your_coingecko_api_key_here

# Admin Email
ADMIN_EMAIL=info@b4uesports.com

# SMTP Configuration
SMTP_HOST=smtp.hostinger.com
SMTP_PORT=587
SMTP_USER=info@b4uesports.com
SMTP_PASS=your-password-here
SMTP_FROM=info@b4uesports.com
SMTP_FROM_NAME=B4U Esports

# Network Configuration
NETWORK=MAINNET
APP_URL=https://b4uesportstest.vercel.app

# Other
NODE_ENV=production
PI_SANDBOX_MODE=false
```

### 2. Fix Merge Conflicts in main.ts
The main API file (`api/main.ts`) contains extensive merge conflicts that need to be resolved. You have two options:

Option A: Use a clean version of the file and integrate your existing endpoints
Option B: Manually resolve all merge conflicts

### 3. Add Dotenv Loading to main.ts
Add the following lines at the top of your `api/main.ts` file:

```typescript
import dotenv from 'dotenv';
dotenv.config();
```

### 4. Replace Payment Completion Endpoint
Replace the existing `handlePaymentComplete` function with the enhanced version from `payment-fix.ts`. The key improvements are:

1. **Enhanced Debugging**: Detailed logging of request parameters and headers
2. **Payment Status Verification**: Check payment status before attempting completion
3. **Retry Mechanism**: Exponential backoff for failed attempts
4. **Improved Error Handling**: Specific messages for common 400 error causes

### 5. Update Pi Network Service
In `server/services/pi-network.ts`, ensure the `completePayment` method includes:

1. Payment status verification before completion
2. Detailed error logging
3. Retry mechanism with exponential backoff
4. Specific handling for 400 errors

### 6. Deploy to Vercel
After making these changes:

1. Commit your changes to git
2. Deploy to Vercel
3. Verify that environment variables are properly configured in the Vercel dashboard

## Testing the Integration

### 1. Environment Variable Test
Run the debug script to verify environment variables:
```bash
npx tsx debug-env.ts
```

### 2. Module Test
Test the payment fix module:
```bash
npx tsx test-payment-production.ts
```

## Common Issues and Solutions

### 1. 400 Error - Payment Already Completed
Ensure you're checking payment status before attempting completion.

### 2. 400 Error - Invalid txid
Verify that the transaction ID is valid and corresponds to an actual Pi Network transaction.

### 3. 400 Error - Payment Not Approved
Make sure the user has approved the payment in their Pi Network wallet.

### 4. 401 Error - Invalid API Key
Verify that the PI_SERVER_API_KEY is correct and properly configured.

## Monitoring and Debugging

After deployment, monitor your logs for the enhanced debugging information:

1. Look for "Payment complete debug" entries
2. Check for payment status verification logs
3. Monitor retry attempts and their outcomes
4. Review error messages for specific failure causes

## Rollback Plan

If issues occur after deployment:

1. Revert to the previous version
2. Check Vercel environment variables
3. Verify Pi Network API key validity
4. Contact Pi Network support if needed
