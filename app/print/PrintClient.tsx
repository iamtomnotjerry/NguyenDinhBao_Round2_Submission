'use client';

import dynamic from 'next/dynamic';
import { useState, useRef, useEffect, useMemo } from 'react';
import { toast } from 'sonner';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import { supabase } from '@/lib/supabase/client';
import PageReveal from '@/components/PageReveal';
import { easeOutExpo } from '@/lib/motion';
import { SafeDatabase } from '@/types/database.types';
import AppFooter from '@/components/AppFooter';
import LoadingSkeleton from '@/components/LoadingSkeleton';
import { Printer, ArrowRight, AlertTriangle } from 'lucide-react';
import { TransitionLink } from '@/components/TransitionLink';
import { PageShell } from '@/components/ui/Surface';
import { buildPrintQuote, btnInteractive, cn } from '@/lib/utils';
import type { PDFDocumentProxy } from 'pdfjs-dist';
import PrintConfigForm from './components/PrintConfigForm';
import { useLocale } from '@/lib/i18n/context';
import { useAuthUser } from '@/lib/auth/user-context';
import { DEFAULT_PRINT_CONFIG, type PrintConfig } from '@/lib/print/types';
import { parseColorPages } from '@/lib/print/page-selection';
import { localizeQuoteError } from '@/lib/print/quote-i18n';
import {
  formatCardNumberDisplay,
  validateCardForSandbox,
  SANDBOX_TEST_CARDS,
} from '@/lib/payment/validate-card';
import {
  firstLocalizedCardError,
  localizeTokenizeApiError,
  localizedCardFieldErrors,
} from '@/lib/payment/card-i18n';
import { localizeApiError } from '@/lib/api/localize';

const PrintPreview = dynamic(() => import('./components/PrintPreview'), {
  ssr: false,
  loading: () => <div className="glass-bezel-outer min-h-[420px] animate-pulse" />,
});

const PrintProgressView = dynamic(() => import('./components/PrintProgressView'), {
  ssr: false,
  loading: () => <div className="glass-bezel-outer min-h-[420px] animate-pulse" />,
});

type PrintJob = SafeDatabase['public']['Tables']['print_jobs']['Row'];
type PdfjsModule = typeof import('pdfjs-dist');
type SavedCard = SafeDatabase['public']['Tables']['payment_tokens']['Row'];

const OFFICE_EXT = /\.(docx?|pptx?|xlsx?)$/i;

function progressForStatus(status: string): number {
  const map: Record<string, number> = {
    awaiting_payment: 5,
    paid: 10,
    pending: 10,
    queued: 20,
    rendering: 35,
    printing: 55,
    finishing: 70,
    quality_check: 80,
    packing: 88,
    shipping: 94,
    // Pickup terminal for the customer — pipeline may stay here until staff marks completed
    ready_for_pickup: 100,
    completed: 100,
    failed: 0,
  };
  return map[status] ?? 15;
}

export default function PrintClient() {
  const { t } = useLocale();
  const reduce = useReducedMotion();
  const { user, loading: authLoading } = useAuthUser();
  const [profileLoading, setProfileLoading] = useState(true);
  const [rewardPoints, setRewardPoints] = useState(0);

  const [file, setFile] = useState<File | null>(null);
  const [fileUrl, setFileUrl] = useState('');
  const [totalPages, setTotalPages] = useState(1);
  const [manualPages, setManualPages] = useState(1);
  const [pdfjsLib, setPdfjsLib] = useState<PdfjsModule | null>(null);
  const [pdfDoc, setPdfDoc] = useState<PDFDocumentProxy | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [detectedOrientation, setDetectedOrientation] = useState('—');
  const [detectedSize, setDetectedSize] = useState('—');

  const [config, setConfig] = useState<PrintConfig>(DEFAULT_PRINT_CONFIG);
  const patchConfig = (patch: Partial<PrintConfig>) => setConfig((c) => ({ ...c, ...patch }));

  const [isUploading, setIsUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [activeJob, setActiveJob] = useState<PrintJob | null>(null);
  const [printProgress, setPrintProgress] = useState(0);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const [cardNumber, setCardNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvv, setCvv] = useState('');
  const [saveCard, setSaveCard] = useState(true);
  const [usePoints, setUsePoints] = useState(false);
  const [savedCards, setSavedCards] = useState<SavedCard[]>([]);
  const [selectedTokenId, setSelectedTokenId] = useState<string | null>(null);
  const [cardErrors, setCardErrors] = useState<{
    number?: string;
    expiry?: string;
    cvv?: string;
  }>({});

  const fileInputRef = useRef<HTMLInputElement>(null);
  const fileUrlRef = useRef('');
  const printChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const isOfficeDoc = !!file && OFFICE_EXT.test(file.name);
  const effectivePages = isOfficeDoc ? manualPages : totalPages;

  useEffect(() => {
    if (typeof window !== 'undefined') {
      import('pdfjs-dist').then((pdfjs) => {
        // Self-hosted under /public — synced via `npm run sync:pdf-worker`
        pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
        setPdfjsLib(pdfjs);
      });
    }
  }, []);

  useEffect(() => {
    let active = true;

    const loadProfile = async () => {
      if (authLoading) return;

      if (!user) {
        if (active) {
          setRewardPoints(0);
          setSavedCards([]);
          setProfileLoading(false);
        }
        return;
      }

      setProfileLoading(true);
      const [{ data: profile }, { data: tokens }] = await Promise.all([
        supabase.from('profiles').select('reward_points').eq('id', user.id).single(),
        supabase
          .from('payment_tokens')
          .select('*')
          .eq('user_id', user.id)
          .order('is_default', { ascending: false }),
      ]);

      if (!active) return;
      if (profile) setRewardPoints(profile.reward_points);
      if (tokens) setSavedCards(tokens);
      setProfileLoading(false);
    };

    void loadProfile();
    return () => {
      active = false;
    };
  }, [user, authLoading]);

  const quote = useMemo(
    () => buildPrintQuote(config, effectivePages, currentPage),
    [config, effectivePages, currentPage],
  );

  const colorPages = useMemo(() => {
    if (config.colorMode === 'color') {
      return Array.from({ length: effectivePages }, (_, i) => i + 1);
    }
    if (config.colorMode === 'mixed') {
      return parseColorPages(config.colorPagesInput, effectivePages).pages;
    }
    return [];
  }, [config.colorMode, config.colorPagesInput, effectivePages]);

  const fileMeta = file
    ? {
        name: file.name,
        sizeLabel: `${(file.size / 1024 / 1024).toFixed(2)} MB`,
        pages: effectivePages,
        orientation: detectedOrientation,
        detectedSize: detectedSize,
        colorEstimate:
          config.colorMode === 'bw'
            ? t.print.colorEstimateBw.replace('{n}', String(effectivePages))
            : config.colorMode === 'color'
              ? t.print.colorEstimateColor.replace('{n}', String(effectivePages))
              : t.print.colorEstimateMixed
                  .replace('{n}', String(colorPages.length))
                  .replace('{m}', String(Math.max(0, quote.bwPageCount))),
      }
    : null;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;
    await loadSelectedFile(selectedFile);
  };

  const loadSelectedFile = async (selectedFile: File, pdfLib = pdfjsLib) => {
    setFile(selectedFile);
    setPdfDoc(null);
    setTotalPages(1);
    setManualPages(1);
    setCurrentPage(1);
    setSubmitError(null);
    setDetectedOrientation('—');
    setDetectedSize('—');

    if (fileUrlRef.current) {
      URL.revokeObjectURL(fileUrlRef.current);
      fileUrlRef.current = '';
      setFileUrl('');
    }

    if (selectedFile.type === 'application/pdf') {
      if (!pdfLib) {
        setIsUploading(true);
        return; // wait for pdfjs — effect below retries
      }
      setIsUploading(true);
      try {
        const buffer = await selectedFile.arrayBuffer();
        const pdf = await pdfLib.getDocument({ data: new Uint8Array(buffer) }).promise;
        setPdfDoc(pdf);
        setTotalPages(pdf.numPages);
        const page = await pdf.getPage(1);
        const vp = page.getViewport({ scale: 1 });
        setDetectedOrientation(vp.width > vp.height ? 'Landscape' : 'Portrait');
        const area = vp.width * vp.height;
        if (area > 500000) setDetectedSize('≈ A3 / Tabloid');
        else if (area > 400000) setDetectedSize('≈ Letter / A4');
        else if (area > 250000) setDetectedSize('≈ A5 / B5');
        else setDetectedSize('Custom / Small');
      } catch (err) {
        console.error(err);
        setSubmitError(t.errors.pdfReadFail);
      } finally {
        setIsUploading(false);
      }
    } else if (selectedFile.type.startsWith('image/')) {
      const url = URL.createObjectURL(selectedFile);
      fileUrlRef.current = url;
      setFileUrl(url);
      setTotalPages(1);
      setDetectedOrientation('Image');
      setDetectedSize(t.print.fitToPaper);
    } else if (OFFICE_EXT.test(selectedFile.name)) {
      setManualPages(1);
      setDetectedOrientation(t.print.officeDoc);
      setDetectedSize(t.print.setPagesManually);
    }
  };

  // Retry PDF parse once pdfjs finishes lazy-loading
  useEffect(() => {
    if (file && file.type === 'application/pdf' && pdfjsLib && !pdfDoc && isUploading) {
      void loadSelectedFile(file, pdfjsLib);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pdfjsLib]);

  // Cleanup Realtime channel + blob URL on unmount
  useEffect(() => {
    return () => {
      if (printChannelRef.current) {
        supabase.removeChannel(printChannelRef.current);
        printChannelRef.current = null;
      }
      if (fileUrlRef.current) {
        URL.revokeObjectURL(fileUrlRef.current);
        fileUrlRef.current = '';
      }
    };
  }, []);

  const handleSelectSimCard = (key: string) => {
    const card = SANDBOX_TEST_CARDS[key] || SANDBOX_TEST_CARDS.success;
    setSelectedTokenId(null);
    setCardNumber(formatCardNumberDisplay(card.number));
    setExpiry(card.expiry);
    setCvv(card.cvv);
    setCardErrors({});
  };

  const handlePrintSubmit = async () => {
    if (!file || !user) return;
    if (quote.error) {
      setSubmitError(localizeQuoteError(quote, t) || t.errors.generic);
      return;
    }
    if (config.deliveryType === 'delivery' && !config.deliveryAddress.trim()) {
      setSubmitError(t.print.addressPlaceholder);
      return;
    }

    let cardToken = '';
    let brand = 'Visa';
    let expMonth: number | null = null;
    let expYear: number | null = null;

    if (selectedTokenId) {
      const saved = savedCards.find((c) => c.id === selectedTokenId);
      if (!saved) {
        setSubmitError(t.print.savedCardMissing);
        return;
      }
      cardToken = saved.card_token;
      brand = saved.card_brand;
      expMonth = saved.exp_month;
      expYear = saved.exp_year;
    } else {
      const validation = validateCardForSandbox({ cardNumber, expiry, cvv });
      setCardErrors(localizedCardFieldErrors(validation, t));
      if (!validation.valid) {
        setSubmitError(firstLocalizedCardError(validation, t));
        return;
      }

      setSubmitting(true);
      const tokenRes = await fetch('/api/sandbox/payment/tokenize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          card_number: validation.digits,
          expiry,
          cvv: validation.digits ? cvv : cvv,
        }),
      });
      const tokenData = await tokenRes.json();
      if (!tokenRes.ok) {
        setSubmitting(false);
        setSubmitError(localizeTokenizeApiError(tokenData, t));
        return;
      }
      cardToken = tokenData.card_token;
      brand = tokenData.card_brand;
      expMonth = tokenData.exp_month;
      expYear = tokenData.exp_year;
    }

    setSubmitting(true);
    setPrintProgress(0);
    setSubmitError(null);

    try {
      const fileExt = file.name.split('.').pop();
      const uniqueFileName = `${user.id}_${Date.now()}.${fileExt}`;
      const filePath = `print_jobs/${uniqueFileName}`;

      const { error: uploadError } = await supabase.storage
        .from('print-files')
        .upload(filePath, file, { cacheControl: '3600', upsert: true });

      if (uploadError) throw new Error(`${t.errors.uploadFail} ${uploadError.message}`);

      const idempotencyKey = crypto.randomUUID();
      const res = await fetch('/api/print-jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          file_name: file.name,
          file_path: filePath,
          total_pages: effectivePages,
          current_page: currentPage,
          config_color: config.colorMode,
          color_pages: config.colorPagesInput,
          config_copies: config.copies,
          config_paper_size: config.paperSize,
          config_binding: config.binding,
          finishes: config.finishes,
          duplex: config.duplex,
          orientation: config.orientation,
          scale_mode: config.scaleMode,
          scale_percent: config.scalePercent,
          pages_per_sheet: config.pagesPerSheet,
          reverse_order: config.reverseOrder,
          collate: config.collate,
          page_mode: config.pageMode,
          custom_pages: config.customPages,
          delivery_type: config.deliveryType,
          printer_location: config.printerLocation,
          delivery_address: config.deliveryAddress,
          card_token: cardToken,
          save_card: saveCard && !selectedTokenId,
          card_brand: brand,
          exp_month: expMonth,
          exp_year: expYear,
          use_points: usePoints,
          idempotency_key: idempotencyKey,
        }),
      });

      const jobData = await res.json();
      if (!res.ok) throw new Error(localizeApiError(jobData, t, t.errors.printInit));

      const job = (jobData.job || jobData) as PrintJob;
      setActiveJob(job);
      setPrintProgress(progressForStatus(job.status));
      toast.success(t.toast.printOk);

      const { data: profile } = await supabase
        .from('profiles')
        .select('reward_points')
        .eq('id', user.id)
        .single();
      if (profile) setRewardPoints(profile.reward_points);

      const { data: tokens } = await supabase
        .from('payment_tokens')
        .select('*')
        .eq('user_id', user.id);
      if (tokens) setSavedCards(tokens);

      const channel = supabase
        .channel(`print-job-progress-${job.id}`)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'print_jobs',
            filter: `id=eq.${job.id}`,
          },
          (payload) => {
            const updatedJob = payload.new as PrintJob;
            setActiveJob(updatedJob);
            setPrintProgress(progressForStatus(updatedJob.status));
            if (
              updatedJob.status === 'completed' ||
              updatedJob.status === 'failed' ||
              updatedJob.status === 'ready_for_pickup'
            ) {
              supabase.removeChannel(channel);
            }
          },
        )
        .subscribe();

      if (printChannelRef.current) {
        supabase.removeChannel(printChannelRef.current);
      }
      printChannelRef.current = channel;
    } catch (err) {
      const message = err instanceof Error ? err.message : t.errors.generic;
      setSubmitError(message);
      toast.error(t.toast.printFail, { description: message });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <PageShell className="selection:text-fg">
      {authLoading || profileLoading ? (
        <LoadingSkeleton variant="page" />
      ) : (
        <main className="flex-1 w-full max-w-[1600px] mx-auto px-3 sm:px-5 lg:px-8 py-6 md:py-8 relative z-10">
          {!user ? (
            <PageReveal className="glass-bezel-outer max-w-xl mx-auto">
              <div className="glass-bezel-inner flex flex-col items-center justify-center p-12 md:p-16 text-center space-y-6">
                <div className="p-4 bg-emerald-500/10 rounded-full text-emerald-400 border border-emerald-500/20">
                  <Printer className="w-12 h-12" />
                </div>
                <h2 className="text-2xl font-bold">{t.print.loginTitle}</h2>
                <p className="text-secondary max-w-md">{t.print.loginDesc}</p>
                <TransitionLink
                  href="/auth?next=/print"
                  className={cn(
                    'px-8 py-4 bg-emerald-500 hover:bg-emerald-600 rounded-xl font-bold flex items-center gap-2 text-on-brand',
                    btnInteractive,
                  )}
                >
                  {t.print.loginCta} <ArrowRight className="w-4 h-4" />
                </TransitionLink>
              </div>
            </PageReveal>
          ) : activeJob ? (
            <PrintProgressView
              activeJob={activeJob}
              printProgress={printProgress}
              onPrintNew={() => {
                setActiveJob(null);
                setFile(null);
                setSubmitError(null);
              }}
            />
          ) : (
            <div className="flex flex-col gap-5 lg:grid lg:grid-cols-[minmax(360px,440px)_minmax(0,1fr)] lg:gap-6 lg:items-start">
              <AnimatePresence mode="popLayout">
                {submitError && (
                  <motion.div
                    key="submit-error"
                    layout
                    className="lg:col-span-2 p-4 rounded-2xl border bg-red-500/10 border-red-500/20 text-red-400 flex items-start gap-3"
                    initial={reduce ? false : { opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.32, ease: easeOutExpo }}
                  >
                    <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
                    <div className="flex-1 space-y-1">
                      <h4 className="font-bold text-sm">{t.print.submitErrorTitle}</h4>
                      <p className="text-xs text-secondary">{submitError}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSubmitError(null)}
                      className={cn('text-xs font-bold underline', btnInteractive)}
                    >
                      {t.common.close}
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
              <motion.div
                className="order-2 lg:order-1 min-w-0"
                initial={reduce ? false : { opacity: 0, x: -22 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.55, ease: easeOutExpo, delay: 0.04 }}
              >
                <PrintConfigForm
                  file={file}
                  fileMeta={fileMeta}
                  isUploading={isUploading}
                  config={config}
                  patchConfig={patchConfig}
                  currentPage={currentPage}
                  quote={quote}
                  rewardPoints={rewardPoints}
                  usePoints={usePoints}
                  setUsePoints={setUsePoints}
                  cardNumber={cardNumber}
                  setCardNumber={(v) => setCardNumber(formatCardNumberDisplay(v))}
                  expiry={expiry}
                  setExpiry={setExpiry}
                  cvv={cvv}
                  setCvv={setCvv}
                  cardErrors={cardErrors}
                  saveCard={saveCard}
                  setSaveCard={setSaveCard}
                  savedCards={savedCards}
                  selectedTokenId={selectedTokenId}
                  setSelectedTokenId={setSelectedTokenId}
                  onSelectSimCard={handleSelectSimCard}
                  submitting={submitting}
                  handleUploadClick={() => fileInputRef.current?.click()}
                  handlePrintSubmit={handlePrintSubmit}
                  fileInputRef={fileInputRef}
                  handleFileChange={handleFileChange}
                  manualPages={manualPages}
                  setManualPages={(n) => {
                    setManualPages(n);
                    setTotalPages(n);
                  }}
                  isOfficeDoc={isOfficeDoc}
                />
              </motion.div>
              <motion.div
                className="order-1 lg:order-2 min-w-0 lg:sticky lg:top-20 lg:self-start"
                initial={reduce ? false : { opacity: 0, x: 22 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.55, ease: easeOutExpo, delay: 0.1 }}
              >
                <PrintPreview
                  key={file ? `${file.name}-${file.size}` : 'empty'}
                  file={file}
                  fileUrl={fileUrl}
                  pdfDoc={pdfDoc}
                  totalPages={effectivePages}
                  currentPage={currentPage}
                  setCurrentPage={setCurrentPage}
                  configColor={config.colorMode}
                  configBinding={config.binding}
                  configPaperSize={config.paperSize}
                  colorPages={colorPages}
                />
              </motion.div>
            </div>
          )}
        </main>
      )}

      <AppFooter className="mt-12" />
    </PageShell>
  );
}
