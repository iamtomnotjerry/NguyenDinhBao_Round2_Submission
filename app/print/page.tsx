'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase/client';
import { SafeDatabase } from '@/types/database.types';
import { User as SupabaseUser } from '@supabase/supabase-js';
import Header from '@/components/Header';
import { Printer, RefreshCw, ArrowRight, AlertTriangle } from 'lucide-react';
import Link from 'next/link';
import { buildPrintQuote, btnInteractive, cn } from '@/lib/utils';
import type { PDFDocumentProxy } from 'pdfjs-dist';
import PrintPreview from './components/PrintPreview';
import PrintProgressView from './components/PrintProgressView';
import PrintConfigForm from './components/PrintConfigForm';
import { useLocale } from '@/lib/i18n/context';
import { DEFAULT_PRINT_CONFIG, type PrintConfig } from '@/lib/print/types';
import { parseColorPages } from '@/lib/print/page-selection';
import {
  formatCardNumberDisplay,
  validateCardForSandbox,
  SANDBOX_TEST_CARDS,
} from '@/lib/payment/validate-card';

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
    ready_for_pickup: 96,
    completed: 100,
    failed: 0,
  };
  return map[status] ?? 15;
}

export default function PrintPage() {
  const { t } = useLocale();
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [loading, setLoading] = useState(true);
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
        pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.mjs`;
        setPdfjsLib(pdfjs);
      });
    }
  }, []);

  useEffect(() => {
    const checkUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setUser(user);
      setLoading(false);
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('reward_points')
          .eq('id', user.id)
          .single();
        if (profile) setRewardPoints(profile.reward_points);

        const { data: tokens } = await supabase
          .from('payment_tokens')
          .select('*')
          .eq('user_id', user.id)
          .order('is_default', { ascending: false });
        if (tokens) setSavedCards(tokens);
      }
    };
    checkUser();
  }, []);

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
            ? `${effectivePages} B&W`
            : config.colorMode === 'color'
              ? `${effectivePages} Color`
              : `${colorPages.length} Color / ${Math.max(0, quote.bwPageCount)} B&W`,
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
        setSubmitError('Không đọc được PDF. Thử file khác.');
      } finally {
        setIsUploading(false);
      }
    } else if (selectedFile.type.startsWith('image/')) {
      const url = URL.createObjectURL(selectedFile);
      fileUrlRef.current = url;
      setFileUrl(url);
      setTotalPages(1);
      setDetectedOrientation('Image');
      setDetectedSize('Fit to paper');
    } else if (OFFICE_EXT.test(selectedFile.name)) {
      setManualPages(1);
      setDetectedOrientation(t.print.officeDoc);
      setDetectedSize('Set pages manually');
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
      setSubmitError(quote.error);
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
      setCardErrors(validation.errors);
      if (!validation.valid) {
        setSubmitError(
          validation.errors.number ||
            validation.errors.expiry ||
            validation.errors.cvv ||
            t.print.cardInvalid,
        );
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
        setSubmitError(tokenData.error || t.print.cardInvalid);
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

      if (uploadError) throw new Error(`Không thể upload file: ${uploadError.message}`);

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
      if (!res.ok) throw new Error(jobData.error || 'Lỗi khi khởi tạo đơn in');

      const job = (jobData.job || jobData) as PrintJob;
      setActiveJob(job);
      setPrintProgress(progressForStatus(job.status));

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
      setSubmitError(err instanceof Error ? err.message : 'Đã xảy ra lỗi ngoài ý muốn.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-zinc-950 text-white font-sans selection:bg-emerald-500 selection:text-white">
      <Header />

      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <RefreshCw className="w-8 h-8 animate-spin text-emerald-500" />
        </div>
      ) : (
        <main className="flex-1 max-w-6xl mx-auto px-4 md:px-6 py-10 w-full grid grid-cols-1 lg:grid-cols-12 gap-6 relative z-10">
          {!user ? (
            <div className="lg:col-span-12 glass-bezel-outer">
              <div className="glass-bezel-inner flex flex-col items-center justify-center p-16 text-center space-y-6">
                <div className="p-4 bg-emerald-500/10 rounded-full text-emerald-400 border border-emerald-500/20">
                  <Printer className="w-12 h-12" />
                </div>
                <h2 className="text-2xl font-bold">{t.print.loginTitle}</h2>
                <p className="text-zinc-400 max-w-md">{t.print.loginDesc}</p>
                <Link
                  href="/auth"
                  className={cn(
                    'px-8 py-4 bg-emerald-500 hover:bg-emerald-600 rounded-xl font-bold flex items-center gap-2 text-white',
                    btnInteractive,
                  )}
                >
                  {t.print.loginCta} <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
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
            <>
              {submitError && (
                <div className="lg:col-span-12 p-4 rounded-2xl border bg-red-500/10 border-red-500/20 text-red-400 flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
                  <div className="flex-1 space-y-1">
                    <h4 className="font-bold text-sm">{t.print.submitErrorTitle}</h4>
                    <p className="text-xs text-zinc-400">{submitError}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSubmitError(null)}
                    className={cn('text-xs font-bold underline', btnInteractive)}
                  >
                    {t.common.close}
                  </button>
                </div>
              )}
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
              <div className="lg:col-span-5 space-y-6">
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
              </div>
            </>
          )}
        </main>
      )}

      <footer className="border-t border-zinc-900 py-8 bg-zinc-950 text-center text-xs text-zinc-500 mt-12">
        {t.common.footer}
      </footer>
    </div>
  );
}
