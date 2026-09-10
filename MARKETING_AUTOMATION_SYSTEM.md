# B4U Esports Marketing Automation System

## Campaigns

### 1. Inactive Users Campaign
- Trigger: users inactive for 7 days or more
- Schedule: daily
- Goal: re-engagement and conversion recovery

Suggested subject:
- `We saved 500 bonus tokens for you - 2% off ends soon`

Body summary:
- Personalized greeting with username
- Reminds user they have a limited-time comeback reward
- Includes one-time coupon code
- Offers `2% off` plus `500 bonus tokens` after completed purchase
- CTA: `Make a Purchase Now`
- Includes urgency with exact expiry

### 2. Monthly Buyers Campaign
- Trigger: users with completed purchases in the current month
- Schedule: first day of each month
- Goal: reward loyalty and drive repeat purchase

Suggested subject:
- `VIP thank-you: your 500 token reward + 2% off is live`

Body summary:
- Personalized thank-you
- States reward is reserved for the user
- Includes one-time coupon code
- Offers `2% off` plus `500 bonus tokens` after completed purchase
- CTA: `Make a Purchase Now`
- Includes urgency with exact expiry

## Offer Rules

- Discount: `2%`
- Reward: `500 tokens`
- Coupon is:
  - one-time use
  - assigned to a specific user
  - expires in `5 days` for inactive users
  - expires in `7 days` for monthly buyers

## System Workflow

1. Scheduled GitHub Actions trigger the campaign endpoints.
2. The server selects eligible users while excluding duplicates.
3. A tracked email send record is created.
4. A unique coupon is generated and linked to that user and email send.
5. The email is sent with:
   - tracking pixel for opens
   - tracked CTA redirect for clicks
   - personalized one-time code
6. At checkout, the user enters the code.
7. The backend validates:
   - ownership
   - active status
   - expiry
   - one-time usage
8. On successful payment completion:
   - the coupon is marked used
   - the coupon cannot be reused or shared
   - `500 tokens` are added to the user
   - conversion is tied back to the originating email send

## Tracking and Analytics

Tracked metrics:
- email sent
- open count
- click count
- first open timestamp
- first click timestamp
- coupon redemption
- conversion transaction id

Core tables:
- `marketing_email_sends`
- `marketing_coupons`
- `marketing_email_events`

## Best Practices

- Keep one clear CTA per email.
- Use short expiry windows to create urgency without feeling deceptive.
- Limit duplicate sends by campaign period and user activity window.
- Use user-specific coupons only; never generic shared campaign codes.
- Track conversions to learn which campaign actually drives revenue.
- Prefer daily or monthly batching over aggressive send frequency.
- Avoid spam wording and excessive punctuation in subject lines.
- Keep the layout responsive and lightweight for mobile users.
- Honor inactivity and purchase segmentation so messaging stays relevant.
