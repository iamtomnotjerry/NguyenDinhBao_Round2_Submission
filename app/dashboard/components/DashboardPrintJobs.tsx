'use client';

import { SafeDatabase } from '@/types/database.types';
import { FileText } from 'lucide-react';
import { useLocale } from '@/lib/i18n/context';

type PrintJob = SafeDatabase['public']['Tables']['print_jobs']['Row'];

interface DashboardPrintJobsProps {
  printJobs: PrintJob[];
}

export default function DashboardPrintJobs({ printJobs }: DashboardPrintJobsProps) {
  const { t } = useLocale();

  return (
    <div className="glass-bezel-outer animate-fade-in">
      <div className="glass-bezel-inner p-6 space-y-4">
        <h3 className="text-sm font-bold text-white uppercase tracking-wider">
          {t.dashboard.printJobsTitle}
        </h3>
        {printJobs.length === 0 ? (
          <p className="text-zinc-500 text-xs text-center py-6">{t.dashboard.noPrintJobs}</p>
        ) : (
          <div className="space-y-4">
            {printJobs.map((job) => (
              <div
                key={job.id}
                className="p-4 bg-zinc-950/40 border border-zinc-900 rounded-2xl space-y-3"
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 border-b border-zinc-900 pb-2 text-xs">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-emerald-400" />
                    <span className="font-bold text-white truncate max-w-xs">{job.file_name}</span>
                  </div>
                  <span
                    className={`font-semibold py-0.5 px-2 rounded-full scale-90 border font-mono ${
                      job.status === 'completed'
                        ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                        : job.status === 'failed'
                          ? 'bg-red-500/10 border-red-500/20 text-red-400'
                          : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400 animate-pulse'
                    }`}
                  >
                    {job.status}
                  </span>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs font-semibold text-zinc-500">
                  <div>
                    <span>{t.dashboard.paperBinding}:</span>
                    <p className="text-zinc-300 mt-0.5 capitalize">
                      {job.config_paper_size} • {job.config_binding}
                    </p>
                  </div>
                  <div>
                    <span>{t.dashboard.pagesCopies}:</span>
                    <p className="text-zinc-300 mt-0.5">
                      {job.total_pages} {t.dashboard.pagesUnit} • {job.config_copies || 1}{' '}
                      {t.dashboard.copiesUnit}
                    </p>
                  </div>
                  <div>
                    <span>{t.dashboard.printCost}:</span>
                    <p className="text-zinc-300 mt-0.5 text-white font-bold">
                      ${Number(job.cost).toFixed(2)}
                    </p>
                  </div>
                  <div>
                    <span>{t.dashboard.printTime}:</span>
                    <p className="text-zinc-300 mt-0.5">
                      {new Date(job.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
