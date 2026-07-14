'use client';

import { SafeDatabase } from '@/types/database.types';
import { FileText } from 'lucide-react';
import { motion, useReducedMotion } from 'motion/react';
import { useLocale } from '@/lib/i18n/context';
import EmptyState from '@/components/EmptyState';
import { Badge } from '@/components/ui/Badge';
import { easeOutExpo, fadeUp } from '@/lib/motion';

type PrintJob = SafeDatabase['public']['Tables']['print_jobs']['Row'];

interface DashboardPrintJobsProps {
  printJobs: PrintJob[];
}

export default function DashboardPrintJobs({ printJobs }: DashboardPrintJobsProps) {
  const { t } = useLocale();
  const reduce = useReducedMotion();

  const statusLabel = (status: string) => {
    const map = t.dashboard.status as Record<string, string>;
    return map[status] || status.replace(/_/g, ' ');
  };

  return (
    <motion.div
      className="glass-bezel-outer"
      initial={reduce ? false : fadeUp.hidden}
      animate={fadeUp.show}
      transition={{ duration: 0.5, ease: easeOutExpo }}
    >
      <div className="glass-bezel-inner p-6 space-y-4">
        <h3 className="text-sm font-bold text-fg uppercase tracking-wider">
          {t.dashboard.printJobsTitle}
        </h3>
        {printJobs.length === 0 ? (
          <EmptyState
            icon={FileText}
            title={t.dashboard.noPrintJobs}
            actionHref="/print"
            actionLabel={t.dashboard.noPrintJobsCta}
          />
        ) : (
          <div className="space-y-4">
            {printJobs.map((job, index) => (
              <motion.div
                key={job.id}
                initial={reduce ? false : { opacity: 0, y: 14 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-20px' }}
                transition={{ duration: 0.4, ease: easeOutExpo, delay: index * 0.04 }}
                className="p-4 bg-elevated/40 border border-line rounded-2xl space-y-3"
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 border-b border-line pb-2 text-xs">
                  <div className="flex items-center gap-2 min-w-0">
                    <FileText className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span className="font-bold text-fg truncate max-w-xs">{job.file_name}</span>
                  </div>
                  <Badge
                    tone={
                      job.status === 'completed'
                        ? 'success'
                        : job.status === 'failed'
                          ? 'danger'
                          : 'brand'
                    }
                    className={
                      job.status !== 'completed' && job.status !== 'failed'
                        ? 'animate-pulse'
                        : undefined
                    }
                  >
                    {statusLabel(job.status)}
                  </Badge>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs font-semibold text-muted-fg">
                  <div>
                    <span>{t.dashboard.paperBinding}:</span>
                    <p className="text-secondary-strong mt-0.5 capitalize">
                      {job.config_paper_size} • {job.config_binding}
                    </p>
                  </div>
                  <div>
                    <span>{t.dashboard.pagesCopies}:</span>
                    <p className="text-secondary-strong mt-0.5">
                      {job.selected_page_count ?? job.total_pages} / {job.total_pages}{' '}
                      {t.dashboard.pagesUnit} • {job.config_copies || 1} {t.dashboard.copiesUnit}
                      {job.duplex && job.duplex !== 'simplex' ? ` • ${job.duplex}` : ''}
                    </p>
                  </div>
                  <div>
                    <span>{t.dashboard.printCost}:</span>
                    <p className="text-secondary-strong mt-0.5 text-fg font-bold">
                      ${Number(job.cost).toFixed(2)}
                    </p>
                  </div>
                  <div>
                    <span>{t.dashboard.printTime}:</span>
                    <p className="text-secondary-strong mt-0.5">
                      {new Date(job.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}
