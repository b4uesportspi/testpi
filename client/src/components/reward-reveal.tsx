import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';
import AnimatedCounter from './animated-counter';
import CoinBurst from './coin-burst';

interface RewardRevealProps {
  isVisible: boolean;
  rewardAmount: number;
  rewardLabel?: string;
  onComplete?: () => void;
  suspenseDelay?: number;
}

/**
 * RewardReveal - Loot-box style reward animation with suspense
 * Usage: Show when user claims ad reward, referral bonus, etc.
 */
export default function RewardReveal({
  isVisible,
  rewardAmount,
  rewardLabel = 'tokens',
  onComplete,
  suspenseDelay = 1500, // 1.5s suspense build-up
}: RewardRevealProps) {
  const [phase, setPhase] = useState<'hidden' | 'suspense' | 'reveal' | 'complete'>('hidden');
  const [showCoins, setShowCoins] = useState(false);

  useEffect(() => {
    if (isVisible) {
      // Phase 1: Suspense build-up
      setPhase('suspense');
      setShowCoins(false);

      // Phase 2: Reveal reward
      const revealTimer = setTimeout(() => {
        setPhase('reveal');
        setShowCoins(true);
      }, suspenseDelay);

      // Phase 3: Complete
      const completeTimer = setTimeout(() => {
        setPhase('complete');
        onComplete?.();
      }, suspenseDelay + 3000);

      return () => {
        clearTimeout(revealTimer);
        clearTimeout(completeTimer);
      };
    } else {
      setPhase('hidden');
      setShowCoins(false);
    }
  }, [isVisible, suspenseDelay, onComplete]);

  return (
    <AnimatePresence>
      {phase !== 'hidden' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
          {/* Coin Burst on Reveal */}
          <CoinBurst isActive={showCoins} coinCount={25} />

          {/* Main Reward Display */}
          <motion.div
            className="relative"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ 
              scale: phase === 'suspense' ? [1, 1.1, 1] : 1,
              opacity: 1 
            }}
            transition={{
              scale: {
                duration: 0.8,
                repeat: phase === 'suspense' ? Infinity : 0,
                ease: 'easeInOut',
              },
              opacity: { duration: 0.3 },
            }}
          >
            {/* Suspense Phase - Mystery Box */}
            {phase === 'suspense' && (
              <motion.div
                className="text-center"
                initial={{ rotateY: 0 }}
                animate={{ rotateY: 360 }}
                transition={{ duration: 1.5, ease: 'easeInOut' }}
              >
                <div className="text-8xl mb-4">🎁</div>
                <motion.p
                  animate={{ opacity: [0.5, 1, 0.5] }}
                  transition={{ duration: 1, repeat: Infinity }}
                  className="text-xl font-semibold text-yellow-400"
                >
                  Revealing your reward...
                </motion.p>
              </motion.div>
            )}

            {/* Reveal Phase - Show Reward */}
            {phase === 'reveal' && (
              <motion.div
                className="bg-gradient-to-br from-yellow-500/30 to-orange-500/30 backdrop-blur-xl border-2 border-yellow-400 rounded-3xl p-8 shadow-2xl"
                initial={{ scale: 0.5, rotateX: -90 }}
                animate={{ scale: 1, rotateX: 0 }}
                transition={{
                  type: 'spring',
                  stiffness: 200,
                  damping: 15,
                }}
              >
                <motion.div
                  initial={{ y: -20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.2 }}
                  className="text-center"
                >
                  <div className="text-6xl mb-4">🎉</div>
                  <p className="text-sm text-yellow-300 mb-2 uppercase tracking-wide">
                    Reward Earned!
                  </p>
                  <div className="text-6xl font-bold text-yellow-400 mb-2">
                    <AnimatedCounter
                      targetValue={rewardAmount}
                      duration={2}
                      suffix={` ${rewardLabel}`}
                    />
                  </div>
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 1 }}
                    className="text-sm text-muted-foreground"
                  >
                    Added to your balance ✨
                  </motion.p>
                </motion.div>
              </motion.div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
