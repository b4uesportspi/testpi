# URGENT: Fix Missing Database Columns Error

## Problem
The application is failing with this error:
```
Error: column "successful_purchases_count" does not exist
```

The database is missing two critical columns that the application code requires:
- `successful_purchases_count` - Tracks user's completed purchases
- `last_reward_milestone` - Tracks purchase reward milestones (5, 10, 15, 20)

## Root Cause
The migration `0008_add_purchase_rewards_tracking.sql` was created but never applied to the production database.

## Solution

### Option 1: Using the Provided Script (Recommended)

1. Set your database URL environment variable:
```bash
export DATABASE_URL="postgresql://user:password@host:port/database"
```

2. Run the migration script:
```bash
node apply-purchase-rewards-migration.js
```

3. The script will:
   - Connect to your database
   - Execute the migration SQL
   - Verify the columns were created successfully
   - Show you confirmation of the changes

### Option 2: Manual SQL Execution

If you prefer to run the SQL directly through your database client:

1. Connect to your PostgreSQL database
2. Execute the SQL in `run-migration-fix.sql`:
```sql
-- Add column to track total successful purchases
ALTER TABLE "app_users" 
ADD COLUMN IF NOT EXISTS "successful_purchases_count" INTEGER NOT NULL DEFAULT 0;

-- Add column to track last milestone reached (5, 10, 15, 20)
ALTER TABLE "app_users" 
ADD COLUMN IF NOT EXISTS "last_reward_milestone" INTEGER DEFAULT NULL;

-- Create purchase_rewards table
CREATE TABLE IF NOT EXISTS "purchase_rewards" (
    "id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "user_id" varchar NOT NULL REFERENCES "app_users"("id") ON DELETE CASCADE,
    "milestone" INTEGER NOT NULL,
    "tokens_awarded" INTEGER NOT NULL,
    "calculation_details" text NOT NULL,
    "transaction_id" varchar REFERENCES "app_transactions"("id"),
    "created_at" timestamp DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS "idx_purchase_rewards_user_id" ON "purchase_rewards"("user_id");
CREATE INDEX IF NOT EXISTS "idx_purchase_rewards_milestone" ON "purchase_rewards"("milestone");
```

### Option 3: Drizzle Migrations (For Development)

For local development, you can run Drizzle migrations:
```bash
npm run db:migrate
```

Or if using `drizzle-kit`:
```bash
npx drizzle-kit migrate
```

## Verification

After applying the migration, verify the columns exist:

```sql
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'app_users' 
AND column_name IN ('successful_purchases_count', 'last_reward_milestone')
ORDER BY column_name;
```

Expected output:
```
       column_name        | data_type | is_nullable
---------------------------+-----------+-------------
 last_reward_milestone    | integer   | YES
 successful_purchases_count | integer   | NO
```

## Post-Migration Steps

1. ✅ Apply the migration using one of the options above
2. ✅ Restart your application server
3. ✅ Test Pi authentication again - the error should be gone
4. ✅ Users can now be created/updated with the purchase rewards tracking

## Files Related to This Issue

- **Migration SQL**: `migrations/0008_add_purchase_rewards_tracking.sql`
- **Migration Script**: `apply-purchase-rewards-migration.js`
- **Schema Definition**: `shared/schema.ts` (lines 29-30)
- **Application Code Using These Columns**:
  - `api/main.ts` (lines 2910, 2916)
  - `server/storage.ts` (createUser, updateUser methods)

## Database Change Details

This migration:
- ✅ Uses `IF NOT EXISTS` to be idempotent (safe to run multiple times)
- ✅ Sets default values (0 for count, NULL for milestone)
- ✅ Creates the supporting `purchase_rewards` table for tracking rewards
- ✅ Adds performance indexes for lookups
- ✅ Maintains backward compatibility with existing data

## Next Steps for Prevention

1. **Update migration tracking**: Add the `0008_add_purchase_rewards_tracking` tag to your migrations journal if using Drizzle Kit
2. **Test migrations before production**: Always test migrations in staging first
3. **Document schema changes**: Keep schema changes synchronized between code and database

---

**Status**: Ready to apply
**Created**: 2026-03-23 13:48:30 UTC
**Impact**: Critical - Blocks Pi authentication and user creation
