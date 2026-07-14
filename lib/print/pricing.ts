import { parseColorPages, resolveSelectedPages } from './page-selection';
import {
  PAPER_SIZE_MULTIPLIER,
  type BindingType,
  type ColorMode,
  type DeliveryType,
  type DuplexMode,
  type FinishOption,
  type PaperSize,
  type PrintConfig,
} from './types';

export interface PriceLine {
  label: string;
  amount: number;
}

export interface PrintQuote {
  selectedPages: number[];
  selectedPageCount: number;
  colorPageCount: number;
  bwPageCount: number;
  billableSheets: number;
  impressions: number;
  subtotal: number;
  shippingFee: number;
  tax: number;
  total: number;
  lines: PriceLine[];
  error: string | null;
}

const RATE = {
  bw: 0.1,
  color: 0.5,
} as const;

const BINDING_PRICE: Record<BindingType, number> = {
  none: 0,
  stapled: 0.5,
  spiral: 3.5,
  glue: 5.0,
  hardcover: 12.0,
};

const FINISH_PRICE: Record<FinishOption, number> = {
  lamination_gloss: 0.35,
  lamination_matte: 0.4,
  folding: 0.25,
  hole_punch: 0.2,
  corner_cut: 0.15,
};

const TAX_RATE = 0.08;
const SHIPPING_BASE = 2.5;

function sheetsFromPages(pageCount: number, pagesPerSheet: number, duplex: DuplexMode): number {
  const faces = Math.ceil(pageCount / Math.max(1, pagesPerSheet));
  if (duplex === 'simplex') return faces;
  return Math.ceil(faces / 2);
}

/**
 * Commercial-style quote: paper size multiplies impression rates;
 * mixed color bills color vs BW pages separately; duplex uses sheet count for stock
 * but impressions still bill per side printed.
 */
export function buildPrintQuote(
  config: PrintConfig,
  totalPages: number,
  currentPage: number,
  options?: { taxEnabled?: boolean },
): PrintQuote {
  const taxEnabled = options?.taxEnabled !== false;

  const selection = resolveSelectedPages({
    mode: config.pageMode,
    customRange: config.customPages,
    currentPage,
    totalPages,
  });

  if (selection.error) {
    return emptyQuote(selection.error);
  }

  const selectedPages = selection.pages;
  const selectedPageCount = selectedPages.length;
  if (selectedPageCount === 0) return emptyQuote('No pages selected');

  let colorSet = new Set<number>();
  if (config.colorMode === 'color') {
    colorSet = new Set(selectedPages);
  } else if (config.colorMode === 'mixed') {
    const parsed = parseColorPages(config.colorPagesInput, totalPages);
    if (parsed.error) return emptyQuote(parsed.error);
    colorSet = new Set(parsed.pages.filter((p) => selectedPages.includes(p)));
  }

  const colorPageCount = selectedPages.filter((p) => colorSet.has(p)).length;
  const bwPageCount = selectedPageCount - colorPageCount;

  const sizeMult = PAPER_SIZE_MULTIPLIER[config.paperSize] ?? 1;
  const copies = Math.max(1, config.copies);

  const bwImpressions = bwPageCount * copies;
  const colorImpressions = colorPageCount * copies;
  const impressions = bwImpressions + colorImpressions;

  const billableSheets =
    sheetsFromPages(selectedPageCount, config.pagesPerSheet, config.duplex) * copies;

  const bwAmount = round2(bwImpressions * RATE.bw * sizeMult);
  const colorAmount = round2(colorImpressions * RATE.color * sizeMult);

  const lines: PriceLine[] = [];
  if (bwImpressions > 0) {
    lines.push({
      label: `B&W ${bwPageCount} pg × ${copies} × $${(RATE.bw * sizeMult).toFixed(3)}`,
      amount: bwAmount,
    });
  }
  if (colorImpressions > 0) {
    lines.push({
      label: `Color ${colorPageCount} pg × ${copies} × $${(RATE.color * sizeMult).toFixed(3)}`,
      amount: colorAmount,
    });
  }

  if (config.duplex !== 'simplex') {
    lines.push({
      label: `Duplex (${config.duplex.replace('_', '-')}) · ${billableSheets} sheets`,
      amount: 0,
    });
  }

  const bindingFee = BINDING_PRICE[config.binding] ?? 0;
  if (bindingFee > 0) {
    lines.push({ label: `Binding (${config.binding})`, amount: bindingFee });
  }

  let finishTotal = 0;
  for (const finish of config.finishes) {
    const unit = FINISH_PRICE[finish] ?? 0;
    const amount = round2(unit * billableSheets);
    finishTotal += amount;
    lines.push({ label: `Finish ${finish.replace(/_/g, ' ')}`, amount });
  }

  const shippingFee =
    config.deliveryType === 'delivery' ? round2(SHIPPING_BASE + billableSheets * 0.05) : 0;
  if (shippingFee > 0) {
    lines.push({ label: 'Shipping', amount: shippingFee });
  }

  const subtotal = round2(bwAmount + colorAmount + bindingFee + finishTotal + shippingFee);
  const tax = taxEnabled ? round2(subtotal * TAX_RATE) : 0;
  if (tax > 0) lines.push({ label: `Tax (${(TAX_RATE * 100).toFixed(0)}%)`, amount: tax });

  const total = round2(subtotal + tax);

  return {
    selectedPages,
    selectedPageCount,
    colorPageCount,
    bwPageCount,
    billableSheets,
    impressions,
    subtotal,
    shippingFee,
    tax,
    total,
    lines,
    error: null,
  };
}

/** Back-compat helper used by older call sites */
export function calculatePrintCost(
  totalPages: number,
  copies: number,
  configColor: ColorMode | 'color' | 'bw',
  configBinding: BindingType | 'none' | 'stapled' | 'spiral',
  paperSize: PaperSize = 'a4',
  duplex: DuplexMode = 'simplex',
): number {
  const config: PrintConfig = {
    colorMode: configColor === 'mixed' ? 'mixed' : configColor,
    colorPagesInput: '',
    copies,
    paperSize,
    binding: configBinding as BindingType,
    finishes: [],
    duplex,
    orientation: 'auto',
    scaleMode: 'fit',
    scalePercent: 100,
    pagesPerSheet: 1,
    reverseOrder: false,
    collate: true,
    pageMode: 'all',
    customPages: '',
    deliveryType: 'pickup',
    printerLocation: '',
    deliveryAddress: '',
  };
  return buildPrintQuote(config, totalPages, 1).total;
}

export function estimateDeliveryLabel(deliveryType: DeliveryType): string {
  if (deliveryType === 'pickup') return 'Ready for pickup in ~2–4 hours';
  return 'Home delivery in 1–2 business days';
}

function emptyQuote(error: string): PrintQuote {
  return {
    selectedPages: [],
    selectedPageCount: 0,
    colorPageCount: 0,
    bwPageCount: 0,
    billableSheets: 0,
    impressions: 0,
    subtotal: 0,
    shippingFee: 0,
    tax: 0,
    total: 0,
    lines: [],
    error,
  };
}

function round2(n: number) {
  return Math.round(n * 100) / 100;
}
