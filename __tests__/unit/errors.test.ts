import { ApiErrorCode, apiError, passThroughChargeError } from '@/lib/api/errors';

describe('apiError', () => {
  it('returns stable { error, code } JSON with the given status', async () => {
    const res = apiError(ApiErrorCode.UNAUTHORIZED, 401);
    expect(res.status).toBe(401);
    await expect(res.json()).resolves.toEqual({
      error: 'UNAUTHORIZED',
      code: 'UNAUTHORIZED',
    });
  });

  it('merges extra payload fields', async () => {
    const res = apiError(ApiErrorCode.IDEMPOTENCY_PENDING, 202, { order_id: 'abc' });
    await expect(res.json()).resolves.toMatchObject({
      code: 'IDEMPOTENCY_PENDING',
      order_id: 'abc',
    });
  });

  it('supports response headers (Retry-After for 429)', () => {
    const res = apiError(ApiErrorCode.RATE_LIMITED, 429, undefined, { 'Retry-After': '17' });
    expect(res.status).toBe(429);
    expect(res.headers.get('Retry-After')).toBe('17');
  });
});

describe('passThroughChargeError', () => {
  it('passes through known sandbox charge codes', () => {
    expect(passThroughChargeError('CARD_DECLINED')).toBe('CARD_DECLINED');
    expect(passThroughChargeError('CARD_EXPIRED')).toBe('CARD_EXPIRED');
    expect(passThroughChargeError('PAYMENT_TIMEOUT')).toBe('PAYMENT_TIMEOUT');
  });

  it('falls back to PAYMENT_FAILED for unknown or prose errors', () => {
    expect(passThroughChargeError('some db error')).toBe('PAYMENT_FAILED');
    expect(passThroughChargeError(undefined)).toBe('PAYMENT_FAILED');
    expect(passThroughChargeError('')).toBe('PAYMENT_FAILED');
  });

  it('respects a custom fallback', () => {
    expect(passThroughChargeError(null, ApiErrorCode.INTERNAL)).toBe('INTERNAL');
  });
});
