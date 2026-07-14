import { cn, safeNextPath } from '@/lib/utils';

describe('safeNextPath', () => {
  it('accepts same-site relative paths', () => {
    expect(safeNextPath('/print')).toBe('/print');
    expect(safeNextPath('/store?tab=cart')).toBe('/store?tab=cart');
  });

  it('rejects absolute URLs and protocol-relative redirects', () => {
    expect(safeNextPath('https://evil.example')).toBe('/dashboard');
    expect(safeNextPath('//evil.example')).toBe('/dashboard');
    expect(safeNextPath('/\\evil.example')).toBe('/dashboard');
  });

  it('rejects empty / missing values', () => {
    expect(safeNextPath(null)).toBe('/dashboard');
    expect(safeNextPath(undefined)).toBe('/dashboard');
    expect(safeNextPath('')).toBe('/dashboard');
    expect(safeNextPath('print')).toBe('/dashboard');
  });

  it('supports a custom fallback', () => {
    expect(safeNextPath(null, '/')).toBe('/');
  });
});

describe('cn', () => {
  it('merges conditional classes and resolves Tailwind conflicts', () => {
    expect(cn('p-2', false && 'hidden', 'p-4')).toBe('p-4');
    expect(cn('text-red-500', undefined, 'font-bold')).toBe('text-red-500 font-bold');
  });
});
