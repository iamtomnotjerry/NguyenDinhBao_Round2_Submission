'use client';

import { RefObject, useState, type ReactNode } from 'react';
import {
  FileText,
  UploadCloud,
  Settings,
  MapPin,
  Printer,
  RefreshCw,
  CreditCard,
  Truck,
  ChevronDown,
} from 'lucide-react';
import { btnInteractive, cn } from '@/lib/utils';
import { useLocale } from '@/lib/i18n/context';
import type { PrintConfig, FinishOption, PaperSize } from '@/lib/print/types';
import { PAPER_SIZE_LABELS } from '@/lib/print/types';
import type { PrintQuote } from '@/lib/print/pricing';
import type { SafeDatabase } from '@/types/database.types';

type SavedCard = Pick<
  SafeDatabase['public']['Tables']['payment_tokens']['Row'],
  'id' | 'card_brand' | 'last4' | 'exp_month' | 'exp_year' | 'is_default' | 'card_token'
>;

interface FileMeta {
  name: string;
  sizeLabel: string;
  pages: number;
  orientation: string;
  detectedSize: string;
  colorEstimate: string;
}

interface PrintConfigFormProps {
  file: File | null;
  fileMeta: FileMeta | null;
  isUploading: boolean;
  config: PrintConfig;
  patchConfig: (patch: Partial<PrintConfig>) => void;
  currentPage: number;
  quote: PrintQuote;
  rewardPoints: number;
  usePoints: boolean;
  setUsePoints: (v: boolean) => void;
  cardNumber: string;
  setCardNumber: (v: string) => void;
  expiry: string;
  setExpiry: (v: string) => void;
  cvv: string;
  setCvv: (v: string) => void;
  cardErrors: { number?: string; expiry?: string; cvv?: string };
  saveCard: boolean;
  setSaveCard: (v: boolean) => void;
  savedCards: SavedCard[];
  selectedTokenId: string | null;
  setSelectedTokenId: (id: string | null) => void;
  onSelectSimCard: (key: string) => void;
  submitting: boolean;
  handleUploadClick: () => void;
  handlePrintSubmit: () => void;
  fileInputRef: RefObject<HTMLInputElement | null>;
  handleFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  manualPages: number;
  setManualPages: (n: number) => void;
  isOfficeDoc: boolean;
}

const FINISHES: FinishOption[] = [
  'lamination_gloss',
  'lamination_matte',
  'folding',
  'hole_punch',
  'corner_cut',
];

const FINISH_LABEL_KEYS: Record<FinishOption, string> = {
  lamination_gloss: 'finishGloss',
  lamination_matte: 'finishMatte',
  folding: 'finishFolding',
  hole_punch: 'finishHolePunch',
  corner_cut: 'finishCornerCut',
};

const PAPER_OPTIONS: PaperSize[] = ['a4', 'a3', 'a5', 'letter', 'legal', 'tabloid', 'b5', 'custom'];

function AccordionSection({
  title,
  icon,
  defaultOpen = true,
  children,
}: {
  title: string;
  icon?: ReactNode;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="rounded-xl border border-zinc-800/80 overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'w-full flex items-center justify-between gap-2 px-3.5 py-3 text-left bg-zinc-900/30',
          btnInteractive,
        )}
      >
        <span className="text-sm font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-2 min-w-0">
          {icon}
          <span className="truncate">{title}</span>
        </span>
        <ChevronDown
          className={cn(
            'w-4 h-4 shrink-0 text-zinc-500 transition-transform duration-200',
            open && 'rotate-180',
          )}
        />
      </button>
      {open && (
        <div className="px-3.5 pt-3 pb-4 space-y-4 border-t border-zinc-900/80 bg-transparent">
          {children}
        </div>
      )}
    </div>
  );
}

export default function PrintConfigForm(props: PrintConfigFormProps) {
  const { t } = useLocale();
  const {
    file,
    fileMeta,
    isUploading,
    config,
    patchConfig,
    quote,
    rewardPoints,
    usePoints,
    setUsePoints,
    cardNumber,
    setCardNumber,
    expiry,
    setExpiry,
    cvv,
    setCvv,
    cardErrors,
    saveCard,
    setSaveCard,
    savedCards,
    selectedTokenId,
    setSelectedTokenId,
    onSelectSimCard,
    submitting,
    handleUploadClick,
    handlePrintSubmit,
    fileInputRef,
    handleFileChange,
    manualPages,
    setManualPages,
    isOfficeDoc,
  } = props;

  const discount = usePoints
    ? Math.round(Math.min(rewardPoints, Math.round(quote.total * 10)) * 0.1 * 100) / 100
    : 0;
  const pointsUsed = usePoints ? Math.min(rewardPoints, Math.round(quote.total * 10)) : 0;
  const payTotal = Math.max(0, Math.round((quote.total - discount) * 100) / 100);

  const toggleFinish = (f: FinishOption) => {
    const has = config.finishes.includes(f);
    patchConfig({
      finishes: has ? config.finishes.filter((x) => x !== f) : [...config.finishes, f],
    });
  };

  const printDict = t.print as Record<string, string | undefined>;
  const finishLabel = (f: FinishOption) => printDict[FINISH_LABEL_KEYS[f]] ?? f.replace(/_/g, ' ');

  const hasFile = !!file;

  return (
    <div className="space-y-5">
      <div className="glass-bezel-outer">
        <div className="glass-bezel-inner p-5 md:p-6 space-y-4">
          <h2 className="text-xl md:text-2xl font-bold text-white flex items-center gap-2">
            <Printer className="w-5 h-5 md:w-6 md:h-6 text-emerald-400" /> {t.print.title}
          </h2>

          {/* Upload */}
          <AccordionSection
            title={t.print.sectionUpload}
            icon={<UploadCloud className="w-4 h-4 text-emerald-400 shrink-0" />}
            defaultOpen
          >
            <div
              onClick={handleUploadClick}
              className={cn(
                'border-2 border-dashed border-zinc-800 rounded-2xl p-6 text-center hover:border-emerald-500/50 hover:bg-emerald-500/5 relative overflow-hidden group',
                btnInteractive,
                file && 'bg-zinc-900/20',
              )}
            >
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                className="hidden"
                accept=".pdf,.png,.jpg,.jpeg,.webp,.gif,.doc,.docx,.ppt,.pptx,.xls,.xlsx,application/pdf,image/*,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              />
              {isUploading ? (
                <div className="flex flex-col items-center space-y-2">
                  <RefreshCw className="w-10 h-10 text-emerald-400 animate-spin" />
                  <p className="text-zinc-400 text-sm font-semibold">{t.print.scanning}</p>
                </div>
              ) : file ? (
                <div className="flex flex-col items-center space-y-2">
                  <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400">
                    <FileText className="w-8 h-8" />
                  </div>
                  <p className="text-white text-sm font-bold truncate max-w-xs">{file.name}</p>
                  <button
                    type="button"
                    className={cn('text-emerald-400 text-xs font-bold underline', btnInteractive)}
                  >
                    {t.print.chooseOther}
                  </button>
                </div>
              ) : (
                <div className="flex flex-col items-center space-y-2">
                  <UploadCloud className="w-10 h-10 text-zinc-500 group-hover:text-emerald-400 transition-colors" />
                  <p className="text-zinc-300 text-sm font-bold">{t.print.uploadHint}</p>
                  <p className="text-zinc-500 text-xs font-semibold">{t.print.uploadSupport}</p>
                </div>
              )}
            </div>

            {fileMeta && (
              <div className="rounded-2xl border border-zinc-800 bg-zinc-950/50 p-4 grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                <Info label={t.print.metaName} value={fileMeta.name} />
                <Info label={t.print.metaSize} value={fileMeta.sizeLabel} />
                <Info label={t.print.metaPages} value={String(fileMeta.pages)} />
                <Info label={t.print.metaOrient} value={fileMeta.orientation} />
                <Info label={t.print.metaPaper} value={fileMeta.detectedSize} />
                <Info label={t.print.metaColor} value={fileMeta.colorEstimate} />
                <Info label={t.print.metaEstimate} value={`$${quote.total.toFixed(2)}`} />
                <Info
                  label={t.print.metaSheets}
                  value={`${quote.billableSheets} (${quote.selectedPageCount} ${t.print.pagesUnit})`}
                />
              </div>
            )}

            {isOfficeDoc && (
              <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3 text-xs text-amber-300 space-y-2">
                <p>{t.print.officeHint}</p>
                <label className="flex items-center gap-2">
                  <span className="font-bold uppercase tracking-wider text-[10px] text-amber-400/80">
                    {t.print.manualPages}
                  </span>
                  <input
                    type="number"
                    min={1}
                    value={manualPages}
                    onChange={(e) => setManualPages(Math.max(1, Number(e.target.value) || 1))}
                    className="w-20 bg-zinc-950 border border-zinc-800 rounded-lg px-2 py-1 text-white font-mono"
                  />
                </label>
              </div>
            )}
          </AccordionSection>

          {/* Config */}
          <AccordionSection
            title={t.print.sectionConfig}
            icon={<Settings className="w-4 h-4 text-zinc-500 shrink-0" />}
            defaultOpen={hasFile}
          >
            <div className="grid grid-cols-3 gap-2">
              {(['color', 'bw', 'mixed'] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => patchConfig({ colorMode: mode })}
                  className={cn(
                    'p-3 rounded-xl border font-bold text-xs',
                    btnInteractive,
                    config.colorMode === mode
                      ? 'border-emerald-500 bg-emerald-500/5 text-white'
                      : 'border-zinc-800 text-zinc-400',
                  )}
                >
                  {mode === 'color' ? t.print.color : mode === 'bw' ? t.print.bw : t.print.mixed}
                </button>
              ))}
            </div>
            {config.colorMode === 'mixed' && (
              <input
                value={config.colorPagesInput}
                onChange={(e) => patchConfig({ colorPagesInput: e.target.value })}
                placeholder={t.print.colorPagesPlaceholder}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2.5 text-sm text-white font-mono"
              />
            )}

            <div className="space-y-2">
              <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">
                {t.print.pageSelection}
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(['all', 'current', 'custom'] as const).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => patchConfig({ pageMode: mode })}
                    className={cn(
                      'py-2 rounded-xl border text-xs font-bold',
                      btnInteractive,
                      config.pageMode === mode
                        ? 'border-emerald-500 bg-emerald-500/5 text-white'
                        : 'border-zinc-800 text-zinc-400',
                    )}
                  >
                    {mode === 'all'
                      ? t.print.pagesAll
                      : mode === 'current'
                        ? t.print.pagesCurrent
                        : t.print.pagesCustom}
                  </button>
                ))}
              </div>
              {config.pageMode === 'custom' && (
                <input
                  value={config.customPages}
                  onChange={(e) => patchConfig({ customPages: e.target.value })}
                  placeholder="1-5, 8, 10-12"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2.5 text-sm text-white font-mono"
                />
              )}
              {quote.error && <p className="text-xs text-red-400">{quote.error}</p>}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label={t.print.copies}>
                <input
                  type="number"
                  min={1}
                  value={config.copies}
                  onChange={(e) =>
                    patchConfig({ copies: Math.max(1, parseInt(e.target.value, 10) || 1) })
                  }
                  className="w-full bg-zinc-950 border border-zinc-800 focus:border-emerald-500 rounded-xl px-3 py-2.5 text-sm text-white font-bold focus:outline-none"
                />
              </Field>
              <Field label={t.print.paperSize}>
                <select
                  value={config.paperSize}
                  onChange={(e) => patchConfig({ paperSize: e.target.value as PaperSize })}
                  className="w-full bg-zinc-950 border border-zinc-800 focus:border-emerald-500 rounded-xl px-3 py-2.5 text-sm text-white font-bold focus:outline-none"
                >
                  {PAPER_OPTIONS.map((s) => (
                    <option key={s} value={s}>
                      {PAPER_SIZE_LABELS[s]}
                    </option>
                  ))}
                </select>
              </Field>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">
                {t.print.duplex}
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(
                  [
                    ['simplex', t.print.duplexSimplex],
                    ['long_edge', t.print.duplexLong],
                    ['short_edge', t.print.duplexShort],
                  ] as const
                ).map(([key, label]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => patchConfig({ duplex: key })}
                    className={cn(
                      'py-2 rounded-xl border text-xs font-bold',
                      btnInteractive,
                      config.duplex === key
                        ? 'border-emerald-500 bg-emerald-500/5 text-white'
                        : 'border-zinc-800 text-zinc-400',
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <Field label={t.print.orientation}>
                <select
                  value={config.orientation}
                  onChange={(e) =>
                    patchConfig({ orientation: e.target.value as PrintConfig['orientation'] })
                  }
                  className="w-full bg-zinc-950 border border-zinc-800 focus:border-emerald-500 rounded-xl px-3 py-2.5 text-sm text-white font-bold focus:outline-none"
                >
                  <option value="auto">{t.print.orientAuto}</option>
                  <option value="portrait">{t.print.orientPortrait}</option>
                  <option value="landscape">{t.print.orientLandscape}</option>
                </select>
              </Field>
              <Field label={t.print.scaleMode}>
                <select
                  value={config.scaleMode}
                  onChange={(e) =>
                    patchConfig({ scaleMode: e.target.value as PrintConfig['scaleMode'] })
                  }
                  className="w-full bg-zinc-950 border border-zinc-800 focus:border-emerald-500 rounded-xl px-3 py-2.5 text-sm text-white font-bold focus:outline-none"
                >
                  <option value="fit">{t.print.scaleFit}</option>
                  <option value="actual">{t.print.scaleActual}</option>
                  <option value="percent">{t.print.scalePercent}</option>
                </select>
              </Field>
              <Field label={t.print.pagesPerSheet}>
                <select
                  value={config.pagesPerSheet}
                  onChange={(e) =>
                    patchConfig({ pagesPerSheet: Number(e.target.value) as 1 | 2 | 4 })
                  }
                  className="w-full bg-zinc-950 border border-zinc-800 focus:border-emerald-500 rounded-xl px-3 py-2.5 text-sm text-white font-bold focus:outline-none"
                >
                  <option value={1}>1</option>
                  <option value={2}>2</option>
                  <option value={4}>4</option>
                </select>
              </Field>
            </div>

            {config.scaleMode === 'percent' && (
              <Field label={`${t.print.scalePercent} %`}>
                <input
                  type="number"
                  min={10}
                  max={400}
                  value={config.scalePercent}
                  onChange={(e) => patchConfig({ scalePercent: Number(e.target.value) || 100 })}
                  className="w-full bg-zinc-950 border border-zinc-800 focus:border-emerald-500 rounded-xl px-3 py-2.5 text-sm text-white font-bold focus:outline-none"
                />
              </Field>
            )}

            <div className="flex gap-4 text-xs text-zinc-300">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.collate}
                  onChange={(e) => patchConfig({ collate: e.target.checked })}
                  className="accent-emerald-500"
                />
                {t.print.collate}
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.reverseOrder}
                  onChange={(e) => patchConfig({ reverseOrder: e.target.checked })}
                  className="accent-emerald-500"
                />
                {t.print.reverseOrder}
              </label>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">
                {t.print.binding}
              </label>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                {(['none', 'stapled', 'spiral', 'glue', 'hardcover'] as const).map((b) => (
                  <button
                    key={b}
                    type="button"
                    onClick={() => patchConfig({ binding: b })}
                    className={cn(
                      'py-2 px-1 rounded-xl border text-[10px] font-bold capitalize',
                      btnInteractive,
                      config.binding === b
                        ? 'border-emerald-500 bg-emerald-500/5 text-white'
                        : 'border-zinc-800 text-zinc-400',
                    )}
                  >
                    {b === 'none'
                      ? t.print.bindNone
                      : b === 'stapled'
                        ? t.print.bindStapled
                        : b === 'spiral'
                          ? t.print.bindSpiral
                          : b === 'glue'
                            ? t.print.bindGlue
                            : t.print.bindHardcover}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">
                {t.print.finishing}
              </label>
              <div className="flex flex-wrap gap-2">
                {FINISHES.map((f) => (
                  <button
                    key={f}
                    type="button"
                    onClick={() => toggleFinish(f)}
                    className={cn(
                      'px-2.5 py-1.5 rounded-lg border text-[10px] font-bold',
                      btnInteractive,
                      config.finishes.includes(f)
                        ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300'
                        : 'border-zinc-800 text-zinc-500',
                    )}
                  >
                    {finishLabel(f)}
                  </button>
                ))}
              </div>
            </div>
          </AccordionSection>

          {/* Fulfillment */}
          <AccordionSection
            title={t.print.sectionFulfillment}
            icon={<MapPin className="w-4 h-4 text-zinc-500 shrink-0" />}
            defaultOpen={hasFile}
          >
            <div className="flex gap-2 bg-zinc-950/80 p-1 rounded-lg border border-zinc-900">
              <button
                type="button"
                onClick={() => patchConfig({ deliveryType: 'pickup' })}
                className={cn(
                  'flex-1 py-2 rounded-md text-xs font-bold flex items-center justify-center gap-1.5',
                  btnInteractive,
                  config.deliveryType === 'pickup' ? 'bg-emerald-600 text-white' : 'text-zinc-500',
                )}
              >
                <Printer className="w-3.5 h-3.5" /> {t.print.pickup}
              </button>
              <button
                type="button"
                onClick={() => patchConfig({ deliveryType: 'delivery' })}
                className={cn(
                  'flex-1 py-2 rounded-md text-xs font-bold flex items-center justify-center gap-1.5',
                  btnInteractive,
                  config.deliveryType === 'delivery'
                    ? 'bg-emerald-600 text-white'
                    : 'text-zinc-500',
                )}
              >
                <Truck className="w-3.5 h-3.5" /> {t.print.delivery}
              </button>
            </div>
            {config.deliveryType === 'pickup' ? (
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-400" />
                <select
                  value={config.printerLocation}
                  onChange={(e) => patchConfig({ printerLocation: e.target.value })}
                  className="w-full pl-10 pr-4 py-2.5 bg-zinc-950 border border-zinc-800 focus:border-emerald-500 rounded-xl text-sm text-white font-bold focus:outline-none"
                >
                  <option value="Cửa hàng A - Quận 1, TPHCM">
                    Cửa hàng A - Quận 1, TPHCM (24/7)
                  </option>
                  <option value="Bưu cục Plat - Quận Cầu Giấy, HN">
                    Bưu cục Plat - Quận Cầu Giấy, HN
                  </option>
                  <option value="Bưu điện Trung tâm - Quận Hải Châu, ĐN">
                    Bưu điện Trung tâm - Đà Nẵng
                  </option>
                </select>
              </div>
            ) : (
              <input
                value={config.deliveryAddress}
                onChange={(e) => patchConfig({ deliveryAddress: e.target.value })}
                placeholder={t.print.addressPlaceholder}
                className="w-full bg-zinc-950 border border-zinc-800 focus:border-emerald-500 rounded-xl px-3 py-2.5 text-sm text-white font-bold focus:outline-none"
              />
            )}
          </AccordionSection>

          {/* Payment */}
          <AccordionSection
            title={t.print.sectionPayment}
            icon={<CreditCard className="w-4 h-4 text-emerald-400 shrink-0" />}
            defaultOpen
          >
            <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4 space-y-2 text-xs">
              <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                {t.print.priceBreakdown}
              </p>
              {quote.lines.map((line) => (
                <div key={line.label} className="flex justify-between text-zinc-400">
                  <span>{line.label}</span>
                  <span className="text-white font-mono">${line.amount.toFixed(2)}</span>
                </div>
              ))}
              {usePoints && discount > 0 && (
                <div className="flex justify-between text-emerald-400">
                  <span>
                    {t.print.pointsDiscount} ({pointsUsed} pts)
                  </span>
                  <span>-${discount.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between border-t border-zinc-800 pt-2 font-bold text-sm">
                <span className="text-zinc-300">{t.print.estimate}</span>
                <span className="text-white">${payTotal.toFixed(2)}</span>
              </div>
            </div>

            <div className="space-y-3">
              {rewardPoints > 0 && (
                <label className="flex items-center justify-between p-3 rounded-xl border border-emerald-500/15 bg-emerald-500/5 text-xs cursor-pointer">
                  <span className="flex items-center gap-2 text-zinc-300">
                    <input
                      type="checkbox"
                      checked={usePoints}
                      onChange={(e) => setUsePoints(e.target.checked)}
                      className="accent-emerald-500"
                    />
                    {t.print.usePoints} ({rewardPoints} pts)
                  </span>
                </label>
              )}

              {savedCards.length > 0 && (
                <div className="space-y-2">
                  <p className="text-[10px] font-bold uppercase text-zinc-500 tracking-wider">
                    {t.print.savedCards}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setSelectedTokenId(null)}
                      className={cn(
                        'px-2 py-1 rounded-lg border text-[10px] font-bold',
                        btnInteractive,
                        !selectedTokenId
                          ? 'border-emerald-500/40 text-emerald-300'
                          : 'border-zinc-800 text-zinc-500',
                      )}
                    >
                      {t.print.newCard}
                    </button>
                    {savedCards.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => setSelectedTokenId(c.id)}
                        className={cn(
                          'px-2 py-1 rounded-lg border text-[10px] font-bold',
                          btnInteractive,
                          selectedTokenId === c.id
                            ? 'border-emerald-500/40 text-emerald-300'
                            : 'border-zinc-800 text-zinc-500',
                        )}
                      >
                        {c.card_brand} ••{c.last4}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {!selectedTokenId && (
                <div className="space-y-3">
                  <div>
                    <input
                      value={cardNumber}
                      onChange={(e) => setCardNumber(e.target.value)}
                      placeholder="4111 1111 1111 1111"
                      className="w-full bg-zinc-950 border border-zinc-800 focus:border-emerald-500 rounded-xl px-3 py-2.5 text-sm text-white font-mono focus:outline-none"
                    />
                    {cardErrors.number && (
                      <p className="text-[10px] text-red-400 mt-1">{cardErrors.number}</p>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <input
                        value={expiry}
                        onChange={(e) => setExpiry(e.target.value)}
                        placeholder="MM/YY"
                        className="w-full bg-zinc-950 border border-zinc-800 focus:border-emerald-500 rounded-xl px-3 py-2.5 text-sm text-white font-mono text-center focus:outline-none"
                      />
                      {cardErrors.expiry && (
                        <p className="text-[10px] text-red-400 mt-1">{cardErrors.expiry}</p>
                      )}
                    </div>
                    <div>
                      <input
                        value={cvv}
                        onChange={(e) => setCvv(e.target.value)}
                        placeholder="CVV"
                        maxLength={4}
                        className="w-full bg-zinc-950 border border-zinc-800 focus:border-emerald-500 rounded-xl px-3 py-2.5 text-sm text-white font-mono text-center focus:outline-none"
                      />
                      {cardErrors.cvv && (
                        <p className="text-[10px] text-red-400 mt-1">{cardErrors.cvv}</p>
                      )}
                    </div>
                  </div>
                  <label className="flex items-center gap-2 text-xs text-zinc-400 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={saveCard}
                      onChange={(e) => setSaveCard(e.target.checked)}
                      className="accent-emerald-500"
                    />
                    {t.print.saveCard}
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {(['success', 'expired', 'decline', 'timeout'] as const).map((key) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => onSelectSimCard(key)}
                        className={cn(
                          'px-2 py-1 bg-zinc-900 border border-zinc-800 text-[9px] rounded text-zinc-400 font-bold',
                          btnInteractive,
                        )}
                      >
                        {key}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </AccordionSection>

          {/* Sticky pay bar */}
          <div className="sticky bottom-20 md:bottom-4 z-20 pt-1">
            <div className="glass-bezel-outer shadow-lg shadow-black/40">
              <div className="glass-bezel-inner !p-3 flex items-center gap-3">
                <div className="min-w-0 shrink-0">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                    {t.print.estimate}
                  </p>
                  <p className="text-lg font-bold text-white font-mono leading-tight">
                    ${payTotal.toFixed(2)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handlePrintSubmit}
                  disabled={!file || submitting || isUploading || !!quote.error}
                  className={cn(
                    'flex-1 py-3 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 disabled:pointer-events-none rounded-xl font-bold text-sm flex items-center justify-center gap-2 text-white',
                    btnInteractive,
                  )}
                >
                  {submitting ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" /> {t.print.processing}
                    </>
                  ) : (
                    <>
                      <Printer className="w-4 h-4" /> {t.print.startPrint}
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">{label}</label>
      {children}
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p className="text-[9px] uppercase tracking-wider text-zinc-600 font-bold truncate">
        {label}
      </p>
      <p className="text-zinc-200 font-semibold truncate" title={value}>
        {value}
      </p>
    </div>
  );
}
