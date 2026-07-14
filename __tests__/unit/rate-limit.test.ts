import { checkRateLimit, getClientIp, _resetRateLimiterForTests } from '@/lib/api/rate-limit';

const OPTS = { limit: 3, windowMs: 60_000 };

describe('checkRateLimit', () => {
  let nowSpy: jest.SpyInstance<number, []>;
  let now = 1_000_000;

  beforeEach(() => {
    _resetRateLimiterForTests();
    now = 1_000_000;
    nowSpy = jest.spyOn(Date, 'now').mockImplementation(() => now);
  });

  afterEach(() => {
    nowSpy.mockRestore();
  });

  it('allows up to `limit` requests inside the window', () => {
    expect(checkRateLimit('k', OPTS).ok).toBe(true);
    expect(checkRateLimit('k', OPTS).ok).toBe(true);
    expect(checkRateLimit('k', OPTS).ok).toBe(true);
  });

  it('blocks the request over the limit with a sane Retry-After', () => {
    checkRateLimit('k', OPTS);
    checkRateLimit('k', OPTS);
    checkRateLimit('k', OPTS);

    const blocked = checkRateLimit('k', OPTS);
    expect(blocked.ok).toBe(false);
    if (!blocked.ok) {
      expect(blocked.retryAfterSeconds).toBeGreaterThanOrEqual(1);
      expect(blocked.retryAfterSeconds).toBeLessThanOrEqual(60);
    }
  });

  it('slides the window: old requests expire', () => {
    checkRateLimit('k', OPTS);
    checkRateLimit('k', OPTS);
    checkRateLimit('k', OPTS);
    expect(checkRateLimit('k', OPTS).ok).toBe(false);

    now += 61_000;
    expect(checkRateLimit('k', OPTS).ok).toBe(true);
  });

  it('isolates keys from each other', () => {
    checkRateLimit('a', OPTS);
    checkRateLimit('a', OPTS);
    checkRateLimit('a', OPTS);
    expect(checkRateLimit('a', OPTS).ok).toBe(false);
    expect(checkRateLimit('b', OPTS).ok).toBe(true);
  });
});

describe('getClientIp', () => {
  it('prefers the first x-forwarded-for hop', () => {
    const req = new Request('http://x', {
      headers: { 'x-forwarded-for': '1.2.3.4, 10.0.0.1' },
    });
    expect(getClientIp(req)).toBe('1.2.3.4');
  });

  it('falls back to x-real-ip', () => {
    const req = new Request('http://x', { headers: { 'x-real-ip': '5.6.7.8' } });
    expect(getClientIp(req)).toBe('5.6.7.8');
  });

  it('returns null when no proxy headers exist (internal fetch)', () => {
    expect(getClientIp(new Request('http://x'))).toBeNull();
  });
});
