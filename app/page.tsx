'use client';

import Link from 'next/link';
import {
  Printer,
  ShoppingBag,
  MessageSquare,
  ShieldCheck,
  Zap,
  ArrowRight,
  CheckCircle,
} from 'lucide-react';
import Header from '@/components/Header';
import { btnInteractive, cn } from '@/lib/utils';
import { useLocale } from '@/lib/i18n/context';

export default function Home() {
  const { t } = useLocale();

  return (
    <div className="flex flex-col min-h-screen bg-[#050505] text-white font-sans selection:bg-emerald-500 selection:text-black relative overflow-hidden">
      <Header />

      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-emerald-500/5 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute top-[20%] right-[10%] w-[400px] h-[400px] bg-teal-500/5 rounded-full blur-[140px] pointer-events-none" />

      <main className="flex-1 max-w-6xl mx-auto px-6 py-12 md:py-24 w-full space-y-24 relative z-10">
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          <div className="lg:col-span-7 space-y-6 text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full text-emerald-400 text-xs font-medium tracking-wide">
              <Zap className="w-3.5 h-3.5 text-emerald-400" /> {t.home.badge}
            </div>

            <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight leading-[1.05] text-white">
              {t.home.titleLead} <br />
              <span className="bg-gradient-to-r from-emerald-400 via-teal-400 to-emerald-300 bg-clip-text text-transparent">
                {t.home.titleAccent}
              </span>
            </h1>

            <p className="text-zinc-400 text-base sm:text-lg leading-relaxed max-w-[55ch]">
              {t.home.subtitle}
            </p>

            <div className="flex flex-col sm:flex-row items-center gap-4 pt-4">
              <Link
                href="/print"
                className={cn(
                  'w-full sm:w-auto px-8 py-4 bg-gradient-to-tr from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 rounded-xl font-bold shadow-lg shadow-emerald-500/10 hover:scale-[1.02] flex items-center justify-center gap-2 group text-sm text-white',
                  btnInteractive,
                )}
              >
                <Printer className="w-4.5 h-4.5" /> {t.home.ctaPrint}{' '}
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link
                href="/store"
                className={cn(
                  'w-full sm:w-auto px-8 py-4 bg-zinc-900/80 hover:bg-zinc-800 rounded-xl font-bold border border-zinc-800 hover:border-zinc-700 flex items-center justify-center gap-2 text-sm',
                  btnInteractive,
                )}
              >
                <ShoppingBag className="w-4.5 h-4.5 text-emerald-400" /> {t.home.ctaStore}
              </Link>
            </div>
          </div>

          <div className="lg:col-span-5 relative">
            <div className="glass-bezel-outer">
              <div className="glass-bezel-inner p-4 md:p-5 relative overflow-hidden group">
                <div className="relative bg-white text-zinc-950 rounded-xl p-8 aspect-[3/4] shadow-inner flex flex-col justify-between overflow-hidden">
                  <div className="absolute left-0 top-0 bottom-0 w-3 flex flex-col justify-around py-3 bg-gradient-to-r from-zinc-300 to-transparent border-r border-dashed border-zinc-300/40">
                    {Array.from({ length: 10 }).map((_, idx) => (
                      <div
                        key={idx}
                        className="w-3 h-1 bg-gradient-to-r from-zinc-400 to-zinc-600 rounded-full -ml-1.5 shadow-sm"
                      />
                    ))}
                  </div>

                  <div className="pl-4 space-y-4">
                    <div className="flex justify-between items-start">
                      <span className="text-[10px] uppercase tracking-wider font-extrabold text-emerald-600 bg-emerald-50/70 px-2 py-0.5 rounded">
                        {t.home.mockDocSpec}
                      </span>
                      <span className="text-[10px] text-zinc-400 font-mono">
                        {t.home.mockPageOf}
                      </span>
                    </div>
                    <div className="space-y-2">
                      <h4 className="text-lg font-black leading-tight text-zinc-900">
                        {t.home.mockDocTitle}
                      </h4>
                      <p className="text-xs text-zinc-500 leading-relaxed">{t.home.subtitle}</p>
                    </div>
                  </div>

                  <div className="pl-4 flex items-center justify-between border-t border-zinc-100 pt-4 mt-8">
                    <div className="flex gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
                      <span className="w-2.5 h-2.5 rounded-full bg-green-500" />
                      <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                    </div>
                    <span className="text-xs font-bold text-zinc-400">{t.home.mockEngine}</span>
                  </div>
                </div>

                <div className="absolute bottom-4 right-4 bg-zinc-950/95 border border-zinc-800 rounded-2xl p-3 shadow-xl flex items-center gap-2.5 animate-pulse-slow">
                  <div className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span className="text-xs font-bold text-zinc-200">{t.home.printerOnline}</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="space-y-8">
          <div className="space-y-2 text-center lg:text-left">
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              {t.home.featuresTitle}
            </h2>
            <p className="text-zinc-500 text-sm max-w-md">{t.home.featuresSubtitle}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
            <div className="md:col-span-8 glass-bezel-outer interactive group">
              <div className="glass-bezel-inner flex flex-col justify-between min-h-[320px] h-full">
                <div className="space-y-3">
                  <div className="p-3 bg-emerald-500/10 rounded-xl w-fit text-emerald-400 border border-emerald-500/10">
                    <Printer className="w-5 h-5" />
                  </div>
                  <h3 className="text-xl font-bold">{t.home.featurePrintTitle}</h3>
                  <p className="text-zinc-400 text-sm leading-relaxed max-w-lg">
                    {t.home.featurePrintDesc}
                  </p>
                </div>

                <div className="mt-6 p-4 bg-zinc-950/60 border border-zinc-900 rounded-2xl space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-zinc-400 font-bold truncate max-w-[200px]">
                      technical-spec.pdf
                    </span>
                    <span className="text-emerald-400 font-mono text-[10px] uppercase font-bold">
                      Printing...
                    </span>
                  </div>
                  <div className="w-full bg-zinc-900 h-2 rounded-full overflow-hidden">
                    <div className="bg-emerald-500 h-full w-[70%] rounded-full animate-pulse-slow" />
                  </div>
                </div>
              </div>
            </div>

            <div className="md:col-span-4 glass-bezel-outer interactive group">
              <div className="glass-bezel-inner flex flex-col justify-between min-h-[320px] h-full">
                <div className="space-y-3">
                  <div className="p-3 bg-teal-500/10 rounded-xl w-fit text-teal-400 border border-teal-500/10">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <h3 className="text-xl font-bold">{t.home.featurePayTitle}</h3>
                  <p className="text-zinc-400 text-sm leading-relaxed">{t.home.featurePayDesc}</p>
                </div>

                <div className="mt-6 flex items-center justify-between p-3 bg-zinc-950/60 border border-zinc-900 rounded-xl">
                  <div className="flex items-center gap-2">
                    <span className="w-7 h-4.5 bg-zinc-800 rounded border border-zinc-700 flex items-center justify-center text-[8px] font-bold text-zinc-500">
                      Visa
                    </span>
                    <span className="text-xs font-mono text-zinc-400">•••• 4001</span>
                  </div>
                  <span className="text-[10px] text-emerald-400 font-bold flex items-center gap-1">
                    <CheckCircle className="w-3 h-3" /> Tokenized
                  </span>
                </div>
              </div>
            </div>

            <div className="md:col-span-12 glass-bezel-outer interactive group">
              <div className="glass-bezel-inner flex flex-col md:flex-row justify-between items-center gap-8 min-h-[220px] h-full">
                <div className="space-y-3 max-w-xl">
                  <div className="p-3 bg-emerald-500/10 rounded-xl w-fit text-emerald-400 border border-emerald-500/10">
                    <MessageSquare className="w-5 h-5" />
                  </div>
                  <h3 className="text-xl font-bold">{t.home.featureChatTitle}</h3>
                  <p className="text-zinc-400 text-sm leading-relaxed">{t.home.featureChatDesc}</p>
                </div>
                <Link
                  href="/chat"
                  className={cn(
                    'w-full md:w-auto px-6 py-3 bg-zinc-900 border border-zinc-800 hover:border-zinc-700 hover:bg-zinc-800 rounded-xl font-bold text-xs flex items-center justify-center gap-2 whitespace-nowrap',
                    btnInteractive,
                  )}
                >
                  {t.home.featureChatCta} <ArrowRight className="w-3.5 h-3.5 text-emerald-400" />
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-zinc-900 py-8 bg-zinc-950 relative z-10 mt-16">
        <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-zinc-500">
          <span>{t.common.footer}</span>
          <div className="flex gap-6 font-semibold">
            <a href="#" className={cn('hover:text-zinc-300', btnInteractive)}>
              {t.home.footerRules}
            </a>
            <a href="#" className={cn('hover:text-zinc-300', btnInteractive)}>
              {t.home.footerPrivacy}
            </a>
            <a href="#" className={cn('hover:text-zinc-300', btnInteractive)}>
              {t.home.footerContact}
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
