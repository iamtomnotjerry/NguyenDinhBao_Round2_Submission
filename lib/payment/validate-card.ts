export type CardBrand = 'visa' | 'mastercard' | 'amex' | 'discover' | 'unknown';

export interface CardValidationResult {
  valid: boolean;
  errors: {
    number?: string;
    expiry?: string;
    cvv?: string;
  };
  brand: CardBrand;
  digits: string;
  last4: string;
  expMonth: number | null;
  expYear: number | null;
}

export function stripCardDigits(input: string): string {
  return (input || '').replace(/\D/g, '');
}

export function formatCardNumberDisplay(input: string): string {
  const digits = stripCardDigits(input).slice(0, 19);
  const brand = detectCardBrand(digits);
  if (brand === 'amex') {
    return digits.replace(/^(\d{0,4})(\d{0,6})(\d{0,5}).*$/, (_, a, b, c) =>
      [a, b, c].filter(Boolean).join(' '),
    );
  }
  return digits.replace(/(\d{4})(?=\d)/g, '$1 ').trim();
}

export function detectCardBrand(digits: string): CardBrand {
  if (/^4/.test(digits)) return 'visa';
  if (/^(5[1-5]|2[2-7])/.test(digits)) return 'mastercard';
  if (/^3[47]/.test(digits)) return 'amex';
  if (/^6(?:011|5)/.test(digits)) return 'discover';
  return 'unknown';
}

/** Luhn algorithm — returns true for valid PAN check digit */
export function luhnCheck(digits: string): boolean {
  if (!/^\d{12,19}$/.test(digits)) return false;
  let sum = 0;
  let alt = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let n = Number(digits[i]);
    if (alt) {
      n *= 2;
      if (n > 9) n -= 9;
    }
    sum += n;
    alt = !alt;
  }
  return sum % 10 === 0;
}

export function parseExpiry(expiry: string): { month: number; year: number } | null {
  const m = (expiry || '').trim().match(/^(\d{1,2})\s*\/\s*(\d{2}|\d{4})$/);
  if (!m) return null;
  const month = Number(m[1]);
  let year = Number(m[2]);
  if (year < 100) year += 2000;
  if (month < 1 || month > 12) return null;
  return { month, year };
}

export function isExpiryValid(month: number, year: number, now = new Date()): boolean {
  if (month < 1 || month > 12) return false;
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;
  if (year < currentYear) return false;
  if (year === currentYear && month < currentMonth) return false;
  return true;
}

export function validateCardInput(input: {
  cardNumber: string;
  expiry: string;
  cvv: string;
}): CardValidationResult {
  const digits = stripCardDigits(input.cardNumber);
  const brand = detectCardBrand(digits);
  const errors: CardValidationResult['errors'] = {};

  const expectedLen =
    brand === 'amex' ? 15 : brand === 'visa' || brand === 'mastercard' ? 16 : null;
  if (digits.length < 12) {
    errors.number = 'Card number is too short';
  } else if (expectedLen && digits.length !== expectedLen) {
    errors.number = `Expected ${expectedLen} digits for ${brand}`;
  } else if (!luhnCheck(digits)) {
    errors.number = 'Card number failed Luhn check (invalid Visa/Mastercard number)';
  }

  const exp = parseExpiry(input.expiry);
  if (!exp) {
    errors.expiry = 'Use MM/YY format';
  } else if (!isExpiryValid(exp.month, exp.year)) {
    errors.expiry = 'Card is expired';
  }

  const cvvDigits = stripCardDigits(input.cvv);
  const cvvLen = brand === 'amex' ? 4 : 3;
  if (cvvDigits.length !== cvvLen) {
    errors.cvv = `CVV must be ${cvvLen} digits`;
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
    brand,
    digits,
    last4: digits.slice(-4),
    expMonth: exp?.month ?? null,
    expYear: exp?.year ?? null,
  };
}

/** Sandbox test PANs that intentionally fail Luhn — allow for error simulation */
export const SANDBOX_TEST_CARDS: Record<
  string,
  { number: string; expiry: string; cvv: string; note: string }
> = {
  success: {
    number: '4111111111111111',
    expiry: '12/29',
    cvv: '123',
    note: 'Visa success (Luhn OK)',
  },
  expired: {
    number: '4111222233334001',
    expiry: '12/29',
    cvv: '123',
    note: 'Charge fails: expired (last4 4001)',
  },
  decline: {
    number: '4111222233334002',
    expiry: '12/29',
    cvv: '234',
    note: 'Charge fails: declined (last4 4002)',
  },
  timeout: {
    number: '4111222233334003',
    expiry: '12/29',
    cvv: '345',
    note: 'Charge fails: timeout (last4 4003)',
  },
};

/**
 * For sandbox charge-error cards we skip Luhn so demo flow still works,
 * but we still require length/expiry/cvv shape.
 */
export function validateCardForSandbox(input: {
  cardNumber: string;
  expiry: string;
  cvv: string;
}): CardValidationResult {
  const digits = stripCardDigits(input.cardNumber);
  const last4 = digits.slice(-4);
  const isChargeSim =
    last4 === '4001' ||
    last4 === '4002' ||
    last4 === '4003' ||
    last4 === '9999' ||
    last4 === '1111';

  // Sandbox sim PANs: enforce shape only (length / expiry / CVV), skip Luhn & brand length quirks
  if (isChargeSim && digits.length >= 15) {
    const errors: CardValidationResult['errors'] = {};
    const exp = parseExpiry(input.expiry);
    if (!exp) errors.expiry = 'Use MM/YY format';
    else if (!isExpiryValid(exp.month, exp.year)) errors.expiry = 'Card is expired';

    const cvvDigits = stripCardDigits(input.cvv);
    if (cvvDigits.length < 3 || cvvDigits.length > 4) {
      errors.cvv = 'CVV must be 3–4 digits';
    }

    return {
      valid: Object.keys(errors).length === 0,
      errors,
      brand: detectCardBrand(digits),
      digits,
      last4,
      expMonth: exp?.month ?? null,
      expYear: exp?.year ?? null,
    };
  }

  return validateCardInput(input);
}
