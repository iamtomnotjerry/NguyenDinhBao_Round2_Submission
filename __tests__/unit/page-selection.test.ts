import {
  parsePageSelection,
  resolveSelectedPages,
  parseColorPages,
} from '@/lib/print/page-selection';

describe('parsePageSelection', () => {
  it('parses single pages, lists and ranges (Windows style)', () => {
    expect(parsePageSelection('1', 10).pages).toEqual([1]);
    expect(parsePageSelection('1-5', 10).pages).toEqual([1, 2, 3, 4, 5]);
    expect(parsePageSelection('2,4,6', 10).pages).toEqual([2, 4, 6]);
    expect(parsePageSelection('1,3,5-8', 10).pages).toEqual([1, 3, 5, 6, 7, 8]);
  });

  it('dedupes overlapping ranges and sorts ascending', () => {
    expect(parsePageSelection('3-5,4,1', 10).pages).toEqual([1, 3, 4, 5]);
  });

  it('normalizes reversed ranges', () => {
    expect(parsePageSelection('5-2', 10).pages).toEqual([2, 3, 4, 5]);
  });

  it('rejects out-of-range pages with interpolation params', () => {
    const result = parsePageSelection('99', 10);
    expect(result.error).toBe('page_out_of_range');
    expect(result.errorParams).toEqual({ n: 99, total: 10 });
  });

  it('rejects range exceeding document bounds', () => {
    expect(parsePageSelection('8-12', 10).error).toBe('page_range_bounds');
  });

  it('rejects malformed parts', () => {
    const result = parsePageSelection('abc', 10);
    expect(result.error).toBe('page_invalid_range');
    expect(result.errorParams).toEqual({ part: 'abc' });
  });

  it('rejects empty input and empty documents', () => {
    expect(parsePageSelection('   ', 10).error).toBe('page_empty');
    expect(parsePageSelection('1', 0).error).toBe('page_no_doc');
  });

  it('returns page_none when input contains only separators', () => {
    expect(parsePageSelection(',,,', 10).error).toBe('page_none');
  });
});

describe('resolveSelectedPages', () => {
  it('mode all returns every page', () => {
    const result = resolveSelectedPages({
      mode: 'all',
      customRange: '',
      currentPage: 1,
      totalPages: 4,
    });
    expect(result.pages).toEqual([1, 2, 3, 4]);
    expect(result.label).toBe('all');
  });

  it('mode current clamps into [1, totalPages]', () => {
    const clampedHigh = resolveSelectedPages({
      mode: 'current',
      customRange: '',
      currentPage: 42,
      totalPages: 5,
    });
    expect(clampedHigh.pages).toEqual([5]);

    const clampedLow = resolveSelectedPages({
      mode: 'current',
      customRange: '',
      currentPage: 0,
      totalPages: 5,
    });
    expect(clampedLow.pages).toEqual([1]);
  });

  it('mode custom delegates to the parser', () => {
    const result = resolveSelectedPages({
      mode: 'custom',
      customRange: '2-3',
      currentPage: 1,
      totalPages: 5,
    });
    expect(result.pages).toEqual([2, 3]);
    expect(result.label).toBe('2-3');
  });
});

describe('parseColorPages', () => {
  it('empty input means "no color pages" — not an error', () => {
    expect(parseColorPages('', 10)).toEqual({ pages: [], error: null });
  });

  it('validates non-empty input like a page selection', () => {
    expect(parseColorPages('1-2', 10).pages).toEqual([1, 2]);
    expect(parseColorPages('99', 10).error).toBe('page_out_of_range');
  });
});
