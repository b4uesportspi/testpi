# Database Migration Fix for Pi Authentication Issue

## Problem
The Pi authentication is failing with the error:
```
error: column "tokens" does not exist
```

This is happening because the database schema in production doesn't include the tokens column that was added to the users table.

## Root Cause
1. The database schema was updated to include a `tokens` column in the users table
2. A migration script was created to add this column
3. However, the migration has not been applied to the production database
4. The API code is trying to access the tokens column which doesn't exist yet

## Solution Options

### Option 1: Temporary Fix (Already Implemented)
The API code has been updated with fallback logic to handle cases where the tokens column doesn't exist:
- When querying users, if the tokens column is missing, it falls back to a query without that column
- When creating users, if the tokens column is missing, it falls back to an insert without that column
- When updating users, if the tokens column is missing, it falls back to an update without that column
- In all cases, a default tokens value of 0 is provided

### Option 2: Apply the Migration (Recommended)
Apply the database migration to add the tokens column to the production database.

## How to Apply the Migration

### Method 1: Using the Provided Script
Run the migration script:
```bash
npm run db:migrate:prod
```

This script will:
1. Check if the tokens column already exists
2. If not, apply the migration to add the column
3. Test that the column is working correctly

### Method 2: Manual SQL Command
Connect to your Supabase database and run:
```sql
ALTER TABLE users ADD COLUMN tokens INTEGER NOT NULL DEFAULT 0;
```

## Verification Steps

### 1. Check Current Schema
Before applying the migration, you can verify the issue by checking if the tokens column exists:
```sql
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'users' AND column_name = 'tokens';
```

### 2. After Applying Migration
Verify the column was added successfully:
```sql
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'users' AND column_name = 'tokens';
```

## Files Modified

### 1. [api/main.ts](file://c:\Users\HP\B4U%20Esports\api\main.ts)
- Added fallback logic to handle missing tokens column
- Enhanced error handling for database operations

### 2. [migrations/0001_add_tokens_to_users.sql](file://c:\Users\HP\B4U%20Esports\migrations\0001_add_tokens_to_users.sql)
- Fixed table name from "app_users" to "users"

### 3. [apply-migration.js](file://c:\Users\HP\B4U%20Esports\apply-migration.js)
- Created script to apply migration to production database

### 4. [package.json](file://c:\Users\HP\B4U%20Esports\package.json)
- Added `db:migrate:prod` script

## Testing the Fix

### 1. With Temporary Fix
The authentication should now work even without applying the migration, thanks to the fallback logic.

### 2. After Applying Migration
After applying the migration:
1. The fallback logic won't be needed
2. Performance will be slightly better
3. The tokens column will be properly integrated

## Rollback Plan

If there are any issues with the migration:
1. The temporary fix will continue to work
2. You can remove the tokens column with:
   ```sql
   ALTER TABLE users DROP COLUMN tokens;
   ```

## Final Notes

The temporary fix ensures that the authentication will work immediately, while applying the migration will provide the full functionality with better performance. It's recommended to apply the migration as soon as possible to ensure proper database schema consistency.