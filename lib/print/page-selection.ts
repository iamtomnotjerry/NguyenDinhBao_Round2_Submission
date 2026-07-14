/**
 * Windows-style page range parser: "1", "1-5", "2,4,6", "1,3,5-10"
 * Errors are stable codes — localize via `localizePageSelectionError`.
 */

export type PageSelectionMode = 'all' | 'current' | 'custom';

export type PageSelectionErrorCode =
  | 'page_empty'
  | 'page_no_doc'
  | 'page_out_of_range'
  | 'page_invalid_range'
  | 'page_range_bounds'
  | 'page_none';

export function parsePageSelection(
  input: string,
  totalPages: number,
): {
  pages: number[];
  error: PageSelectionErrorCode | null;
  errorParams?: Record<string, string | number>;
} {
  const trimmed = input.trim();
  if (!trimmed) {
    return { pages: [], error: 'page_empty' };
  }
  if (totalPages < 1) {
    return { pages: [], error: 'page_no_doc' };
  }

  const pages = new Set<number>();
  const parts = trimmed.split(',');

  for (const rawPart of parts) {
    const part = rawPart.trim();
    if (!part) continue;

    if (/^\d+$/.test(part)) {
      const n = Number(part);
      if (n < 1 || n > totalPages) {
        return {
          pages: [],
          error: 'page_out_of_range',
          errorParams: { n, total: totalPages },
        };
      }
      pages.add(n);
      continue;
    }

    const range = part.match(/^(\d+)\s*-\s*(\d+)$/);
    if (!range) {
      return {
        pages: [],
        error: 'page_invalid_range',
        errorParams: { part },
      };
    }

    let start = Number(range[1]);
    let end = Number(range[2]);
    if (start > end) [start, end] = [end, start];
    if (start < 1 || end > totalPages) {
      return {
        pages: [],
        error: 'page_range_bounds',
        errorParams: { start, end, total: totalPages },
      };
    }
    for (let i = start; i <= end; i++) pages.add(i);
  }

  if (pages.size === 0) {
    return { pages: [], error: 'page_none' };
  }

  return { pages: Array.from(pages).sort((a, b) => a - b), error: null };
}

export function resolveSelectedPages(options: {
  mode: PageSelectionMode;
  customRange: string;
  currentPage: number;
  totalPages: number;
}): {
  pages: number[];
  error: PageSelectionErrorCode | null;
  errorParams?: Record<string, string | number>;
  label: string;
} {
  const { mode, customRange, currentPage, totalPages } = options;

  if (mode === 'all') {
    const pages = Array.from({ length: totalPages }, (_, i) => i + 1);
    return { pages, error: null, label: 'all' };
  }

  if (mode === 'current') {
    const page = Math.min(Math.max(1, currentPage), Math.max(1, totalPages));
    return { pages: [page], error: null, label: String(page) };
  }

  const parsed = parsePageSelection(customRange, totalPages);
  return {
    pages: parsed.pages,
    error: parsed.error,
    errorParams: parsed.errorParams,
    label: customRange.trim() || 'custom',
  };
}

/** Parse mixed-color page list the same way as custom page ranges. */
export function parseColorPages(
  input: string,
  totalPages: number,
): {
  pages: number[];
  error: PageSelectionErrorCode | null;
  errorParams?: Record<string, string | number>;
} {
  if (!input.trim()) return { pages: [], error: null };
  return parsePageSelection(input, totalPages);
}
