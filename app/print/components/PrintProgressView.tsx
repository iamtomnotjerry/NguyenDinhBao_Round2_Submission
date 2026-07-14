'use client';

import { SafeDatabase } from '@/types/database.types';
import { Printer, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { btnInteractive, cn } from '@/lib/utils';
import { useLocale } from '@/lib/i18n/context';

type PrintJob = SafeDatabase['public']['Tables']['print_jobs']['Row'];

interface PrintProgressViewProps {
  activeJob: PrintJob;
  printProgress: number;
  onPrintNew: () => void;
}

export default function PrintProgressView({
  activeJob,
  printProgress,
  onPrintNew,
}: PrintProgressViewProps) {
  const { t } = useLocale();

  const statusTitle =
    activeJob.status === 'pending'
      ? t.print.statusPending
      : activeJob.status === 'rendering'
        ? t.print.statusRendering
        : activeJob.status === 'printing'
          ? t.print.statusPrinting
          : activeJob.status === 'completed'
            ? t.print.statusCompleted
            : t.print.statusFailed;

  return (
    <div className="lg:col-span-12 glass-bezel-outer">
      <div className="glass-bezel-inner p-8 flex flex-col items-center justify-center min-h-[500px] text-center space-y-8">
        <div className="relative">
          <div
            className={`w-24 h-24 rounded-full border-4 transition-all duration-700 ${
              activeJob.status === 'completed'
                ? 'border-emerald-500/20 border-t-emerald-500'
                : activeJob.status === 'failed'
                  ? 'border-red-500/20 border-t-red-500'
                  : 'border-emerald-500/10 border-t-emerald-500 animate-spin'
            }`}
          />
          <Printer
            className={`w-8 h-8 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 transition-colors duration-700 ${
              activeJob.status === 'completed'
                ? 'text-emerald-400'
                : activeJob.status === 'failed'
                  ? 'text-red-400'
                  : 'text-emerald-400'
            }`}
          />
        </div>

        <div className="space-y-3">
          <h2 className="text-2xl font-bold bg-gradient-to-r from-white to-zinc-300 bg-clip-text text-transparent">
            {statusTitle}
          </h2>
          <p className="text-zinc-500 text-sm">
            {t.print.jobId} <span className="font-mono text-zinc-300">{activeJob.id}</span>
          </p>
        </div>

        <div className="w-full max-w-lg space-y-2">
          <div className="w-full bg-zinc-900 h-3 rounded-full overflow-hidden border border-zinc-800">
            <div
              className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 transition-all duration-500 rounded-full"
              style={{ width: `${printProgress}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-zinc-500 font-semibold uppercase tracking-wider">
            <span>{printProgress}%</span>
            <span>
              {t.print.statusLabel} {activeJob.status}
            </span>
          </div>
        </div>

        <div className="w-full max-w-md p-4 bg-zinc-950/50 border border-zinc-900 rounded-2xl text-left space-y-3 text-sm text-zinc-400">
          <div className="flex items-center justify-between border-b border-zinc-900 pb-2">
            <span className="font-semibold text-white">{t.print.eventLog}</span>
            <span className="text-xs px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-bold border border-emerald-500/10">
              Realtime
            </span>
          </div>
          <div className="space-y-2 font-mono text-xs">
            <div className="flex items-start gap-2">
              <span className="text-emerald-400">[✓]</span>
              <span>
                {t.print.logCreated} ($ {activeJob.cost})
              </span>
            </div>
            {printProgress >= 40 && (
              <div className="flex items-start gap-2">
                <span className="text-emerald-400">[✓]</span>
                <span>
                  {t.print.logRendered} (1 / {activeJob.total_pages} {t.print.pagesUnit})
                </span>
              </div>
            )}
            {printProgress >= 70 && (
              <div className="flex items-start gap-2">
                <span className="text-emerald-400">[⚙]</span>
                <span>
                  {t.print.logPrinting} (
                  {activeJob.config_color === 'color' ? t.print.labelColor : t.print.labelBw})
                </span>
              </div>
            )}
            {printProgress === 100 && (
              <div className="flex items-start gap-2 text-emerald-400 font-semibold">
                <span className="text-emerald-400">[✓]</span>
                <span>
                  {t.print.logDone} {activeJob.printer_location}.
                </span>
              </div>
            )}
          </div>
        </div>

        {activeJob.status === 'completed' && (
          <div className="flex flex-wrap gap-4 justify-center">
            <button
              onClick={onPrintNew}
              className={cn(
                'px-6 py-3 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 font-bold rounded-xl flex items-center gap-2 text-sm text-white',
                btnInteractive,
              )}
            >
              {t.print.printNew} <ArrowRight className="w-4 h-4 text-emerald-400" />
            </button>
            <Link
              href="/dashboard?tab=print"
              className={cn(
                'px-6 py-3 bg-gradient-to-tr from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 font-bold rounded-xl flex items-center gap-2 text-sm text-black shadow-lg shadow-emerald-500/10',
                btnInteractive,
              )}
            >
              {t.print.viewHistory}
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
