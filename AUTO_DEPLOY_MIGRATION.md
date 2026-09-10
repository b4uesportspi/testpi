# Automatic Deployment Process for Failure Reason Migration

## Overview

This document describes how to automatically deploy the database migration to add the `failure_reason` column to the `app_transactions` table.

## Migration Scripts

Two migration scripts have been created:
1. [scripts/migrate-failure-reason.ts](file://c:\b4uesports\scripts\migrate-failure-reason.ts) - TypeScript version
2. [scripts/migrate-failure-reason.js](file://c:\b4uesports\scripts\migrate-failure-reason.js) - JavaScript version

## Package.json Scripts

The following npm scripts have been added to [package.json](file://c:\b4uesports\package.json):
- `db:migrate-failure-reason` - Runs the TypeScript migration
- `db:migrate-failure-reason-js` - Runs the JavaScript migration

## How to Run the Migration

### Option 1: Using TypeScript (Recommended)
```bash
npm run db:migrate-failure-reason
```

### Option 2: Using JavaScript
```bash
npm run db:migrate-failure-reason-js
```

## What the Migration Does

1. Checks if the `failure_reason` column already exists in the `app_transactions` table
2. If it doesn't exist, adds the column with type `TEXT`
3. Adds a comment to describe the column's purpose
4. Reports success or failure

## Expected Output

Successful migration:
```
Starting database migration for failure_reason column...
Checking if failure_reason column exists...
Adding failure_reason column to app_transactions table...
Adding comment to failure_reason column...
Migration completed successfully!
```

If column already exists:
```
Starting database migration for failure_reason column...
Checking if failure_reason column exists...
Column failure_reason already exists. Skipping migration.
```

## Error Handling

If the migration fails, you'll see an error message like:
```
Migration failed: [error details]
```

Common issues:
1. Database connection problems
2. Insufficient permissions
3. Table doesn't exist

## Verification

After running the migration, you can verify it worked by checking the database schema:
```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'app_transactions' AND column_name = 'failure_reason';
```

This should return one row with the column details if successful.