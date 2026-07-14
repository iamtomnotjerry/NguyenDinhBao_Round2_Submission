'use client';

import { TransitionLink } from '@/components/TransitionLink';
import { motion, useReducedMotion } from 'motion/react';
import { useLocale } from '@/lib/i18n/context';
import { btnInteractive, cn } from '@/lib/utils';
import { easeOutExpo } from '@/lib/motion';

export default function AppFooter({ className }: { className?: string }) {
  const { t } = useLocale();
  const reduce = useReducedMotion();

  return (
    <motion.footer
      className={cn(
        'border-t border-line/80 py-6 md:py-8 bg-elevated/80 text-center text-xs text-muted-fg mt-auto shrink-0',
        className,
      )}
      initial={reduce ? false : { opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, ease: easeOutExpo }}
    >
      <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
        <p>{t.common.footer}</p>
        <div className="flex items-center gap-4 text-muted-fg">
          <TransitionLink href="/print" className={cn('hover:text-emerald-400', btnInteractive)}>
            {t.nav.print}
          </TransitionLink>
          <TransitionLink href="/store" className={cn('hover:text-emerald-400', btnInteractive)}>
            {t.nav.store}
          </TransitionLink>
          <TransitionLink href="/chat" className={cn('hover:text-emerald-400', btnInteractive)}>
            {t.nav.chat}
          </TransitionLink>
        </div>
      </div>
    </motion.footer>
  );
}
