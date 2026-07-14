import type { Dictionary } from '@/lib/i18n/types';
import { localizeCardErrors, type CardValidationResult } from '@/lib/payment/validate-card';

export function cardErrorDict(t: Dictionary) {
  return {
    tooShort: t.errors.cardTooShort,
    expectedLen: t.errors.cardExpectedLen,
    luhn: t.errors.cardLuhn,
    expiryFormat: t.errors.cardExpiryFormat,
    expired: t.errors.cardExpired,
    cvvLen: t.errors.cardCvvLen,
    cvvRange: t.errors.cardCvvRange,
  };
}

export function localizedCardFieldErrors(result: CardValidationResult, t: Dictionary) {
  return localizeCardErrors(result, cardErrorDict(t));
}

export function firstLocalizedCardError(result: CardValidationResult, t: Dictionary): string {
  const e = localizedCardFieldErrors(result, t);
  return e.number || e.expiry || e.cvv || t.errors.cardInvalid;
}

/** Map tokenize API `{ error: 'CARD_INVALID', errors }` (or plain string) to locale. */
export function localizeTokenizeApiError(
  data: {
    error?: string;
    errors?: CardValidationResult['errors'];
    errorParams?: CardValidationResult['errorParams'];
  } | null,
  t: Dictionary,
): string {
  if (data?.errors) {
    const e = localizeCardErrors(
      {
        valid: false,
        errors: data.errors,
        errorParams: data.errorParams,
        brand: 'unknown',
        digits: '',
        last4: '',
        expMonth: null,
        expYear: null,
      },
      cardErrorDict(t),
    );
    return e.number || e.expiry || e.cvv || t.errors.cardInvalid;
  }
  if (data?.error === 'CARD_INVALID') return t.errors.cardInvalid;
  return data?.error && data.error !== 'CARD_INVALID' ? data.error : t.errors.tokenizeFail;
}
