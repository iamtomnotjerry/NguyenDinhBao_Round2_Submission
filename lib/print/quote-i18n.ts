import type { Dictionary } from '@/lib/i18n/types';
import type { PageSelectionErrorCode } from '@/lib/print/page-selection';
import type { PrintQuote } from '@/lib/print/pricing';

function fill(template: string, params?: Record<string, string | number>) {
  if (!params) return template;
  return Object.entries(params).reduce(
    (acc, [k, v]) => acc.replaceAll(`{${k}}`, String(v)),
    template,
  );
}

export function localizePageSelectionError(
  code: PageSelectionErrorCode | 'page_none_selected' | string | null | undefined,
  t: Dictionary,
  params?: Record<string, string | number>,
): string | null {
  if (!code) return null;
  const map: Record<string, string> = {
    page_empty: t.errors.pageEmpty,
    page_no_doc: t.errors.pageNoDoc,
    page_out_of_range: t.errors.pageOutOfRange,
    page_invalid_range: t.errors.pageInvalidRange,
    page_range_bounds: t.errors.pageRangeBounds,
    page_none: t.errors.pageNone,
    page_none_selected: t.errors.pageNoneSelected,
  };
  const template = map[code];
  if (template) return fill(template, params);
  return code;
}

export function localizeQuoteError(quote: PrintQuote, t: Dictionary): string | null {
  return localizePageSelectionError(quote.error, t, quote.errorParams);
}
