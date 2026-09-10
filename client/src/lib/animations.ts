import { TargetAndTransition, Variants } from 'framer-motion';

// ============================================================
// PAGE TRANSITIONS - Smooth page navigation
// ============================================================

export const pageTransition: Variants = {
  initial: {
    opacity: 0,
    y: 20,
  },
  animate: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.4,
      ease: 'easeOut',
    },
  },
  exit: {
    opacity: 0,
    y: -20,
    transition: {
      duration: 0.3,
      ease: 'easeIn',
    },
  },
};

// ============================================================
// STAGGER CHILDREN - For lists and grids
// ============================================================

export const staggerContainer: Variants = {
  animate: {
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.1,
    },
  },
};

export const staggerItem: Variants = {
  initial: {
    opacity: 0,
    y: 20,
  },
  animate: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.4,
      ease: 'easeOut',
    },
  },
};

// ============================================================
// FADE IN UP - Classic entrance animation
// ============================================================

export const fadeInUp: Variants = {
  initial: {
    opacity: 0,
    y: 30,
  },
  animate: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
      ease: 'easeOut',
    },
  },
};

// ============================================================
// FADE IN - Simple opacity transition
// ============================================================

export const fadeIn: Variants = {
  initial: {
    opacity: 0,
  },
  animate: {
    opacity: 1,
    transition: {
      duration: 0.4,
    },
  },
};

// ============================================================
// SCALE IN - For cards and modals
// ============================================================

export const scaleIn: Variants = {
  initial: {
    opacity: 0,
    scale: 0.95,
  },
  animate: {
    opacity: 1,
    scale: 1,
    transition: {
      duration: 0.3,
      ease: 'easeOut',
    },
  },
};

// ============================================================
// SLIDE IN LEFT/RIGHT - For side panels
// ============================================================

export const slideInLeft: Variants = {
  initial: {
    opacity: 0,
    x: -50,
  },
  animate: {
    opacity: 1,
    x: 0,
    transition: {
      duration: 0.4,
      ease: 'easeOut',
    },
  },
};

export const slideInRight: Variants = {
  initial: {
    opacity: 0,
    x: 50,
  },
  animate: {
    opacity: 1,
    x: 0,
    transition: {
      duration: 0.4,
      ease: 'easeOut',
    },
  },
};

// ============================================================
// HOVER EFFECTS - Interactive elements
// ============================================================

export const hoverLift: TargetAndTransition = {
  scale: 1.02,
  y: -4,
  transition: {
    duration: 0.2,
    ease: 'easeOut',
  },
};

export const hoverScale = {
  scale: 1.05,
  transition: {
    duration: 0.2,
  },
};

// ============================================================
// BUTTON PRESS - Tactile feedback
// ============================================================

export const buttonPress: TargetAndTransition = {
  scale: 0.98,
  transition: {
    duration: 0.1,
  },
};

// ============================================================
// LOADING SPINNER - Smooth rotation
// ============================================================

export const spin = {
  animate: {
    rotate: 360,
    transition: {
      duration: 1,
      ease: 'linear',
      repeat: Infinity,
    },
  },
};

// ============================================================
// PULSE - For notifications and alerts
// ============================================================

export const pulse = {
  animate: {
    scale: [1, 1.05, 1],
    transition: {
      duration: 0.6,
      ease: 'easeInOut',
      repeat: Infinity,
    },
  },
};

// ============================================================
// MODAL - Open/Close animations
// ============================================================

export const modalBackdrop: Variants = {
  initial: {
    opacity: 0,
  },
  animate: {
    opacity: 1,
    transition: {
      duration: 0.2,
    },
  },
  exit: {
    opacity: 0,
    transition: {
      duration: 0.2,
    },
  },
};

export const modalContent: Variants = {
  initial: {
    opacity: 0,
    scale: 0.9,
    y: 20,
  },
  animate: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: {
      duration: 0.3,
      ease: 'easeOut',
    },
  },
  exit: {
    opacity: 0,
    scale: 0.9,
    y: 20,
    transition: {
      duration: 0.2,
      ease: 'easeIn',
    },
  },
};

// ============================================================
// NOTIFICATION TOAST - Slide in/out
// ============================================================

export const toastSlideIn: Variants = {
  initial: {
    x: '100%',
    opacity: 0,
  },
  animate: {
    x: 0,
    opacity: 1,
    transition: {
      type: 'spring',
      stiffness: 300,
      damping: 30,
    },
  },
  exit: {
    x: '100%',
    opacity: 0,
    transition: {
      duration: 0.2,
    },
  },
};

// ============================================================
// LIST ITEM - For transactions, packages, etc.
// ============================================================

export const listItem: Variants = {
  initial: {
    opacity: 0,
    x: -20,
  },
  animate: {
    opacity: 1,
    x: 0,
    transition: {
      duration: 0.3,
      ease: 'easeOut',
    },
  },
};

// ============================================================
// COUNTER ANIMATION - For stats and numbers
// ============================================================

export const counterAnimation = {
  initial: { scale: 0.8, opacity: 0 },
  animate: {
    scale: 1,
    opacity: 1,
    transition: {
      type: 'spring',
      stiffness: 200,
      damping: 15,
    },
  },
};

// ============================================================
// PERFORMANCE SETTINGS
// ============================================================

// Disable animations for users who prefer reduced motion
export const reducedMotionSettings = {
  initial: false,
  animate: false,
  exit: false,
};

// ============================================================
// SLIDE UP - For bottom sheets and drawers
// ============================================================

export const slideUp: Variants = {
  initial: {
    opacity: 0,
    y: 50,
  },
  animate: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.4,
      ease: 'easeOut',
    },
  },
  exit: {
    opacity: 0,
    y: 50,
    transition: {
      duration: 0.3,
      ease: 'easeIn',
    },
  },
};

// ============================================================
// ROTATE IN - For spinning animations
// ============================================================

export const rotateIn: Variants = {
  initial: {
    opacity: 0,
    rotate: -180,
  },
  animate: {
    opacity: 1,
    rotate: 0,
    transition: {
      duration: 0.5,
      ease: 'easeOut',
    },
  },
};

// ============================================================
// BOUNCE IN - Elastic entrance
// ============================================================

export const bounceIn: Variants = {
  initial: {
    opacity: 0,
    scale: 0.3,
  },
  animate: {
    opacity: 1,
    scale: 1,
    transition: {
      type: 'spring',
      stiffness: 200,
      damping: 15,
      mass: 0.5,
    },
  },
};

// ============================================================
// FLIP - For card flips
// ============================================================

export const flip: Variants = {
  initial: {
    opacity: 0,
    rotateX: -90,
  },
  animate: {
    opacity: 1,
    rotateX: 0,
    transition: {
      duration: 0.5,
      ease: 'easeOut',
    },
  },
};

// ============================================================
// SHIMMER - For skeleton loaders
// ============================================================

export const shimmer = {
  animate: {
    backgroundPosition: ['200% 0', '-200% 0'],
    transition: {
      duration: 2,
      ease: 'linear',
      repeat: Infinity,
    },
  },
};

// ============================================================
// GRADIENT SHIFT - For animated gradients
// ============================================================

export const gradientShift = {
  animate: {
    backgroundPosition: ['0% center', '100% center', '0% center'],
    transition: {
      duration: 3,
      ease: 'linear',
      repeat: Infinity,
    },
  },
};

// ============================================================
// FLOAT - Subtle floating animation
// ============================================================

export const float = {
  animate: {
    y: [0, -10, 0],
    transition: {
      duration: 3,
      ease: 'easeInOut',
      repeat: Infinity,
    },
  },
};

// ============================================================
// WIGGLE - Subtle shaking animation
// ============================================================

export const wiggle = {
  animate: {
    rotate: [-1, 1, -1],
    transition: {
      duration: 0.5,
      ease: 'easeInOut',
      repeat: Infinity,
    },
  },
};

// ============================================================
// GLOW - Pulsing glow effect
// ============================================================

export const glow = {
  animate: {
    boxShadow: [
      '0 0 0 0 rgba(168, 85, 247, 0.4)',
      '0 0 0 10px rgba(168, 85, 247, 0)',
    ],
    transition: {
      duration: 2,
      ease: 'easeInOut',
      repeat: Infinity,
    },
  },
};
