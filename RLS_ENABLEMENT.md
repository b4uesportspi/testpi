# Row Level Security (RLS) Enablement

This document describes how to enable and manage Row Level Security (RLS) for the B4U Esports database.

## Scripts

Two scripts have been created to manage RLS:

1. `scripts/enable_rls_for_existing_tables.ts` - Enables RLS on all existing tables and creates policies
2. `scripts/verify_rls_enabled.ts` - Verifies that RLS is properly enabled

## How to Enable RLS

To enable RLS on all existing tables, run:

```bash
npx tsx scripts/enable_rls_for_existing_tables.ts
```

This script will:
- Enable RLS on all existing tables
- Create appropriate policies for each table
- Grant necessary permissions

## How to Verify RLS

To verify that RLS is properly enabled, run:

```bash
npx tsx scripts/verify_rls_enabled.ts
```

This script will:
- Check that RLS is enabled on all tables
- List the policies for each table

## Tables with RLS Enabled

The following tables have RLS enabled:

1. `app_admins` - Admin records
2. `app_packages` - Game packages
3. `app_transactions` - Payment transactions
4. `app_users` - User profiles
5. `pi_price_history` - Pi price history

## Policies Created

### app_admins
- Admins can view own records
- Admins can insert records
- Admins can update records
- Admins can delete records

### app_packages
- Users can view active packages
- Admins can manage packages

### app_transactions
- Users can view own transactions
- System can insert transactions
- System can update transactions

### app_users
- Users can view own profile
- Users can update own profile
- System can insert users

### pi_price_history
- Anyone can view price history
- Admins can manage price history

## Security Notes

- RLS ensures that users can only access data they're authorized to see
- Policies are designed to balance security with functionality
- Permissions are granted to `authenticated` and `anon` roles as appropriate