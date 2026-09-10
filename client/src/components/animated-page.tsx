import { motion } from 'framer-motion';
import { pageTransition } from '@/lib/animations';
import { ReactNode } from 'react';

interface AnimatedPageProps {
  children: ReactNode;
  className?: string;
}

/**
 * AnimatedPage - Wraps page components with smooth transitions
 * Usage: Wrap your page content with this component for consistent page transitions
 */
export default function AnimatedPage({ children, className = '' }: AnimatedPageProps) {
  return (
    <motion.div
      variants={pageTransition}
      initial="initial"
      animate="animate"
      exit="exit"
      className={className}
    >
      {children}
    </motion.div>
  );
}
