import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';

interface Coin {
  id: number;
  x: number;
  y: number;
  rotation: number;
  scale: number;
  delay: number;
}

interface CoinBurstProps {
  isActive: boolean;
  onComplete?: () => void;
  coinCount?: number;
}

/**
 * CoinBurst - Celebratory coin explosion animation
 * Usage: Trigger after successful payment or reward
 */
export default function CoinBurst({ 
  isActive, 
  onComplete, 
  coinCount = 20 
}: CoinBurstProps) {
  const [coins, setCoins] = useState<Coin[]>([]);

  useEffect(() => {
    if (isActive) {
      const newCoins: Coin[] = Array.from({ length: coinCount }, (_, i) => ({
        id: i,
        x: (Math.random() - 0.5) * 400, // Spread horizontally
        y: -Math.random() * 600 - 100, // Fly upward
        rotation: Math.random() * 720 - 360, // Random rotation
        scale: 0.5 + Math.random() * 0.5, // Random size
        delay: Math.random() * 0.3, // Staggered start
      }));
      setCoins(newCoins);

      // Clean up after animation
      const timer = setTimeout(() => {
        onComplete?.();
      }, 1500);

      return () => clearTimeout(timer);
    }
  }, [isActive, coinCount, onComplete]);

  return (
    <AnimatePresence>
      {isActive && (
        <div className="fixed inset-0 pointer-events-none z-50">
          {coins.map((coin) => (
            <motion.div
              key={coin.id}
              initial={{
                x: 0,
                y: 0,
                scale: 0,
                rotate: 0,
                opacity: 1,
              }}
              animate={{
                x: coin.x,
                y: coin.y,
                scale: coin.scale,
                rotate: coin.rotation,
                opacity: [1, 1, 0],
              }}
              transition={{
                duration: 1.2,
                delay: coin.delay,
                ease: 'easeOut',
              }}
              className="absolute left-1/2 top-1/2"
              style={{
                width: 40,
                height: 40,
                marginLeft: -20,
                marginTop: -20,
              }}
            >
              {/* Coin SVG */}
              <svg
                viewBox="0 0 40 40"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="w-full h-full"
              >
                <circle
                  cx="20"
                  cy="20"
                  r="18"
                  fill="url(#coinGradient)"
                  stroke="#FFD700"
                  strokeWidth="2"
                />
                <circle
                  cx="20"
                  cy="20"
                  r="14"
                  stroke="#FFA500"
                  strokeWidth="1"
                  opacity="0.5"
                />
                <text
                  x="20"
                  y="26"
                  textAnchor="middle"
                  fill="#FFF"
                  fontSize="16"
                  fontWeight="bold"
                >
                  π
                </text>
                <defs>
                  <radialGradient id="coinGradient" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor="#FFD700" />
                    <stop offset="100%" stopColor="#FFA500" />
                  </radialGradient>
                </defs>
              </svg>
            </motion.div>
          ))}
        </div>
      )}
    </AnimatePresence>
  );
}
