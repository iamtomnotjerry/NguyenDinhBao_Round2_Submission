export type PaperSize = 'a4' | 'a3' | 'a5' | 'letter' | 'legal' | 'tabloid' | 'b5' | 'custom';

export type ColorMode = 'color' | 'bw' | 'mixed';
export type DuplexMode = 'simplex' | 'long_edge' | 'short_edge';
export type Orientation = 'portrait' | 'landscape' | 'auto';
export type ScaleMode = 'fit' | 'actual' | 'percent';
export type BindingType = 'none' | 'stapled' | 'spiral' | 'glue' | 'hardcover';

export type FinishOption =
  'lamination_gloss' | 'lamination_matte' | 'folding' | 'hole_punch' | 'corner_cut';

export type DeliveryType = 'pickup' | 'delivery';

export type PrintJobStatus =
  | 'awaiting_payment'
  | 'paid'
  | 'queued'
  | 'rendering'
  | 'printing'
  | 'finishing'
  | 'quality_check'
  | 'packing'
  | 'shipping'
  | 'ready_for_pickup'
  | 'completed'
  | 'failed'
  | 'pending'; // legacy

export interface PrintConfig {
  colorMode: ColorMode;
  /** Pages printed in color when colorMode === 'mixed' */
  colorPagesInput: string;
  copies: number;
  paperSize: PaperSize;
  customWidthMm?: number;
  customHeightMm?: number;
  binding: BindingType;
  finishes: FinishOption[];
  duplex: DuplexMode;
  orientation: Orientation;
  scaleMode: ScaleMode;
  scalePercent: number;
  pagesPerSheet: 1 | 2 | 4;
  reverseOrder: boolean;
  collate: boolean;
  pageMode: 'all' | 'current' | 'custom';
  customPages: string;
  deliveryType: DeliveryType;
  printerLocation: string;
  deliveryAddress: string;
}

export const DEFAULT_PRINT_CONFIG: PrintConfig = {
  colorMode: 'bw',
  colorPagesInput: '',
  copies: 1,
  paperSize: 'a4',
  binding: 'none',
  finishes: [],
  duplex: 'simplex',
  orientation: 'auto',
  scaleMode: 'fit',
  scalePercent: 100,
  pagesPerSheet: 1,
  reverseOrder: false,
  collate: true,
  pageMode: 'all',
  customPages: '',
  deliveryType: 'pickup',
  printerLocation: 'Cửa hàng A - Quận 1, TPHCM',
  deliveryAddress: '',
};

export const PAPER_SIZE_LABELS: Record<PaperSize, string> = {
  a4: 'A4',
  a3: 'A3',
  a5: 'A5',
  letter: 'Letter',
  legal: 'Legal',
  tabloid: 'Tabloid',
  b5: 'B5',
  custom: 'Custom',
};

/** Approximate sheet area multiplier vs A4 for pricing */
export const PAPER_SIZE_MULTIPLIER: Record<PaperSize, number> = {
  a5: 0.7,
  b5: 0.85,
  a4: 1,
  letter: 1.02,
  legal: 1.2,
  a3: 1.9,
  tabloid: 2.0,
  custom: 1.15,
};
