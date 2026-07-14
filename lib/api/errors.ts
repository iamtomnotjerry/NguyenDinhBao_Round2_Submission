import { NextResponse } from 'next/server';

/** Stable machine codes — map to UI copy via `localizeApiError`. */
export const ApiErrorCode = {
  UNAUTHORIZED: 'UNAUTHORIZED',
  MISSING_SERVICE_ROLE: 'MISSING_SERVICE_ROLE',
  MISSING_ORDER_FIELDS: 'MISSING_ORDER_FIELDS',
  INVALID_CART: 'INVALID_CART',
  IDEMPOTENCY_FAILED: 'IDEMPOTENCY_FAILED',
  IDEMPOTENCY_PENDING: 'IDEMPOTENCY_PENDING',
  ORDER_CREATE_FAILED: 'ORDER_CREATE_FAILED',
  ORDER_FETCH_FAILED: 'ORDER_FETCH_FAILED',
  PAYMENT_FAILED: 'PAYMENT_FAILED',
  PAYMENT_MARK_FAILED: 'PAYMENT_MARK_FAILED',
  INTERNAL: 'INTERNAL',
  MISSING_DELIVERY_ADDRESS: 'MISSING_DELIVERY_ADDRESS',
  PRINT_CREATE_FAILED: 'PRINT_CREATE_FAILED',
  PRINT_MISSING_FIELDS: 'PRINT_MISSING_FIELDS',
  PRINT_IDEMPOTENCY_FAILED: 'PRINT_IDEMPOTENCY_FAILED',
  CARD_EXPIRED: 'CARD_EXPIRED',
  CARD_DECLINED: 'CARD_DECLINED',
  PAYMENT_TIMEOUT: 'PAYMENT_TIMEOUT',
  MISSING_CARD_TOKEN: 'MISSING_CARD_TOKEN',
  CHAT_EMPTY: 'CHAT_EMPTY',
  CHAT_FORBIDDEN: 'CHAT_FORBIDDEN',
  TOKEN_FIELDS_MISSING: 'TOKEN_FIELDS_MISSING',
  RATE_LIMITED: 'RATE_LIMITED',
} as const;

export type ApiErrorCodeValue = (typeof ApiErrorCode)[keyof typeof ApiErrorCode];

export function apiError(
  code: ApiErrorCodeValue | string,
  status: number,
  extra?: Record<string, unknown>,
  headers?: HeadersInit,
) {
  return NextResponse.json({ error: code, code, ...extra }, { status, headers });
}

/** Prefer charge sandbox codes when nested in another API response. */
export function passThroughChargeError(
  chargeError: unknown,
  fallback: ApiErrorCodeValue = ApiErrorCode.PAYMENT_FAILED,
): string {
  if (typeof chargeError === 'string' && chargeError.length > 0) {
    const known = Object.values(ApiErrorCode) as string[];
    if (known.includes(chargeError)) return chargeError;
  }
  return fallback;
}
