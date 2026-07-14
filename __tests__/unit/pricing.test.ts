import { buildPrintQuote, calculatePrintCost } from '@/lib/print/pricing';
import { DEFAULT_PRINT_CONFIG, type PrintConfig } from '@/lib/print/types';

const base = (overrides: Partial<PrintConfig> = {}): PrintConfig => ({
  ...DEFAULT_PRINT_CONFIG,
  ...overrides,
});

describe('buildPrintQuote', () => {
  it('bills B&W A4 simplex at $0.10 per impression + 8% tax', () => {
    const quote = buildPrintQuote(base(), 10, 1);
    expect(quote.error).toBeNull();
    expect(quote.selectedPageCount).toBe(10);
    expect(quote.bwPageCount).toBe(10);
    expect(quote.colorPageCount).toBe(0);
    expect(quote.subtotal).toBe(1.0);
    expect(quote.tax).toBe(0.08);
    expect(quote.total).toBe(1.08);
  });

  it('bills full color at $0.50 per impression', () => {
    const quote = buildPrintQuote(base({ colorMode: 'color' }), 10, 1);
    expect(quote.colorPageCount).toBe(10);
    expect(quote.subtotal).toBe(5.0);
    expect(quote.total).toBe(5.4);
  });

  it('splits mixed mode into color and B&W buckets', () => {
    const quote = buildPrintQuote(base({ colorMode: 'mixed', colorPagesInput: '1-3' }), 10, 1);
    expect(quote.colorPageCount).toBe(3);
    expect(quote.bwPageCount).toBe(7);
    // 3×0.5 + 7×0.1 = 2.20 → tax 0.18 → 2.38
    expect(quote.subtotal).toBe(2.2);
    expect(quote.total).toBe(2.38);
  });

  it('propagates invalid mixed-color page input as a stable error code', () => {
    const quote = buildPrintQuote(base({ colorMode: 'mixed', colorPagesInput: '99' }), 10, 1);
    expect(quote.error).toBe('page_out_of_range');
    expect(quote.total).toBe(0);
  });

  it('applies paper size multiplier (A3 = 1.9×)', () => {
    const quote = buildPrintQuote(base({ paperSize: 'a3' }), 10, 1);
    expect(quote.subtotal).toBe(1.9);
  });

  it('multiplies impressions by copies', () => {
    const quote = buildPrintQuote(base({ copies: 3 }), 10, 1);
    expect(quote.impressions).toBe(30);
    expect(quote.subtotal).toBe(3.0);
  });

  it('halves billable sheets for duplex printing', () => {
    const simplex = buildPrintQuote(base(), 10, 1);
    const duplex = buildPrintQuote(base({ duplex: 'long_edge' }), 10, 1);
    expect(simplex.billableSheets).toBe(10);
    expect(duplex.billableSheets).toBe(5);
    // Impressions (and price) unchanged: paper saved, sides still printed
    expect(duplex.subtotal).toBe(simplex.subtotal);
  });

  it('adds flat binding fee', () => {
    const quote = buildPrintQuote(base({ binding: 'spiral' }), 10, 1);
    expect(quote.subtotal).toBe(1.0 + 3.5);
  });

  it('prices finishes per billable sheet', () => {
    const quote = buildPrintQuote(base({ finishes: ['lamination_gloss'] }), 10, 1);
    // 10×0.1 + 10 sheets × 0.35 = 4.50
    expect(quote.subtotal).toBe(4.5);
  });

  it('adds shipping only for delivery', () => {
    const pickup = buildPrintQuote(base(), 10, 1);
    const delivery = buildPrintQuote(base({ deliveryType: 'delivery' }), 10, 1);
    expect(pickup.shippingFee).toBe(0);
    // 2.5 base + 10 sheets × 0.05 = 3.00
    expect(delivery.shippingFee).toBe(3.0);
  });

  it('supports page mode current and custom ranges', () => {
    const current = buildPrintQuote(base({ pageMode: 'current' }), 10, 4);
    expect(current.selectedPages).toEqual([4]);

    const custom = buildPrintQuote(base({ pageMode: 'custom', customPages: '2-4,7' }), 10, 1);
    expect(custom.selectedPages).toEqual([2, 3, 4, 7]);
  });

  it('returns page_empty for blank custom selection', () => {
    const quote = buildPrintQuote(base({ pageMode: 'custom', customPages: '  ' }), 10, 1);
    expect(quote.error).toBe('page_empty');
  });

  it('can disable tax for legacy callers', () => {
    const quote = buildPrintQuote(base(), 10, 1, { taxEnabled: false });
    expect(quote.tax).toBe(0);
    expect(quote.total).toBe(quote.subtotal);
  });
});

describe('calculatePrintCost (back-compat)', () => {
  it('matches buildPrintQuote total for the same inputs', () => {
    const legacy = calculatePrintCost(10, 2, 'bw', 'stapled');
    const quote = buildPrintQuote(base({ copies: 2, binding: 'stapled' }), 10, 1);
    expect(legacy).toBe(quote.total);
  });
});
