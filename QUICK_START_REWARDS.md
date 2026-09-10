# Purchase Rewards System - Quick Start Guide

## 🎯 What's Been Implemented

A complete token reward system that automatically grants tokens to users based on successful purchase milestones.

### Reward Structure

| Milestone | Tokens | Type |
|-----------|--------|------|
| 5 purchases | 1,000 | One-time |
| 10 purchases | 3,000 | One-time |
| 15 purchases | 7,000 | One-time |
| 20 purchases | 20,000 | One-time |
| 21+ purchases | 20,450 | Every purchase (20,000 + 450 bonus) |

## 📦 Files Added/Modified

### New Files
- `migrations/0008_add_purchase_rewards_tracking.sql` - Database migration
- `server/services/purchase-reward.ts` - Core reward service
- `scripts/backfill-purchase-rewards.ts` - CLI tool for backfilling
- `PURCHASE_REWARDS_SYSTEM.md` - Complete documentation
- `QUICK_START_REWARDS.md` - This file

### Modified Files
- `shared/schema.ts` - Added new fields and table definitions
- `api/main.ts` - Integrated rewards into payment flow + admin endpoints
- `server/services/email-robust.ts` - Added reward email notification (stub)
- `package.json` - Added npm scripts
- `client/src/components/purchase-modal.tsx` - Fixed syntax error

## 🚀 Deployment Steps

### Step 1: Apply Database Migration

**Option A: Using the script (Recommended)**
```bash
npm run backfill-rewards
```

This will:
1. Apply the migration automatically
2. Backfill rewards for ALL existing users
3. Show statistics of tokens awarded

**Option B: Manual migration**
```bash
# Apply migration only
psql $DATABASE_URL < migrations/0008_add_purchase_rewards_tracking.sql

# Then backfill rewards
npm run backfill-rewards -- --skip-migration --backfill
```

### Step 2: Verify Database Changes

Check that new columns exist:
```sql
-- Check user columns
SELECT id, username, tokens, successful_purchases_count, last_reward_milestone 
FROM app_users 
LIMIT 5;

-- Check rewards table
SELECT * FROM purchase_rewards LIMIT 5;
```

### Step 3: Test with a Real Purchase

1. Make a test purchase through the normal flow
2. After payment completion, check:
   ```sql
   SELECT tokens, successful_purchases_count, last_reward_milestone 
   FROM app_users 
   WHERE username = 'test_user';
   
   SELECT * FROM purchase_rewards 
   WHERE user_id = 'user-id' 
   ORDER BY created_at DESC LIMIT 1;
   ```

## 🔧 Usage Examples

### For Existing Users (Backfill)

**Process all users:**
```bash
npm run backfill-rewards
```

**Process specific user:**
```bash
npm run backfill-rewards -- --backfill USER_ID_HERE
```

**View statistics:**
```bash
npm run backfill-rewards -- --stats
```

### Admin API Endpoints

**Backfill rewards for all users:**
```bash
curl -X POST https://b4uesports.com/api/admin/backfill-purchase-rewards \
  -H "Authorization: Bearer YOUR_ADMIN_JWT" \
  -H "Content-Type: application/json" \
  -d '{"allUsers": true}'
```

**Get reward statistics:**
```bash
curl -X GET https://b4uesports.com/api/admin/purchase-reward-stats \
  -H "Authorization: Bearer YOUR_ADMIN_JWT"
```

## 📊 Monitoring

### Check User's Current Status
```sql
-- User's purchase count and tokens
SELECT 
  username,
  tokens,
  successful_purchases_count,
  last_reward_milestone
FROM app_users
WHERE username = 'username_here';
```

### View All Rewards Issued
```sql
SELECT 
  pr.milestone,
  pr.tokens_awarded,
  pr.created_at,
  u.username
FROM purchase_rewards pr
JOIN app_users u ON pr.user_id = u.id
ORDER BY pr.created_at DESC;
```

### Top Reward Earners
```sql
SELECT 
  u.username,
  SUM(pr.tokens_awarded) as total_earned,
  COUNT(pr.id) as rewards_count
FROM purchase_rewards pr
JOIN app_users u ON pr.user_id = u.id
GROUP BY u.id, u.username
ORDER BY total_earned DESC
LIMIT 10;
```

## ✅ Verification Checklist

After deployment, verify:

- [ ] Migration applied successfully (check database)
- [ ] New columns exist in `app_users` table
- [ ] `purchase_rewards` table created
- [ ] Backfill script ran without errors
- [ ] Users received correct token amounts
- [ ] Payment completion still works normally
- [ ] Rewards are being logged correctly
- [ ] No duplicate rewards issued

## 🐛 Troubleshooting

### Issue: Migration fails
**Solution:** Check if columns already exist
```sql
-- Manually verify
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'app_users' AND column_name IN ('successful_purchases_count', 'last_reward_milestone');
```

### Issue: Rewards not being awarded
**Solution:** Check transaction status
```sql
-- Only 'completed' or 'successful' transactions count
SELECT status, COUNT(*) FROM app_transactions 
GROUP BY status;
```

### Issue: User has wrong purchase count
**Solution:** Manually recalculate
```sql
-- Count actual completed purchases
SELECT user_id, COUNT(*) as actual_count
FROM app_transactions
WHERE status IN ('completed', 'successful')
GROUP BY user_id;

-- Update if needed (use with caution!)
UPDATE app_users au
SET successful_purchases_count = (
  SELECT COUNT(*) 
  FROM app_transactions at 
  WHERE at.user_id = au.id 
  AND at.status IN ('completed', 'successful')
);
```

## 📈 Expected Results

### Example: User reaches 5 purchases

**Before:**
```sql
tokens: 500
successful_purchases_count: 4
last_reward_milestone: NULL
```

**After 5th purchase completes:**
```sql
tokens: 1500 (500 + 1000 reward)
successful_purchases_count: 5
last_reward_milestone: 5
```

**Purchase rewards record:**
```sql
milestone: 5
tokens_awarded: 1000
calculation_details: "Reached 5 successful purchases milestone"
```

## 🎁 Post-Deployment Support

If users report issues:

1. **Check their purchase count**: 
   ```sql
   SELECT successful_purchases_count FROM app_users WHERE id = 'USER_ID';
   ```

2. **Verify their rewards**:
   ```sql
   SELECT * FROM purchase_rewards WHERE user_id = 'USER_ID';
   ```

3. **Manual backfill if needed**:
   ```bash
   npm run backfill-rewards -- --backfill USER_ID
   ```

## 📝 Important Notes

- ✅ Only transactions with status 'completed' or 'successful' count
- ❌ Pending, cancelled, or failed transactions don't count
- 🔄 Milestones 5, 10, 15, 20 can only be claimed once per user
- 💰 Post-20 rewards (21+) are awarded for EVERY purchase
- ⚡ Reward processing is non-blocking (won't break payment flow)
- 📧 Email notifications pending full implementation

## 🔗 Additional Resources

- Full documentation: `PURCHASE_REWARDS_SYSTEM.md`
- Service code: `server/services/purchase-reward.ts`
- Migration SQL: `migrations/0008_add_purchase_rewards_tracking.sql`
- Admin endpoints: See `api/main.ts` lines 2744-2943

---

**Need Help?** Check the comprehensive documentation in `PURCHASE_REWARDS_SYSTEM.md` or contact the development team.
