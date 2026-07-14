import type { Dictionary } from '@/lib/i18n/types';
import { ApiErrorCode } from '@/lib/api/errors';

const CODE_TO_KEY: Record<string, keyof Dictionary['errors']> = {
  [ApiErrorCode.UNAUTHORIZED]: 'unauthorized',
  [ApiErrorCode.MISSING_SERVICE_ROLE]: 'missingServiceRole',
  [ApiErrorCode.MISSING_ORDER_FIELDS]: 'missingOrderFields',
  [ApiErrorCode.INVALID_CART]: 'invalidCart',
  [ApiErrorCode.IDEMPOTENCY_FAILED]: 'idempotencyFailed',
  [ApiErrorCode.IDEMPOTENCY_PENDING]: 'idempotencyPending',
  [ApiErrorCode.ORDER_CREATE_FAILED]: 'orderCreateFailed',
  [ApiErrorCode.ORDER_FETCH_FAILED]: 'orderFetchFailed',
  [ApiErrorCode.PAYMENT_FAILED]: 'paymentFailed',
  [ApiErrorCode.PAYMENT_MARK_FAILED]: 'paymentMarkFailed',
  [ApiErrorCode.INTERNAL]: 'internal',
  [ApiErrorCode.MISSING_DELIVERY_ADDRESS]: 'missingDeliveryAddress',
  [ApiErrorCode.PRINT_CREATE_FAILED]: 'printCreateFailed',
  [ApiErrorCode.PRINT_MISSING_FIELDS]: 'printMissingFields',
  [ApiErrorCode.PRINT_IDEMPOTENCY_FAILED]: 'printIdempotencyFailed',
  [ApiErrorCode.CARD_EXPIRED]: 'cardExpiredCharge',
  [ApiErrorCode.CARD_DECLINED]: 'cardDeclined',
  [ApiErrorCode.PAYMENT_TIMEOUT]: 'paymentTimeout',
  [ApiErrorCode.MISSING_CARD_TOKEN]: 'missingCardToken',
  [ApiErrorCode.CHAT_EMPTY]: 'chatEmpty',
  [ApiErrorCode.CHAT_FORBIDDEN]: 'chatForbidden',
  [ApiErrorCode.TOKEN_FIELDS_MISSING]: 'tokenFieldsMissing',
  [ApiErrorCode.RATE_LIMITED]: 'rateLimited',
  CARD_INVALID: 'cardInvalid',
};

export function localizeApiError(
  data: { error?: string; code?: string } | string | null | undefined,
  t: Dictionary,
  fallback?: string,
): string {
  const raw = typeof data === 'string' ? data : data?.code || data?.error;
  if (!raw) return fallback || t.errors.generic;

  const key = CODE_TO_KEY[raw];
  if (key && t.errors[key]) return t.errors[key];

  // Legacy prose / DB message — show only if not a SCREAMING_SNAKE code
  if (!/^[A-Z][A-Z0-9_]+$/.test(raw)) return raw;

  return fallback || t.errors.generic;
}
