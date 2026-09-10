import { motion } from 'framer-motion';
import { hoverLift, buttonPress, fadeInUp } from '@/lib/animations';
import { ReactNode } from 'react';

interface AnimatedCardProps {
  children: ReactNode;
  className?: string;
  delay?: number;
  onClick?: () => void;
  clickable?: boolean;
}

/**
 * AnimatedCard - Interactive card with smooth hover effects
 * Usage: Replace regular cards with this for better interactivity
 */
export default function AnimatedCard({
  children,
  className = '',
  delay = 0,
  onClick,
  clickable = false,
}: AnimatedCardProps) {
  return (
    <motion.div
      variants={fadeInUp}
      initial="initial"
      animate="animate"
      whileHover={clickable || onClick ? hoverLift : undefined}
      whileTap={clickable || onClick ? buttonPress : undefined}
      onClick={onClick}
      transition={{ delay }}
      className={className}
      style={{
        cursor: clickable || onClick ? 'pointer' : 'default',
      }}
    >
      {children}
    </motion.div>
  );
}
