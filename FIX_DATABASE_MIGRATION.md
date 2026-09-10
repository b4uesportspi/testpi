# Fix Database Migration for Failure Reason Column

## Issue Identified

The database is missing the `failure_reason` column in the `app_transactions` table, causing the error:
```
column "failure_reason" does not exist
```

This is preventing the transactions endpoint from working properly and is causing the dashboard to fail when loading transaction data.

## Root Cause Analysis

1. **Missing database migration**: The schema was updated to include the `failure_reason` column but the database migration was not applied
2. **Database schema mismatch**: The application code expects the `failure_reason` column to exist but it's not present in the database

## Fix Applied

### 1. Created Database Migration Script

Created [migrations/001_add_failure_reason_column.sql](file://c:\b4uesports\migrations\001_add_failure_reason_column.sql) to add the missing column:

```sql
-- Migration to add failure_reason column to app_transactions table
ALTER TABLE app_transactions 
ADD COLUMN IF NOT EXISTS failure_reason TEXT;

-- Add a comment to describe the column purpose
COMMENT ON COLUMN app_transactions.failure_reason IS 'Reason for failed or cancelled transactions';
```

## How to Apply the Fix

1. **Run the migration script** on your database:
   ```sql
   ALTER TABLE app_transactions ADD COLUMN IF NOT EXISTS failure_reason TEXT;
   COMMENT ON COLUMN app_transactions.failure_reason IS 'Reason for failed or cancelled transactions';
   ```

2. **Verify the column exists**:
   ```sql
   SELECT column_name, data_type 
   FROM information_schema.columns 
   WHERE table_name = 'app_transactions' AND column_name = 'failure_reason';
   ```

## Files Created

1. [migrations/001_add_failure_reason_column.sql](file://c:\b4uesports\migrations\001_add_failure_reason_column.sql) - Database migration script
2. [FIX_DATABASE_MIGRATION.md](file://c:\b4uesports\FIX_DATABASE_MIGRATION.md) - Documentation

## Expected Results

With this fix:
- The transactions endpoint will work properly
- The dashboard will load transaction data without errors
- The failure reason column will be available for storing transaction failure reasons
- Users will see failure reasons in their transaction history