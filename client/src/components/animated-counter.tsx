import { motion, useAnimation } from 'framer-motion';
import { useEffect, useState } from 'react';

interface AnimatedCounterProps {
  targetValue: number;
  duration?: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  className?: string;
}

/**
 * AnimatedCounter - Smooth number counting animation
 * Usage: Display balance, stats, or any number with engaging count-up effect
 */
export default function AnimatedCounter({
  targetValue,
  duration = 1.5,
  prefix = '',
  suffix = '',
  decimals = 0,
  className = '',
}: AnimatedCounterProps) {
  const [currentValue, setCurrentValue] = useState(0);
  const controls = useAnimation();

  useEffect(() => {
    // Reset to 0 when target changes
    setCurrentValue(0);
    
    // Animate counting
    const startTime = Date.now();
    const startValue = 0;
    const diff = targetValue - startValue;

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / (duration * 1000), 1);
      
      // Ease out cubic for smooth deceleration
      const eased = 1 - Math.pow(1 - progress, 3);
      const value = startValue + diff * eased;
      
      setCurrentValue(value);

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
  }, [targetValue, duration]);

  const displayValue = decimals > 0 
    ? currentValue.toFixed(decimals)
    : Math.floor(currentValue).toLocaleString();

  return (
    <span className={className}>
      {prefix}{displayValue}{suffix}
    </span>
  );
}
