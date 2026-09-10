# 🎬 Quick Animation Reference

## ✅ What's Ready to Use

### 1. Import the Animation Library
```typescript
import { motion } from 'framer-motion';
import { 
  fadeInUp, 
  staggerContainer, 
  staggerItem,
  hoverLift,
  buttonPress 
} from '@/lib/animations';
```

### 2. Animate Any Page
```typescript
// Wrap your page content
<motion.div
  initial={{ opacity: 0 }}
  animate={{ opacity: 1 }}
  transition={{ duration: 0.4 }}
>
  {/* Your content */}
</motion.div>
```

### 3. Animate Grid/List Items (Stagger Effect)
```typescript
// Container
<motion.div
  variants={staggerContainer}
  initial="initial"
  animate="animate"
  className="grid grid-cols-3 gap-4"
>
  {/* Items will animate automatically */}
  {items.map((item) => (
    <motion.div key={item.id} variants={staggerItem}>
      <ItemCard {...item} />
    </motion.div>
  ))}
</motion.div>
```

### 4. Add Hover Effects to Cards
```typescript
<motion.div
  whileHover={hoverLift}
  whileTap={buttonPress}
  className="card"
>
  Card Content
</motion.div>
```

### 5. Animate Buttons
```typescript
<motion.button
  whileHover={{ scale: 1.02, y: -2 }}
  whileTap={{ scale: 0.98 }}
  onClick={handleClick}
>
  Click Me
</motion.button>
```

## 🎯 Dashboard Animation Template

```typescript
import { motion } from 'framer-motion';
import { staggerContainer, staggerItem, fadeInUp } from '@/lib/animations';

export default function Dashboard() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
    >
      {/* Stats Cards */}
      <motion.div
        variants={staggerContainer}
        initial="initial"
        animate="animate"
        className="grid grid-cols-4 gap-4 mb-8"
      >
        <motion.div variants={staggerItem}>
          <StatsCard title="Balance" value={balance} />
        </motion.div>
        <motion.div variants={staggerItem}>
          <StatsCard title="Tokens" value={tokens} />
        </motion.div>
        {/* More cards... */}
      </motion.div>

      {/* Package Grid */}
      <motion.div
        variants={staggerContainer}
        initial="initial"
        animate="animate"
        className="grid grid-cols-3 gap-6"
      >
        {packages.map((pkg, index) => (
          <motion.div
            key={pkg.id}
            variants={staggerItem}
            whileHover={{ y: -4, scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <PackageCard {...pkg} />
          </motion.div>
        ))}
      </motion.div>

      {/* Transaction List */}
      <motion.div
        variants={staggerContainer}
        initial="initial"
        animate="animate"
        className="space-y-2"
      >
        {transactions.map((tx) => (
          <motion.div
            key={tx.id}
            variants={staggerItem}
            whileHover={{ x: 4 }}
          >
            <TransactionRow {...tx} />
          </motion.div>
        ))}
      </motion.div>
    </motion.div>
  );
}
```

## 🎨 Available Animations

| Animation | Use For | Example |
|-----------|---------|---------|
| `fadeInUp` | Content entrance | Hero text, sections |
| `staggerContainer` | Parent of list/grid | Package grid, transaction list |
| `staggerItem` | Children in stagger | Cards, list items |
| `hoverLift` | Interactive cards | `{ y: -4, scale: 1.02 }` |
| `buttonPress` | Button tap | `{ scale: 0.98 }` |
| `scaleIn` | Modals, popups | Dialog content |
| `slideInLeft` | Side panels | Navigation drawer |
| `slideInRight` | Side panels | Settings panel |
| `pulse` | Alerts, notifications | Important badges |
| `spin` | Loading indicators | Spinners |

## ⚡ Performance Tips

✅ **DO:**
- Animate `opacity` and `transform` only
- Keep durations short (200-500ms)
- Use stagger for lists
- Test on mobile devices

❌ **DON'T:**
- Animate `width`, `height`, `margin`
- Loop animations continuously
- Add animations to everything
- Use complex 3D transforms

## 📱 Mobile Considerations

- Reduce animation complexity on mobile
- Use shorter durations (150-300ms)
- Test performance on slower devices
- Consider disabling animations for low-end devices

## 🔍 Debugging Animations

```typescript
// Slow down animations for debugging
<motion.div
  transition={{ duration: 2 }} // Slower to see
>
  Content
</motion.div>

// Check if animation is running
<motion.div
  onUpdate={(latest) => console.log(latest)}
>
  Content
</motion.div>
```

## 🎬 Real Examples from Landing Page

### Header Slide Down
```typescript
<motion.div
  initial={{ y: -50, opacity: 0 }}
  animate={{ y: 0, opacity: 1 }}
  transition={{ duration: 0.6, ease: 'easeOut' }}
>
  <Navigation />
</motion.div>
```

### Hero Fade Up
```typescript
<motion.div
  variants={fadeInUp}
  initial="initial"
  animate="animate"
>
  <h1>Gaming Currency</h1>
  <p>Powered by Pi Network</p>
</motion.div>
```

### Feature Cards Stagger
```typescript
<motion.div
  variants={staggerContainer}
  initial="initial"
  animate="animate"
>
  <motion.div variants={staggerItem} whileHover={hoverLift}>
    <FeatureCard title="Live Pricing" />
  </motion.div>
  <motion.div variants={staggerItem} whileHover={hoverLift}>
    <FeatureCard title="Secure Payments" />
  </motion.div>
  <motion.div variants={staggerItem} whileHover={hoverLift}>
    <FeatureCard title="24/7 Support" />
  </motion.div>
</motion.div>
```

## 🚀 Next Steps

1. **Apply to Dashboard** - Use the template above
2. **Enhance Modals** - Add scaleIn animation
3. **Transaction List** - Stagger items
4. **Package Cards** - Add hover effects
5. **Test Performance** - Check on mobile

## 📚 Need More Help?

- Full guide: `ANIMATION_IMPLEMENTATION_GUIDE.md`
- Animation presets: `client/src/lib/animations.ts`
- Reusable components: `client/src/components/animated-*.tsx`

---

**Remember**: Animations should enhance UX, not distract. Less is more! 🎯
