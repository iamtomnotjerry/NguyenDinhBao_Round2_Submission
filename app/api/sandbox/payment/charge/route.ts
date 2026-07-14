import { ApiErrorCode, apiError } from '@/lib/api/errors';
import { checkRateLimit, getClientIp } from '@/lib/api/rate-limit';

/** Per caller (IP, else token) — protects the 10s timeout branch from being held open en masse. */
const CHARGE_RATE_LIMIT = { limit: 30, windowMs: 60_000 };

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { card_token, amount } = body;

    if (!card_token) {
      return apiError(ApiErrorCode.MISSING_CARD_TOKEN, 400);
    }

    // Internal server-to-server calls carry no client IP — fall back to token key
    const rateKey = getClientIp(request) ?? `tok:${card_token}`;
    const rate = checkRateLimit(`charge:${rateKey}`, CHARGE_RATE_LIMIT);
    if (!rate.ok) {
      return apiError(ApiErrorCode.RATE_LIMITED, 429, undefined, {
        'Retry-After': String(rate.retryAfterSeconds),
      });
    }

    // Extract last 4 digits from token format: tok_last4_randomstring
    const tokenParts = card_token.split('_');
    const last4 = tokenParts[1] || '0000';

    if (last4 === '4001') {
      return apiError(ApiErrorCode.CARD_EXPIRED, 400);
    }
    if (last4 === '4002') {
      return apiError(ApiErrorCode.CARD_DECLINED, 400);
    }
    if (last4 === '4003') {
      await new Promise((resolve) => setTimeout(resolve, 10000));
      return apiError(ApiErrorCode.PAYMENT_TIMEOUT, 504);
    }

    return Response.json({
      success: true,
      message: 'PAYMENT_OK',
      transaction_id: `tx_${Math.random().toString(36).substring(2, 12)}`,
      amount,
    });
  } catch (error) {
    return apiError(ApiErrorCode.INTERNAL, 500, {
      details: error instanceof Error ? error.message : String(error),
    });
  }
}
