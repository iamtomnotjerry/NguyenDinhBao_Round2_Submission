'use client';

import { TransitionLink } from '@/components/TransitionLink';
import { PageShell } from '@/components/ui/Surface';
import {
  Printer,
  ShoppingBag,
  MessageSquare,
  ShieldCheck,
  Zap,
  ArrowRight,
  CheckCircle,
} from 'lucide-react';
import { motion, useReducedMotion } from 'motion/react';
import Header from '@/components/Header';
import { btnInteractive, cn } from '@/lib/utils';
import { useLocale } from '@/lib/i18n/context';
import { easeOutExpo, fadeUp, scaleIn, staggerContainer } from '@/lib/motion';

export default function HomeClient() {
  const { t } = useLocale();
  const reduce = useReducedMotion();

  return (
    <PageShell className="relative overflow-hidden">
      <Header />

      <motion.div
        aria-hidden
        className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-emerald-500/5 rounded-full blur-[140px] pointer-events-none"
        animate={reduce ? undefined : { opacity: [0.45, 0.85, 0.45], scale: [1, 1.06, 1] }}
        transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        aria-hidden
        className="absolute top-[20%] right-[10%] w-[400px] h-[400px] bg-teal-500/5 rounded-full blur-[140px] pointer-events-none"
        animate={reduce ? undefined : { opacity: [0.35, 0.7, 0.35], x: [0, 18, 0] }}
        transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
      />

      <main className="flex-1 max-w-6xl mx-auto px-6 py-12 md:py-24 w-full space-y-24 relative z-10">
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          <motion.div
            className="lg:col-span-7 space-y-6 text-left"
            variants={staggerContainer}
            initial={reduce ? false : 'hidden'}
            animate="show"
          >
            <motion.div
              variants={fadeUp}
              className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full text-emerald-400 text-xs font-medium tracking-wide"
            >
              <Zap className="w-3.5 h-3.5 text-emerald-400" /> {t.home.badge}
            </motion.div>

            <motion.h1
              variants={fadeUp}
              className="text-4xl sm:text-6xl font-extrabold tracking-tight leading-[1.05] text-fg"
            >
              {t.home.titleLead} <br />
              <span className="bg-gradient-to-r from-emerald-400 via-teal-400 to-emerald-300 bg-clip-text text-transparent">
                {t.home.titleAccent}
              </span>
            </motion.h1>

            <motion.p
              variants={fadeUp}
              className="text-secondary text-base sm:text-lg leading-relaxed max-w-[55ch]"
            >
              {t.home.subtitle}
            </motion.p>

            <motion.div
              variants={fadeUp}
              className="flex flex-col sm:flex-row items-center gap-4 pt-4"
            >
              <motion.div
                whileHover={reduce ? undefined : { scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <TransitionLink
                  href="/print"
                  className={cn(
                    'w-full sm:w-auto px-8 py-4 bg-gradient-to-tr from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 rounded-xl font-bold shadow-lg shadow-emerald-500/10 flex items-center justify-center gap-2 group text-sm text-on-brand',
                    btnInteractive,
                  )}
                >
                  <Printer className="w-4.5 h-4.5" /> {t.home.ctaPrint}{' '}
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </TransitionLink>
              </motion.div>
              <motion.div
                whileHover={reduce ? undefined : { scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <TransitionLink
                  href="/store"
                  className={cn(
                    'w-full sm:w-auto px-8 py-4 bg-muted/80 hover:bg-subtle rounded-xl font-bold border border-edge hover:border-edge-strong flex items-center justify-center gap-2 text-sm',
                    btnInteractive,
                  )}
                >
                  <ShoppingBag className="w-4.5 h-4.5 text-emerald-400" /> {t.home.ctaStore}
                </TransitionLink>
              </motion.div>
            </motion.div>
          </motion.div>

          <motion.div
            className="lg:col-span-5 relative"
            variants={scaleIn}
            initial={reduce ? false : 'hidden'}
            animate="show"
          >
            <motion.div
              className="glass-bezel-outer"
              animate={reduce ? undefined : { y: [0, -8, 0] }}
              transition={{ duration: 5.5, repeat: Infinity, ease: 'easeInOut' }}
            >
              <div className="glass-bezel-inner p-4 md:p-5 relative overflow-hidden group">
                <div className="relative bg-paper text-paper-ink rounded-xl p-8 aspect-[3/4] shadow-inner flex flex-col justify-between overflow-hidden">
                  <div className="absolute left-0 top-0 bottom-0 w-3 flex flex-col justify-around py-3 bg-gradient-to-r from-paper-spine to-transparent border-r border-dashed border-paper-spine/40">
                    {Array.from({ length: 10 }).map((_, idx) => (
                      <div
                        key={idx}
                        className="w-3 h-1 bg-gradient-to-r from-paper-spine to-paper-muted rounded-full -ml-1.5 shadow-sm"
                      />
                    ))}
                  </div>

                  <div className="pl-4 space-y-4">
                    <div className="flex justify-between items-start">
                      <span className="text-[10px] uppercase tracking-wider font-extrabold text-emerald-600 bg-emerald-50/70 px-2 py-0.5 rounded">
                        {t.home.mockDocSpec}
                      </span>
                      <span className="text-[10px] text-secondary font-mono">
                        {t.home.mockPageOf}
                      </span>
                    </div>
                    <div className="space-y-2">
                      <h4 className="text-lg font-black leading-tight text-paper-ink">
                        {t.home.mockDocTitle}
                      </h4>
                      <p className="text-xs text-muted-fg leading-relaxed">{t.home.subtitle}</p>
                    </div>
                  </div>

                  <div className="pl-4 flex items-center justify-between border-t border-paper-rule pt-4 mt-8">
                    <div className="flex gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
                      <span className="w-2.5 h-2.5 rounded-full bg-green-500" />
                      <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                    </div>
                    <span className="text-xs font-bold text-secondary">{t.home.mockEngine}</span>
                  </div>
                </div>

                <motion.div
                  className="absolute bottom-4 right-4 bg-elevated/95 border border-edge rounded-2xl p-3 shadow-xl flex items-center gap-2.5"
                  initial={reduce ? false : { opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.55, duration: 0.45, ease: easeOutExpo }}
                >
                  <motion.div
                    className="w-2 h-2 rounded-full bg-emerald-500"
                    animate={reduce ? undefined : { scale: [1, 1.35, 1], opacity: [1, 0.6, 1] }}
                    transition={{ duration: 1.8, repeat: Infinity }}
                  />
                  <span className="text-xs font-bold text-secondary-strong">
                    {t.home.printerOnline}
                  </span>
                </motion.div>
              </div>
            </motion.div>
          </motion.div>
        </section>

        <section className="space-y-8">
          <motion.div
            className="space-y-2 text-center lg:text-left"
            initial={reduce ? false : { opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.4 }}
            transition={{ duration: 0.5, ease: easeOutExpo }}
          >
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              {t.home.featuresTitle}
            </h2>
            <p className="text-muted-fg text-sm max-w-md">{t.home.featuresSubtitle}</p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
            <motion.div
              className="md:col-span-8 glass-bezel-outer interactive group"
              initial={reduce ? false : { opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.25 }}
              transition={{ duration: 0.55, ease: easeOutExpo }}
              whileHover={reduce ? undefined : { y: -4 }}
            >
              <div className="glass-bezel-inner flex flex-col justify-between min-h-[320px] h-full">
                <div className="space-y-3">
                  <div className="p-3 bg-emerald-500/10 rounded-xl w-fit text-emerald-400 border border-emerald-500/10">
                    <Printer className="w-5 h-5" />
                  </div>
                  <h3 className="text-xl font-bold">{t.home.featurePrintTitle}</h3>
                  <p className="text-secondary text-sm leading-relaxed max-w-lg">
                    {t.home.featurePrintDesc}
                  </p>
                </div>

                <div className="mt-6 p-4 bg-elevated/60 border border-line rounded-2xl space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-secondary font-bold truncate max-w-[200px]">
                      technical-spec.pdf
                    </span>
                    <span className="text-emerald-400 font-mono text-[10px] uppercase font-bold">
                      Printing...
                    </span>
                  </div>
                  <div className="w-full bg-muted h-2 rounded-full overflow-hidden">
                    <motion.div
                      className="bg-emerald-500 h-full rounded-full"
                      initial={{ width: '8%' }}
                      whileInView={{ width: '72%' }}
                      viewport={{ once: true }}
                      transition={{ duration: 1.4, ease: easeOutExpo, delay: 0.2 }}
                    />
                  </div>
                </div>
              </div>
            </motion.div>

            <motion.div
              className="md:col-span-4 glass-bezel-outer interactive group"
              initial={reduce ? false : { opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.25 }}
              transition={{ duration: 0.55, ease: easeOutExpo, delay: 0.08 }}
              whileHover={reduce ? undefined : { y: -4 }}
            >
              <div className="glass-bezel-inner flex flex-col justify-between min-h-[320px] h-full">
                <div className="space-y-3">
                  <div className="p-3 bg-teal-500/10 rounded-xl w-fit text-teal-400 border border-teal-500/10">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <h3 className="text-xl font-bold">{t.home.featurePayTitle}</h3>
                  <p className="text-secondary text-sm leading-relaxed">{t.home.featurePayDesc}</p>
                </div>

                <div className="mt-6 flex items-center justify-between p-3 bg-elevated/60 border border-line rounded-xl">
                  <div className="flex items-center gap-2">
                    <span className="w-7 h-4.5 bg-subtle rounded border border-edge-strong flex items-center justify-center text-[8px] font-bold text-muted-fg">
                      Visa
                    </span>
                    <span className="text-xs font-mono text-secondary">•••• 4001</span>
                  </div>
                  <span className="text-[10px] text-emerald-400 font-bold flex items-center gap-1">
                    <CheckCircle className="w-3 h-3" /> Tokenized
                  </span>
                </div>
              </div>
            </motion.div>

            <motion.div
              className="md:col-span-12 glass-bezel-outer interactive group"
              initial={reduce ? false : { opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.55, ease: easeOutExpo, delay: 0.1 }}
              whileHover={reduce ? undefined : { y: -3 }}
            >
              <div className="glass-bezel-inner flex flex-col md:flex-row justify-between items-center gap-8 min-h-[220px] h-full">
                <div className="space-y-3 max-w-xl">
                  <div className="p-3 bg-emerald-500/10 rounded-xl w-fit text-emerald-400 border border-emerald-500/10">
                    <MessageSquare className="w-5 h-5" />
                  </div>
                  <h3 className="text-xl font-bold">{t.home.featureChatTitle}</h3>
                  <p className="text-secondary text-sm leading-relaxed">{t.home.featureChatDesc}</p>
                </div>
                <motion.div
                  whileHover={reduce ? undefined : { scale: 1.03 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <TransitionLink
                    href="/chat"
                    className={cn(
                      'w-full md:w-auto px-6 py-3 bg-muted border border-edge hover:border-edge-strong hover:bg-subtle rounded-xl font-bold text-xs flex items-center justify-center gap-2 whitespace-nowrap',
                      btnInteractive,
                    )}
                  >
                    {t.home.featureChatCta} <ArrowRight className="w-3.5 h-3.5 text-emerald-400" />
                  </TransitionLink>
                </motion.div>
              </div>
            </motion.div>
          </div>
        </section>
      </main>

      <footer className="border-t border-line py-8 bg-elevated relative z-10 mt-16">
        <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-muted-fg">
          <span>{t.common.footer}</span>
          <div className="flex gap-6 font-semibold">
            <a href="#" className={cn('hover:text-secondary-strong', btnInteractive)}>
              {t.home.footerRules}
            </a>
            <a href="#" className={cn('hover:text-secondary-strong', btnInteractive)}>
              {t.home.footerPrivacy}
            </a>
            <a href="#" className={cn('hover:text-secondary-strong', btnInteractive)}>
              {t.home.footerContact}
            </a>
          </div>
        </div>
      </footer>
    </PageShell>
  );
}
