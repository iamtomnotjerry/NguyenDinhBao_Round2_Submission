import { ApiErrorCode, apiError } from '@/lib/api/errors';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { card_token, amount } = body;

    if (!card_token) {
      return apiError(ApiErrorCode.MISSING_CARD_TOKEN, 400);
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
