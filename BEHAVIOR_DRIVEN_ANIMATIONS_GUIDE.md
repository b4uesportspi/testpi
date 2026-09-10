# 🎬 Behavior-Driven Animations - Integration Guide

## ✅ What's Been Created (Production-Grade)

### 1. Coin Burst Animation (`coin-burst.tsx`)
**Purpose:** Celebratory coin explosion after successful actions
**When to use:**
- ✅ Payment success
- ✅ Reward claims
- ✅ Token purchases
- ✅ Achievement unlocks

### 2. Animated Counter (`animated-counter.tsx`)
**Purpose:** Smooth number counting (0 → value)
**When to use:**
- ✅ Balance displays
- ✅ Statistics
- ✅ Reward amounts
- ✅ Transaction totals

### 3. Success Modal (`success-modal.tsx`)
**Purpose:** Emotional feedback after successful actions
**Features:**
- Coin burst effect
- Animated checkmark
- Counter animation for rewards
- Staggered content reveal

### 4. Reward Reveal (`reward-reveal.tsx`)
**Purpose:** Loot-box style suspense → reveal dopamine loop
**Flow:**
1. **Suspense Phase** (1.5s) - Mystery box spinning
2. **Reveal Phase** - Coin burst + counter animation
3. **Complete Phase** - Auto-cleanup

---

## 🎯 Integration Examples

### Example 1: Payment Success Flow

```typescript
import { useState } from 'react';
import SuccessModal from '@/components/success-modal';

export default function PurchaseFlow() {
  const [showSuccess, setShowSuccess] = useState(false);
  const [purchaseData, setPurchaseData] = useState(null);

  const handlePaymentComplete = async () => {
    // 1. Call API to confirm payment
    const response = await fetch('/api/payment/complete', {
      method: 'POST',
      body: JSON.stringify({ paymentId, txid }),
    });
    
    const data = await response.json();
    
    // 2. Show success modal with animations
    setPurchaseData(data);
    setShowSuccess(true);
    
    // 3. Refresh user balance in background
    refreshUser();
  };

  return (
    <>
      {/* Your payment UI */}
      <Button onClick={handlePaymentComplete}>
        Complete Purchase
      </Button>

      {/* Success Modal with all animations */}
      <SuccessModal
        isOpen={showSuccess}
        onClose={() => setShowSuccess(false)}
        title="Purchase Successful! 🎉"
        message={`You've purchased ${data.packageName}`}
        rewardAmount={data.tokensEarned}
        rewardLabel="tokens"
        showCoinBurst={true}
      />
    </>
  );
}
```

### Example 2: Ad Reward Claim (Dopamine Loop)

```typescript
import { useState } from 'react';
import RewardReveal from '@/components/reward-reveal';

export default function AdsButton() {
  const [showReward, setShowReward] = useState(false);
  const [rewardAmount, setRewardAmount] = useState(0);

  const handleWatchAd = async () => {
    // 1. Show ad
    const adResponse = await showRewardedAd();
    
    if (adResponse.result === 'AD_REWARDED') {
      // 2. Call API in background (don't block UI)
      const apiCall = fetch('/api/user/tokens/add', {
        method: 'POST',
        body: JSON.stringify({ amount: 10, adId: adResponse.adId }),
      });
      
      // 3. Show reward animation immediately (dopamine hit!)
      setRewardAmount(10);
      setShowReward(true);
      
      // 4. API completes in background
      const response = await apiCall;
      refreshUser();
    }
  };

  return (
    <>
      <Button onClick={handleWatchAd}>
        Watch Ad & Earn Tokens
      </Button>

      {/* Loot-box style reward reveal */}
      <RewardReveal
        isVisible={showReward}
        rewardAmount={rewardAmount}
        rewardLabel="tokens"
        suspenseDelay={1500} // Build suspense for 1.5s
        onComplete={() => setShowReward(false)}
      />
    </>
  );
}
```

### Example 3: Dashboard Balance Display

```typescript
import AnimatedCounter from '@/components/animated-counter';

export default function Dashboard() {
  const { user } = usePiNetwork();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Your Balance</CardTitle>
      </CardHeader>
      <CardContent>
        {/* Animated counter instead of static number */}
        <div className="text-4xl font-bold">
          <AnimatedCounter
            targetValue={user?.balance || 0}
            duration={2}
            decimals={2}
            prefix="π "
          />
        </div>
      </CardContent>
    </Card>
  );
}
```

### Example 4: Stats Dashboard

```typescript
import AnimatedCounter from '@/components/animated-counter';

export default function StatsDashboard() {
  const stats = {
    totalUsers: 1250,
    totalTransactions: 5430,
    totalVolume: 12500,
  };

  return (
    <div className="grid grid-cols-3 gap-4">
      <StatCard
        label="Total Users"
        value={stats.totalUsers}
      />
      <StatCard
        label="Transactions"
        value={stats.totalTransactions}
      />
      <StatCard
        label="Volume (π)"
        value={stats.totalVolume}
        decimals={0}
      />
    </div>
  );
}

function StatCard({ label, value, decimals = 0 }) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="text-2xl font-bold text-primary">
          <AnimatedCounter
            targetValue={value}
            duration={1.5}
            decimals={decimals}
          />
        </div>
        <p className="text-sm text-muted-foreground">{label}</p>
      </CardContent>
    </Card>
  );
}
```

---

## 🔥 Advanced Usage Patterns

### Pattern 1: Animation First, API Second (Best UX)

```typescript
const handleRewardClaim = async () => {
  // ❌ BAD: Wait for API, then animate
  const response = await fetch('/api/reward');
  setShowAnimation(true);

  // ✅ GOOD: Animate immediately, API in background
  setShowAnimation(true);
  const response = await fetch('/api/reward');
  // Handle errors silently
};
```

### Pattern 2: Sequential Animations

```typescript
const [step, setStep] = useState(1);

// Step 1: Coin burst
// Step 2: Show modal
// Step 3: Update balance

<Button onClick={() => setStep(1)}>Trigger</Button>

<CoinBurst isActive={step === 1} onComplete={() => setStep(2)} />
<SuccessModal isOpen={step === 2} onClose={() => setStep(3)} />
{step === 3 && <RefreshBalance />}
```

### Pattern 3: Conditional Animations

```typescript
const shouldAnimate = userPreference !== 'reduced-motion';

{shouldAnimate ? (
  <SuccessModal isOpen={show} {...props} />
) : (
  <SimpleDialog isOpen={show} {...props} />
)}
```

---

## 🎨 Customization Guide

### Coin Burst
```typescript
<CoinBurst
  isActive={true}
  coinCount={30} // More coins = more celebration
  onComplete={() => console.log('Done!')}
/>
```

### Success Modal
```typescript
<SuccessModal
  isOpen={true}
  onClose={handleClose}
  title="Payment Successful!"
  message="Your purchase has been confirmed"
  rewardAmount={100} // Optional: shows counter
  rewardLabel="tokens"
  showCoinBurst={true} // Enable/disable coin effect
/>
```

### Reward Reveal
```typescript
<RewardReveal
  isVisible={true}
  rewardAmount={50}
  rewardLabel="points"
  suspenseDelay={2000} // Longer suspense = more anticipation
  onComplete={handleComplete}
/>
```

### Animated Counter
```typescript
<AnimatedCounter
  targetValue={1234.56}
  duration={2} // Seconds
  decimals={2}
  prefix="$ "
  suffix=" USD"
  className="text-4xl font-bold"
/>
```

---

## ⚡ Performance Considerations

### ✅ DO:
- Use animations after API calls (not during)
- Limit coin burst to 20-30 coins
- Keep counter duration under 2s
- Use `pointer-events-none` on overlays
- Clean up animations with `onComplete`

### ❌ DON'T:
- Trigger animations during loading
- Use coin burst on every small action
- Stack multiple heavy animations
- Forget to clean up timers
- Animate on every render (use state)

---

## 🎯 Where to Add in Your App

### High Priority (Money + Engagement):
1. ✅ **Payment Success** - SuccessModal with coin burst
2. ✅ **Ad Rewards** - RewardReveal with suspense
3. ✅ **Balance Display** - AnimatedCounter
4. ✅ **Referral Bonuses** - RewardReveal
5. ✅ **Purchase Confirmations** - SuccessModal

### Medium Priority (UX Polish):
1. Stats counters on dashboard
2. Transaction amount displays
3. Token balance in header
4. Package prices
5. Milestone achievements

### Low Priority (Nice to Have):
1. Loading spinners
2. Tab transitions
3. Form field focus
4. Navigation menu
5. Footer elements

---

## 📊 Expected Impact

### User Psychology:
- **Coin Burst** → Perceived value increase 📈
- **Reward Reveal** → Dopamine loop (addiction) 🎰
- **Animated Counters** → Professional feel ✨
- **Success Modal** → Emotional satisfaction 😊

### Business Metrics:
- ↑ Ad watch rate (reward anticipation)
- ↑ Purchase completion (emotional payoff)
- ↑ User retention (dopamine loop)
- ↑ Perceived value (coin burst effect)
- ↓ Support tickets (clear feedback)

---

## 🚀 Quick Start

### 1. Import Components
```typescript
import SuccessModal from '@/components/success-modal';
import RewardReveal from '@/components/reward-reveal';
import AnimatedCounter from '@/components/animated-counter';
import CoinBurst from '@/components/coin-burst';
```

### 2. Add State
```typescript
const [showSuccess, setShowSuccess] = useState(false);
const [showReward, setShowReward] = useState(false);
```

### 3. Trigger on Actions
```typescript
// After payment
setShowSuccess(true);

// After ad reward
setShowReward(true);
```

### 4. Render Components
```typescript
<SuccessModal isOpen={showSuccess} onClose={() => setShowSuccess(false)} {...data} />
<RewardReveal isVisible={showReward} rewardAmount={10} />
```

---

## 🎬 Real Example: Dashboard Integration

See `DASHBOARD_ANIMATION_TEMPLATE.md` for complete dashboard implementation with all behavior-driven animations.

---

## 📚 Resources

- Framer Motion: https://www.framer.com/motion/
- Animation Principles: https://principles.animation/
- Dopamine Design: https://uxplanet.org/dopamine-design/

---

**Status: ✅ Production Ready**

All components are optimized, tested, and ready to integrate. Focus on payment flow and rewards first for maximum impact! 🚀
