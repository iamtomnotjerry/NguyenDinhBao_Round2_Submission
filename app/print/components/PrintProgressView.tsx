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

const PIPELINE = [
  'paid',
  'queued',
  'rendering',
  'printing',
  'finishing',
  'quality_check',
  'packing',
  'shipping',
  'ready_for_pickup',
  'completed',
] as const;

export default function PrintProgressView({
  activeJob,
  printProgress,
  onPrintNew,
}: PrintProgressViewProps) {
  const { t } = useLocale();

  const statusTitle = (() => {
    switch (activeJob.status) {
      case 'paid':
        return t.print.statusPaid;
      case 'queued':
      case 'pending':
        return t.print.statusQueued;
      case 'rendering':
        return t.print.statusRendering;
      case 'printing':
        return t.print.statusPrinting;
      case 'finishing':
        return t.print.statusFinishing;
      case 'quality_check':
        return t.print.statusQuality;
      case 'packing':
        return t.print.statusPacking;
      case 'shipping':
        return t.print.statusShipping;
      case 'ready_for_pickup':
        return t.print.statusReady;
      case 'completed':
        return t.print.statusCompleted;
      case 'failed':
        return t.print.statusFailed;
      default:
        return t.print.statusPending;
    }
  })();

  const done = activeJob.status === 'completed' || activeJob.status === 'ready_for_pickup';

  return (
    <div className="glass-bezel-outer w-full max-w-4xl mx-auto">
      <div className="glass-bezel-inner p-8 flex flex-col items-center justify-center min-h-[500px] text-center space-y-8">
        <div className="relative">
          <div
            className={`w-24 h-24 rounded-full border-4 transition-all duration-700 ${
              done
                ? 'border-emerald-500/20 border-t-emerald-500'
                : activeJob.status === 'failed'
                  ? 'border-red-500/20 border-t-red-500'
                  : 'border-emerald-500/10 border-t-emerald-500 animate-spin'
            }`}
          />
          <Printer
            className={`w-8 h-8 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 ${
              activeJob.status === 'failed' ? 'text-red-400' : 'text-emerald-400'
            }`}
          />
        </div>

        <div className="space-y-3">
          <h2 className="text-2xl font-bold text-white">{statusTitle}</h2>
          <p className="text-zinc-500 text-sm">
            {t.print.jobId} <span className="font-mono text-zinc-300">{activeJob.id}</span>
          </p>
          {activeJob.estimated_ready && (
            <p className="text-xs text-emerald-400/90">{activeJob.estimated_ready}</p>
          )}
        </div>

        <div className="w-full max-w-lg space-y-2">
          <div className="w-full bg-zinc-900 h-3 rounded-full overflow-hidden border border-zinc-800">
            <div
              className="h-full bg-emerald-500 transition-all duration-500 rounded-full"
              style={{ width: `${printProgress}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-zinc-500 font-semibold uppercase tracking-wider">
            <span>{printProgress}%</span>
            <span>
              {t.print.statusLabel}{' '}
              {(t.dashboard.status as Record<string, string>)[activeJob.status] ||
                activeJob.status.replace(/_/g, ' ')}
            </span>
          </div>
        </div>

        <div className="w-full max-w-md flex flex-wrap gap-1.5 justify-center">
          {PIPELINE.map((step) => {
            const idx = PIPELINE.indexOf(step);
            const cur = PIPELINE.indexOf(
              (activeJob.status === 'pending'
                ? 'queued'
                : activeJob.status) as (typeof PIPELINE)[number],
            );
            const active = cur >= idx || activeJob.status === 'completed';
            return (
              <span
                key={step}
                className={cn(
                  'text-[9px] px-1.5 py-0.5 rounded border font-bold',
                  active
                    ? 'border-emerald-500/30 text-emerald-400 bg-emerald-500/10'
                    : 'border-zinc-800 text-zinc-600',
                )}
              >
                {(t.dashboard.status as Record<string, string>)[step] || step.replace(/_/g, ' ')}
              </span>
            );
          })}
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
                {activeJob.card_last4 ? ` · ••${activeJob.card_last4}` : ''}
              </span>
            </div>
            {printProgress >= 35 && (
              <div className="flex items-start gap-2">
                <span className="text-emerald-400">[✓]</span>
                <span>
                  {t.print.logRendered} ({activeJob.selected_page_count || activeJob.total_pages}{' '}
                  {t.print.pagesUnit})
                </span>
              </div>
            )}
            {printProgress >= 55 && (
              <div className="flex items-start gap-2">
                <span className="text-emerald-400">[⚙]</span>
                <span>
                  {t.print.logPrinting} ({activeJob.config_color} / {activeJob.duplex || 'simplex'})
                </span>
              </div>
            )}
            {printProgress >= 96 && (
              <div className="flex items-start gap-2 text-emerald-400 font-semibold">
                <span>[✓]</span>
                <span>
                  {t.print.logDone} {activeJob.printer_location}
                  {activeJob.delivery_type === 'delivery' && activeJob.delivery_address
                    ? ` → ${activeJob.delivery_address}`
                    : ''}
                  .
                </span>
              </div>
            )}
          </div>
        </div>

        {(activeJob.status === 'completed' ||
          activeJob.status === 'ready_for_pickup' ||
          activeJob.status === 'failed') && (
          <div className="flex flex-wrap gap-4 justify-center">
            <button
              onClick={onPrintNew}
              className={cn(
                'px-6 py-3 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 font-bold rounded-xl flex items-center gap-2 text-sm text-white',
                btnInteractive,
              )}
            >
              {t.print.printNew} <ArrowRight className="w-4 h-4 text-emerald-400" />
            </button>
            <Link
              href="/dashboard?tab=print"
              className={cn(
                'px-6 py-3 bg-emerald-500 hover:bg-emerald-600 font-bold rounded-xl flex items-center gap-2 text-sm text-black',
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
