/** Shared Motion presets — intentional presence, not noise. */

export const easeOutExpo = [0.16, 1, 0.3, 1] as const;
export const springSoft = { type: 'spring' as const, stiffness: 380, damping: 32 };
export const springSnappy = { type: 'spring' as const, stiffness: 520, damping: 36 };

export const fadeUp = {
  hidden: { opacity: 0, y: 22 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.55, ease: easeOutExpo },
  },
};

export const fadeIn = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { duration: 0.45, ease: easeOutExpo } },
};

export const scaleIn = {
  hidden: { opacity: 0, scale: 0.94, y: 12 },
  show: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { duration: 0.6, ease: easeOutExpo },
  },
};

export const staggerContainer = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.085, delayChildren: 0.06 },
  },
};

export const staggerFast = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.055, delayChildren: 0.02 },
  },
};
