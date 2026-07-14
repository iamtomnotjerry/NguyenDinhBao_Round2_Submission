import { sanitizeText, sanitizeRichText } from '@/lib/sanitize';

describe('sanitizeText', () => {
  it('strips script blocks including their content', () => {
    expect(sanitizeText('hi<script>alert(1)</script>there')).toBe('hithere');
  });

  it('strips style blocks including their content', () => {
    expect(sanitizeText('a<style>body{display:none}</style>b')).toBe('ab');
  });

  it('strips remaining HTML tags but keeps text', () => {
    expect(sanitizeText('<b>bold</b> and <img src=x onerror=alert(1)>')).toBe('bold and ');
  });

  it('removes null bytes', () => {
    expect(sanitizeText('a\u0000b')).toBe('ab');
  });

  it('coerces non-string input safely', () => {
    expect(sanitizeText(123 as unknown as string)).toBe('123');
  });

  it('keeps markdown markers as plain text', () => {
    expect(sanitizeText('**bold** and *italic*')).toBe('**bold** and *italic*');
  });
});

describe('sanitizeRichText', () => {
  it('behaves like sanitizeText (documented alias)', () => {
    expect(sanitizeRichText('<i>x</i>**y**')).toBe('x**y**');
  });
});
