'use client';

import { motion, useReducedMotion, type HTMLMotionProps } from 'motion/react';
import { cn } from '@/lib/utils';
import { easeOutExpo } from '@/lib/motion';

type PageRevealProps = HTMLMotionProps<'div'> & {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  y?: number;
};

/** Mount entrance for page sections — respects prefers-reduced-motion. */
export default function PageReveal({
  children,
  className,
  delay = 0,
  y = 18,
  ...rest
}: PageRevealProps) {
  const reduce = useReducedMotion();

  return (
    <motion.div
      className={cn(className)}
      initial={reduce ? false : { opacity: 0, y }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay, ease: easeOutExpo }}
      {...rest}
    >
      {children}
    </motion.div>
  );
}
