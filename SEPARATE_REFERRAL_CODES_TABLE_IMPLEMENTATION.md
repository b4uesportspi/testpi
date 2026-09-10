# Separate Referral Codes Table Implementation

## Overview

This document describes the implementation of a separate referral_codes table to handle referral codes instead of storing them directly in the users table. This approach provides better data organization and ensures unique referral codes.

## Changes Made

### 1. New Database Tables

Created a new `referral_codes` table with the following structure:

```sql
CREATE TABLE IF NOT EXISTS referral_codes (
    id VARCHAR PRIMARY KEY DEFAULT uuid_generate_v4(),
    code TEXT NOT NULL UNIQUE,
    user_id VARCHAR NOT NULL,
    referred_by TEXT, -- referral code of the user who referred this user
    is_used BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    -- Foreign key constraints
    CONSTRAINT fk_referral_codes_user 
        FOREIGN KEY (user_id) 
        REFERENCES users(id) 
        ON DELETE CASCADE,
    
    -- Indexes for better performance
    CONSTRAINT unique_referral_code UNIQUE (code)
);
```

### 2. Database Functions and Triggers

Created database functions and triggers to automatically generate unique referral codes when a user is created:

1. `generate_referral_code()` - Function to generate a random referral code
2. `create_user_referral_code()` - Function to automatically create referral code when user is created
3. Trigger `trigger_create_user_referral_code` - Automatically creates referral code after user insertion

### 3. Updated Schema

Modified the schema to include the new referralCodes table and updated relations.

### 4. Updated Storage Service

Updated the storage service to work with the new referral_codes table:

- `getUserByReferralCode()` - Fetches user by referral code from the referral_codes table
- `getUserReferralCode()` - Gets a user's referral code from the referral_codes table
- `rewardReferrer()` - Rewards a referrer based on the referral_codes table

### 5. Updated API Endpoints

Modified API endpoints to use the new referral_codes table:

- Profile endpoint now fetches referral codes from the referral_codes table
- Referral stats endpoint updated to work with the new table structure
- Pi authentication endpoint updated to fetch referral codes correctly

## Benefits

1. **Separation of Concerns**: Referral codes are now in their own table, separate from user data
2. **Data Integrity**: Unique constraint ensures no duplicate referral codes
3. **Performance**: Indexes on referral code columns improve query performance
4. **Scalability**: Separate table allows for better scaling of referral functionality
5. **Maintainability**: Cleaner data structure makes it easier to manage referral-related features

## Migration

The implementation includes migration scripts to create the new table and update existing databases:

1. `0005_create_referral_codes_table.sql` - Creates the referral_codes table
2. `0006_add_referral_code_generation_trigger.sql` - Adds functions and triggers for automatic referral code generation

## Usage

The system automatically generates unique referral codes for each user when they are created. The referral code is stored in the referral_codes table and linked to the user via the user_id foreign key.

When a user refers another user, the referred user's `referred_by` field is populated with the referrer's referral code. The system then uses this information to reward the referrer with tokens.