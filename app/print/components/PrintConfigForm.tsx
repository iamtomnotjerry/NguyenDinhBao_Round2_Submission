'use client';

import { RefObject, type ReactNode } from 'react';
import * as Accordion from '@radix-ui/react-accordion';
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
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { FormField } from '@/components/ui/FormField';
import { SegmentOption, SegmentGroup } from '@/components/ui/SegmentOption';
import { useLocale } from '@/lib/i18n/context';
import type { PrintConfig, FinishOption, PaperSize } from '@/lib/print/types';
import { PAPER_SIZE_LABELS } from '@/lib/print/types';
import type { PrintQuote } from '@/lib/print/pricing';
import { localizeQuoteError } from '@/lib/print/quote-i18n';
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
  value,
  title,
  icon,
  children,
}: {
  value: string;
  title: string;
  icon?: ReactNode;
  children: ReactNode;
}) {
  return (
    <Accordion.Item value={value} className="rounded-xl border border-edge/80 overflow-hidden">
      <Accordion.Header>
        <Accordion.Trigger
          className={cn(
            'group w-full flex items-center justify-between gap-2 px-3.5 py-3 text-left bg-muted/30',
            btnInteractive,
          )}
        >
          <span className="text-sm font-bold uppercase tracking-wider text-secondary flex items-center gap-2 min-w-0">
            {icon}
            <span className="truncate">{title}</span>
          </span>
          <ChevronDown className="w-4 h-4 shrink-0 text-muted-fg transition-transform duration-300 group-data-[state=open]:rotate-180" />
        </Accordion.Trigger>
      </Accordion.Header>
      <Accordion.Content className="overflow-hidden data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down">
        <div className="px-3.5 pt-3 pb-4 space-y-4 border-t border-line/80 bg-transparent">
          {children}
        </div>
      </Accordion.Content>
    </Accordion.Item>
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
  const defaultOpenSections = [
    'upload',
    'payment',
    ...(hasFile ? (['config', 'fulfillment'] as const) : []),
  ];

  return (
    <div className="space-y-5">
      <div className="glass-bezel-outer">
        <div className="glass-bezel-inner p-5 md:p-6 space-y-4">
          <h2 className="text-xl md:text-2xl font-bold text-fg flex items-center gap-2">
            <Printer className="w-5 h-5 md:w-6 md:h-6 text-emerald-400" /> {t.print.title}
          </h2>

          <Accordion.Root type="multiple" defaultValue={defaultOpenSections} className="space-y-4">
            {/* Upload */}
            <AccordionSection
              value="upload"
              title={t.print.sectionUpload}
              icon={<UploadCloud className="w-4 h-4 text-emerald-400 shrink-0" />}
            >
              <div
                onClick={handleUploadClick}
                className={cn(
                  'border-2 border-dashed border-edge rounded-2xl p-6 text-center hover:border-emerald-500/50 hover:bg-emerald-500/5 relative overflow-hidden group',
                  btnInteractive,
                  file && 'bg-muted/20',
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
                    <p className="text-secondary text-sm font-semibold">{t.print.scanning}</p>
                  </div>
                ) : file ? (
                  <div className="flex flex-col items-center space-y-2">
                    <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400">
                      <FileText className="w-8 h-8" />
                    </div>
                    <p className="text-fg text-sm font-bold truncate max-w-xs">{file.name}</p>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="text-emerald-400 text-xs font-bold underline h-auto px-0 py-0 hover:bg-transparent"
                    >
                      {t.print.chooseOther}
                    </Button>
                  </div>
                ) : (
                  <div className="flex flex-col items-center space-y-2">
                    <UploadCloud className="w-10 h-10 text-muted-fg group-hover:text-emerald-400 transition-colors" />
                    <p className="text-secondary-strong text-sm font-bold">{t.print.uploadHint}</p>
                    <p className="text-muted-fg text-xs font-semibold">{t.print.uploadSupport}</p>
                  </div>
                )}
              </div>

              {fileMeta && (
                <div className="rounded-2xl border border-edge bg-elevated/50 p-4 grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
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
                    <Input
                      type="number"
                      min={1}
                      value={manualPages}
                      onChange={(e) => setManualPages(Math.max(1, Number(e.target.value) || 1))}
                      mono
                      className="w-20"
                    />
                  </label>
                </div>
              )}
            </AccordionSection>

            {/* Config */}
            <AccordionSection
              value="config"
              title={t.print.sectionConfig}
              icon={<Settings className="w-4 h-4 text-muted-fg shrink-0" />}
            >
              <div className="grid grid-cols-3 gap-2">
                {(['color', 'bw', 'mixed'] as const).map((mode) => (
                  <Button
                    key={mode}
                    type="button"
                    variant={config.colorMode === mode ? 'outline' : 'ghost'}
                    size="sm"
                    onClick={() => patchConfig({ colorMode: mode })}
                    className={cn(
                      'p-3 h-auto rounded-xl font-bold text-xs',
                      config.colorMode === mode
                        ? 'border-emerald-500 bg-emerald-500/5'
                        : 'border border-edge text-secondary',
                    )}
                  >
                    {mode === 'color' ? t.print.color : mode === 'bw' ? t.print.bw : t.print.mixed}
                  </Button>
                ))}
              </div>
              {config.colorMode === 'mixed' && (
                <Input
                  value={config.colorPagesInput}
                  onChange={(e) => patchConfig({ colorPagesInput: e.target.value })}
                  placeholder={t.print.colorPagesPlaceholder}
                  mono
                />
              )}

              <div className="space-y-2">
                <label className="text-xs font-bold text-muted-fg uppercase tracking-wider">
                  {t.print.pageSelection}
                </label>
                <SegmentGroup label={t.print.pageSelection} className="grid grid-cols-3 gap-2">
                  {(['all', 'current', 'custom'] as const).map((mode) => (
                    <SegmentOption
                      radio
                      key={mode}
                      selected={config.pageMode === mode}
                      onClick={() => patchConfig({ pageMode: mode })}
                    >
                      {mode === 'all'
                        ? t.print.pagesAll
                        : mode === 'current'
                          ? t.print.pagesCurrent
                          : t.print.pagesCustom}
                    </SegmentOption>
                  ))}
                </SegmentGroup>
                {config.pageMode === 'custom' && (
                  <Input
                    value={config.customPages}
                    onChange={(e) => patchConfig({ customPages: e.target.value })}
                    placeholder="1-5, 8, 10-12"
                    mono
                  />
                )}
                {quote.error && (
                  <p className="text-xs text-red-400">{localizeQuoteError(quote, t)}</p>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Field label={t.print.copies}>
                  <Input
                    type="number"
                    min={1}
                    value={config.copies}
                    onChange={(e) =>
                      patchConfig({ copies: Math.max(1, parseInt(e.target.value, 10) || 1) })
                    }
                    className="font-bold"
                  />
                </Field>
                <Field label={t.print.paperSize}>
                  <Select
                    value={config.paperSize}
                    onChange={(e) => patchConfig({ paperSize: e.target.value as PaperSize })}
                    className="font-bold"
                  >
                    {PAPER_OPTIONS.map((s) => (
                      <option key={s} value={s}>
                        {PAPER_SIZE_LABELS[s]}
                      </option>
                    ))}
                  </Select>
                </Field>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-muted-fg uppercase tracking-wider">
                  {t.print.duplex}
                </label>
                <SegmentGroup label={t.print.duplex} className="grid grid-cols-3 gap-2">
                  {(
                    [
                      ['simplex', t.print.duplexSimplex],
                      ['long_edge', t.print.duplexLong],
                      ['short_edge', t.print.duplexShort],
                    ] as const
                  ).map(([key, label]) => (
                    <SegmentOption
                      radio
                      key={key}
                      selected={config.duplex === key}
                      onClick={() => patchConfig({ duplex: key })}
                    >
                      {label}
                    </SegmentOption>
                  ))}
                </SegmentGroup>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <Field label={t.print.orientation}>
                  <Select
                    value={config.orientation}
                    onChange={(e) =>
                      patchConfig({ orientation: e.target.value as PrintConfig['orientation'] })
                    }
                    className="font-bold"
                  >
                    <option value="auto">{t.print.orientAuto}</option>
                    <option value="portrait">{t.print.orientPortrait}</option>
                    <option value="landscape">{t.print.orientLandscape}</option>
                  </Select>
                </Field>
                <Field label={t.print.scaleMode}>
                  <Select
                    value={config.scaleMode}
                    onChange={(e) =>
                      patchConfig({ scaleMode: e.target.value as PrintConfig['scaleMode'] })
                    }
                    className="font-bold"
                  >
                    <option value="fit">{t.print.scaleFit}</option>
                    <option value="actual">{t.print.scaleActual}</option>
                    <option value="percent">{t.print.scalePercent}</option>
                  </Select>
                </Field>
                <Field label={t.print.pagesPerSheet}>
                  <Select
                    value={config.pagesPerSheet}
                    onChange={(e) =>
                      patchConfig({ pagesPerSheet: Number(e.target.value) as 1 | 2 | 4 })
                    }
                    className="font-bold"
                  >
                    <option value={1}>1</option>
                    <option value={2}>2</option>
                    <option value={4}>4</option>
                  </Select>
                </Field>
              </div>

              {config.scaleMode === 'percent' && (
                <Field label={`${t.print.scalePercent} %`}>
                  <Input
                    type="number"
                    min={10}
                    max={400}
                    value={config.scalePercent}
                    onChange={(e) => patchConfig({ scalePercent: Number(e.target.value) || 100 })}
                    className="font-bold"
                  />
                </Field>
              )}

              <div className="flex gap-4 text-xs text-secondary-strong">
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
                <label className="text-xs font-bold text-muted-fg uppercase tracking-wider">
                  {t.print.binding}
                </label>
                <SegmentGroup
                  label={t.print.binding}
                  className="grid grid-cols-2 md:grid-cols-5 gap-2"
                >
                  {(['none', 'stapled', 'spiral', 'glue', 'hardcover'] as const).map((b) => (
                    <SegmentOption
                      radio
                      key={b}
                      dense
                      selected={config.binding === b}
                      onClick={() => patchConfig({ binding: b })}
                      className="capitalize"
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
                    </SegmentOption>
                  ))}
                </SegmentGroup>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-muted-fg uppercase tracking-wider">
                  {t.print.finishing}
                </label>
                <div className="flex flex-wrap gap-2">
                  {FINISHES.map((f) => (
                    <SegmentOption
                      key={f}
                      dense
                      selected={config.finishes.includes(f)}
                      onClick={() => toggleFinish(f)}
                      className={
                        config.finishes.includes(f)
                          ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300'
                          : undefined
                      }
                    >
                      {finishLabel(f)}
                    </SegmentOption>
                  ))}
                </div>
              </div>
            </AccordionSection>

            {/* Fulfillment */}
            <AccordionSection
              value="fulfillment"
              title={t.print.sectionFulfillment}
              icon={<MapPin className="w-4 h-4 text-muted-fg shrink-0" />}
            >
              <SegmentGroup
                label={t.print.sectionFulfillment}
                className="flex gap-2 bg-elevated/80 p-1 rounded-lg border border-line"
              >
                <SegmentOption
                  radio
                  selected={config.deliveryType === 'pickup'}
                  onClick={() => patchConfig({ deliveryType: 'pickup' })}
                  className={cn(
                    'flex-1 py-2 rounded-md flex items-center justify-center gap-1.5',
                    config.deliveryType === 'pickup' &&
                      'border-transparent bg-emerald-600 text-on-brand',
                  )}
                >
                  <Printer className="w-3.5 h-3.5" /> {t.print.pickup}
                </SegmentOption>
                <SegmentOption
                  radio
                  selected={config.deliveryType === 'delivery'}
                  onClick={() => patchConfig({ deliveryType: 'delivery' })}
                  className={cn(
                    'flex-1 py-2 rounded-md flex items-center justify-center gap-1.5',
                    config.deliveryType === 'delivery' &&
                      'border-transparent bg-emerald-600 text-on-brand',
                  )}
                >
                  <Truck className="w-3.5 h-3.5" /> {t.print.delivery}
                </SegmentOption>
              </SegmentGroup>
              {config.deliveryType === 'pickup' ? (
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-400 z-10 pointer-events-none" />
                  <Select
                    value={config.printerLocation}
                    onChange={(e) => patchConfig({ printerLocation: e.target.value })}
                    className="pl-10 font-bold"
                  >
                    <option value="store_a">{t.print.locStoreA}</option>
                    <option value="store_b">{t.print.locStoreB}</option>
                    <option value="store_c">{t.print.locStoreC}</option>
                  </Select>
                </div>
              ) : (
                <Input
                  value={config.deliveryAddress}
                  onChange={(e) => patchConfig({ deliveryAddress: e.target.value })}
                  placeholder={t.print.addressPlaceholder}
                  className="font-bold"
                />
              )}
            </AccordionSection>

            {/* Payment */}
            <AccordionSection
              value="payment"
              title={t.print.sectionPayment}
              icon={<CreditCard className="w-4 h-4 text-emerald-400 shrink-0" />}
            >
              <div className="rounded-2xl border border-edge bg-elevated/60 p-4 space-y-2 text-xs">
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-fg">
                  {t.print.priceBreakdown}
                </p>
                {quote.lines.map((line) => (
                  <div key={line.label} className="flex justify-between text-secondary">
                    <span>{line.label}</span>
                    <span className="text-fg font-mono">${line.amount.toFixed(2)}</span>
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
                <div className="flex justify-between border-t border-edge pt-2 font-bold text-sm">
                  <span className="text-secondary-strong">{t.print.estimate}</span>
                  <span className="text-fg">${payTotal.toFixed(2)}</span>
                </div>
              </div>

              <div className="space-y-3">
                {rewardPoints > 0 && (
                  <label className="flex items-center justify-between p-3 rounded-xl border border-emerald-500/15 bg-emerald-500/5 text-xs cursor-pointer">
                    <span className="flex items-center gap-2 text-secondary-strong">
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
                    <p className="text-[10px] font-bold uppercase text-muted-fg tracking-wider">
                      {t.print.savedCards}
                    </p>
                    <SegmentGroup label={t.print.savedCards} className="flex flex-wrap gap-2">
                      <SegmentOption
                        dense
                        radio
                        selected={!selectedTokenId}
                        onClick={() => setSelectedTokenId(null)}
                        className={
                          !selectedTokenId ? 'border-emerald-500/40 text-emerald-300' : undefined
                        }
                      >
                        {t.print.newCard}
                      </SegmentOption>
                      {savedCards.map((c) => (
                        <SegmentOption
                          key={c.id}
                          dense
                          radio
                          selected={selectedTokenId === c.id}
                          onClick={() => setSelectedTokenId(c.id)}
                          className={
                            selectedTokenId === c.id
                              ? 'border-emerald-500/40 text-emerald-300'
                              : undefined
                          }
                        >
                          {c.card_brand} ••{c.last4}
                        </SegmentOption>
                      ))}
                    </SegmentGroup>
                  </div>
                )}

                {!selectedTokenId && (
                  <div className="space-y-3">
                    <FormField label={t.store.cardNumber} error={cardErrors.number}>
                      <Input
                        value={cardNumber}
                        onChange={(e) => setCardNumber(e.target.value)}
                        placeholder="4111 1111 1111 1111"
                        mono
                      />
                    </FormField>
                    <div className="grid grid-cols-2 gap-3">
                      <FormField label={t.store.expiry} error={cardErrors.expiry}>
                        <Input
                          value={expiry}
                          onChange={(e) => setExpiry(e.target.value)}
                          placeholder="MM/YY"
                          mono
                          className="text-center"
                        />
                      </FormField>
                      <FormField label={t.store.cvv} error={cardErrors.cvv}>
                        <Input
                          value={cvv}
                          onChange={(e) => setCvv(e.target.value)}
                          placeholder="CVV"
                          maxLength={4}
                          mono
                          className="text-center"
                        />
                      </FormField>
                    </div>
                    <label className="flex items-center gap-2 text-xs text-secondary cursor-pointer">
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
                        <SegmentOption
                          key={key}
                          dense
                          onClick={() => onSelectSimCard(key)}
                          className="bg-muted text-[9px]"
                        >
                          {key}
                        </SegmentOption>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </AccordionSection>
          </Accordion.Root>

          {/* Sticky pay bar */}
          <div className="sticky bottom-20 md:bottom-4 z-20 pt-1">
            <div className="glass-bezel-outer shadow-lg shadow-black/40">
              <div className="glass-bezel-inner !p-3 flex items-center gap-3">
                <div className="min-w-0 shrink-0">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-fg">
                    {t.print.estimate}
                  </p>
                  <p className="text-lg font-bold text-fg font-mono leading-tight">
                    ${payTotal.toFixed(2)}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="primary"
                  onClick={handlePrintSubmit}
                  disabled={!file || submitting || isUploading || !!quote.error}
                  className="flex-1"
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
                </Button>
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
      <label className="text-xs font-bold text-muted-fg uppercase tracking-wider">{label}</label>
      {children}
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p className="text-[9px] uppercase tracking-wider text-faint font-bold truncate">{label}</p>
      <p className="text-secondary-strong font-semibold truncate" title={value}>
        {value}
      </p>
    </div>
  );
}
