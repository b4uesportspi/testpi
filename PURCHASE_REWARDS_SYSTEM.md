# Purchase Rewards System Documentation

## Overview

The Purchase Rewards System automatically grants tokens to users based on their successful purchase count. The system tracks completed transactions and awards tokens at specific milestones.

## Reward Structure

### Milestone Rewards (One-time)

| Purchases | Tokens Awarded | Description |
|-----------|----------------|-------------|
| 5         | 1,000          | First milestone reward |
| 10        | 3,000          | Mid-tier loyalty reward |
| 15        | 7,000          | Advanced buyer reward |
| 20        | 20,000         | Elite purchaser reward |

### Post-20 Purchases (Ongoing)

For every purchase beyond 20:
- **Base Reward**: 20,000 tokens
- **Bonus**: 450 tokens (3% of 15,000)
- **Total Per Purchase**: 20,450 tokens

**Example Calculations:**
- 21st purchase: 20,000 + 450 = 20,450 tokens
- 22nd purchase: 20,000 + 450 = 20,450 tokens
- 25th purchase: 20,000 + 450 = 20,450 tokens

## Database Schema

### New Columns Added to `app_users`

```sql
successful_purchases_count INTEGER NOT NULL DEFAULT 0
last_reward_milestone INTEGER DEFAULT NULL
```

- `successful_purchases_count`: Tracks total completed/successful purchases
- `last_reward_milestone`: Records the last milestone claimed (prevents duplicate rewards)

### New Table: `purchase_rewards`

```sql
CREATE TABLE purchase_rewards (
    id varchar PRIMARY KEY,
    user_id varchar REFERENCES app_users(id),
    milestone INTEGER,              -- 5, 10, 15, 20, or 21+
    tokens_awarded INTEGER,
    calculation_details text,       -- Human-readable explanation
    transaction_id varchar,         -- Related transaction
    created_at timestamp
);
```

## Eligibility Criteria

✅ **Eligible Transactions:**
- Status = 'completed'
- Status = 'successful'

❌ **Ineligible Transactions:**
- Status = 'pending'
- Status = 'cancelled'
- Status = 'failed'
- Any other status

## How It Works

### Automatic Reward Distribution

1. **Payment Completion**
   - When a payment is successfully completed via Pi Network API
   - Transaction status is updated to 'completed'
   
2. **Reward Processing**
   - System increments user's `successful_purchases_count`
   - Checks if milestone threshold is reached
   - Verifies milestone hasn't been claimed before
   - Calculates reward amount
   - Adds tokens to user's account
   - Creates record in `purchase_rewards` table

3. **Email Notification** (Pending Implementation)
   - User receives congratulatory email
   - Details reward amount and milestone achieved

### Code Flow

```
Payment Complete → Update Transaction Status → Process Purchase Reward
                                                    ↓
                                    Increment Purchase Count
                                                    ↓
                                    Check Milestone Reached?
                                                    ↓
                                    Already Claimed? → No → Calculate Reward
                                                    ↓         ↓
                                                    Yes    Award Tokens + Log
                                                    ↓
                                            Return Result
```

## API Endpoints

### 1. Backfill Purchase Rewards (Admin Only)

**Endpoint:** `POST /api/admin/backfill-purchase-rewards`

**Purpose:** Manually process rewards for existing users who already met milestones

**Request Body:**
```json
{
  "userId": "user-id-here"  // Optional: process specific user
  // OR
  "allUsers": true          // Process all active users
}
```

**Response:**
```json
{
  "success": true,
  "message": "Processed 150 users",
  "results": [
    {
      "userId": "abc123",
      "username": "john_doe",
      "success": true,
      "tokensAwarded": 1000,
      "milestone": 5,
      "message": "Congratulations! You earned 1000 tokens..."
    }
  ],
  "totalProcessed": 145,
  "totalFailed": 5
}
```

**Usage Example:**
```bash
curl -X POST https://b4uesports.com/api/admin/backfill-purchase-rewards \
  -H "Authorization: Bearer ADMIN_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"allUsers": true}'
```

### 2. Get Purchase Reward Statistics (Admin Only)

**Endpoint:** `GET /api/admin/purchase-reward-stats`

**Purpose:** Retrieve comprehensive statistics about purchase rewards

**Response:**
```json
{
  "success": true,
  "stats": {
    "totalUsers": 45,
    "totalTokens": 1250000,
    "totalRewards": 180,
    "milestoneBreakdown": [
      {
        "milestone": 5,
        "count": 50,
        "total_tokens": 50000
      },
      {
        "milestone": 10,
        "count": 30,
        "total_tokens": 90000
      }
    ],
    "topEarners": [
      {
        "id": "user-id",
        "username": "top_buyer",
        "tokens": 250000,
        "successful_purchases_count": 25,
        "rewards_count": 5,
        "total_reward_tokens": 125450
      }
    ]
  }
}
```

## Command-Line Scripts

### Run Migration & Backfill

```bash
# Apply migration and backfill all users
npm run backfill-rewards

# Backfill specific user
npm run backfill-rewards -- --backfill user-id-here

# Show statistics
npm run backfill-rewards -- --stats

# Skip migration (if already applied)
npm run backfill-rewards -- --skip-migration
```

## Integration Points

### Payment Completion Flow

Located in: `api/main.ts` → `handlePaymentComplete()`

```typescript
// After transaction is marked as completed
const rewardResult = await purchaseRewardService.processCompletedPurchase(
  transaction.user_id,
  transaction.id
);

if (rewardResult.success && rewardResult.tokensAwarded > 0) {
  console.log(`Awarded ${rewardResult.tokensAwarded} tokens for milestone ${rewardResult.milestone}`);
  
  // Optional: Send notification email
  await sendPurchaseRewardEmail({ ... });
}
```

### Service Layer

Located in: `server/services/purchase-reward.ts`

**Key Methods:**
- `processCompletedPurchase(userId, transactionId)` - Main entry point
- `calculateReward(purchaseCount)` - Calculate reward for given count
- `backfillRewardsForUser(userId)` - Backfill for existing user
- `getUserRewards(userId)` - Get all rewards for user
- `getTotalRewardsIssued()` - Get aggregate statistics

## Testing

### Manual Testing Steps

1. **Create Test User**
   ```sql
   SELECT id, username, tokens, successful_purchases_count FROM app_users WHERE username = 'test_user';
   ```

2. **Manually Set Purchase Count**
   ```sql
   UPDATE app_users SET successful_purchases_count = 4 WHERE id = 'user-id';
   ```

3. **Complete a Test Transaction**
   - Make a purchase through the normal flow
   - Verify transaction status becomes 'completed'

4. **Verify Reward**
   ```sql
   SELECT * FROM purchase_rewards WHERE user_id = 'user-id' ORDER BY created_at DESC LIMIT 1;
   SELECT tokens, successful_purchases_count, last_reward_milestone FROM app_users WHERE id = 'user-id';
   ```

### Expected Results

After completing 5th purchase:
- `successful_purchases_count` = 5
- `tokens` increased by 1,000
- `last_reward_milestone` = 5
- Record in `purchase_rewards` table

## Duplicate Prevention

The system prevents duplicate rewards through:

1. **Database Tracking**: `last_reward_milestone` column
2. **Logic Check**: Before awarding, checks if `lastMilestone >= newPurchaseCount`
3. **One-time Milestones**: Milestones 5, 10, 15, 20 can only be claimed once
4. **Post-20 Flexibility**: Purchases 21+ are rewarded every time (no limit)

## Error Handling

### Failure Scenarios

1. **Database Connection Failed**
   - Gracefully logs error
   - Returns failure response
   - Doesn't crash payment flow

2. **User Not Found**
   - Returns error: "User not found"
   - No tokens awarded

3. **Service Unavailable**
   - Catches exception
   - Logs detailed error
   - Payment still completes (reward processing is non-blocking)

### Race Condition Prevention

- Uses database transactions for atomicity
- SQL-level constraints prevent duplicates
- Sequential processing with small delays for bulk operations

## Monitoring & Analytics

### Key Metrics to Track

1. **Total Users Rewarded**: Unique users who received rewards
2. **Total Tokens Awarded**: Sum of all tokens distributed
3. **Total Rewards Issued**: Count of reward records
4. **Milestone Distribution**: Breakdown by milestone level
5. **Top Earners**: Users with highest reward totals

### Database Queries

```sql
-- Total rewards issued
SELECT COUNT(*) as total_rewards, SUM(tokens_awarded) as total_tokens 
FROM purchase_rewards;

-- Rewards by milestone
SELECT milestone, COUNT(*), SUM(tokens_awarded) 
FROM purchase_rewards 
GROUP BY milestone 
ORDER BY milestone;

-- Top 10 reward earners
SELECT u.username, SUM(pr.tokens_awarded) as total_earned 
FROM app_users u
JOIN purchase_rewards pr ON u.id = pr.user_id
GROUP BY u.id, u.username
ORDER BY total_earned DESC
LIMIT 10;
```

## Security Considerations

1. **Admin Authentication Required**: All backfill/stats endpoints require valid JWT with admin privileges
2. **Input Validation**: Validates userId format and request parameters
3. **Rate Limiting**: Bulk operations include delays to prevent database overload
4. **Audit Trail**: All rewards logged with transaction reference and timestamp

## Future Enhancements

### Planned Features

1. **Email Notifications**: Implement dedicated reward email templates
2. **Push Notifications**: Real-time alerts for milestone achievements
3. **Dashboard Widget**: Display progress toward next milestone
4. **Tiered Badges**: Visual indicators for achievement levels
5. **Leaderboard**: Public rankings of top purchasers
6. **Special Promotions**: Bonus token events for limited periods

### Email Template (TODO)

A beautifully designed HTML email template is prepared in `server/services/email-robust.ts` but pending final implementation. The template includes:
- Gradient header with celebration theme
- Prominent token display
- Milestone badge
- Detailed breakdown table
- Call-to-action button
- Responsive design

## Troubleshooting

### Common Issues

**Issue**: Rewards not being awarded
- **Check**: Transaction status is 'completed' (not 'pending' or 'failed')
- **Check**: User's `successful_purchases_count` is incrementing
- **Check**: `last_reward_milestone` isn't blocking

**Issue**: Duplicate rewards
- **Check**: `last_reward_milestone` is being updated correctly
- **Check**: No manual database modifications interfering

**Issue**: Backfill script fails
- **Check**: Database connection string is correct
- **Check**: TypeScript is compiled (`npm run build`)
- **Check**: Sufficient database permissions

## Support

For issues or questions:
1. Check this documentation first
2. Review service logs for detailed error messages
3. Contact development team with:
   - User ID affected
   - Transaction ID
   - Expected vs actual reward amount
   - Timestamp of occurrence

---

**Version**: 1.0  
**Last Updated**: March 22, 2026  
**Author**: Development Team
