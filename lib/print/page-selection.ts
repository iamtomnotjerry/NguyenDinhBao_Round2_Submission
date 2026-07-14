/**
 * Windows-style page range parser: "1", "1-5", "2,4,6", "1,3,5-10"
 */

export type PageSelectionMode = 'all' | 'current' | 'custom';

export function parsePageSelection(
  input: string,
  totalPages: number,
): { pages: number[]; error: string | null } {
  const trimmed = input.trim();
  if (!trimmed) {
    return { pages: [], error: 'Page selection is empty' };
  }
  if (totalPages < 1) {
    return { pages: [], error: 'Document has no pages' };
  }

  const pages = new Set<number>();
  const parts = trimmed.split(',');

  for (const rawPart of parts) {
    const part = rawPart.trim();
    if (!part) continue;

    if (/^\d+$/.test(part)) {
      const n = Number(part);
      if (n < 1 || n > totalPages) {
        return { pages: [], error: `Page ${n} is out of range (1–${totalPages})` };
      }
      pages.add(n);
      continue;
    }

    const range = part.match(/^(\d+)\s*-\s*(\d+)$/);
    if (!range) {
      return { pages: [], error: `Invalid page range: "${part}"` };
    }

    let start = Number(range[1]);
    let end = Number(range[2]);
    if (start > end) [start, end] = [end, start];
    if (start < 1 || end > totalPages) {
      return { pages: [], error: `Range ${start}-${end} is out of range (1–${totalPages})` };
    }
    for (let i = start; i <= end; i++) pages.add(i);
  }

  if (pages.size === 0) {
    return { pages: [], error: 'No valid pages selected' };
  }

  return { pages: Array.from(pages).sort((a, b) => a - b), error: null };
}

export function resolveSelectedPages(options: {
  mode: PageSelectionMode;
  customRange: string;
  currentPage: number;
  totalPages: number;
}): { pages: number[]; error: string | null; label: string } {
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
    label: customRange.trim() || 'custom',
  };
}

/** Parse mixed-color page list the same way as custom page ranges. */
export function parseColorPages(
  input: string,
  totalPages: number,
): { pages: number[]; error: string | null } {
  if (!input.trim()) return { pages: [], error: null };
  return parsePageSelection(input, totalPages);
}
