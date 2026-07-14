import {
  detectCardBrand,
  formatCardNumberDisplay,
  isExpiryValid,
  luhnCheck,
  parseExpiry,
  stripCardDigits,
  validateCardForSandbox,
  validateCardInput,
  SANDBOX_TEST_CARDS,
} from '@/lib/payment/validate-card';

const FUTURE_EXPIRY = '12/99';

describe('stripCardDigits / formatCardNumberDisplay', () => {
  it('strips everything but digits', () => {
    expect(stripCardDigits('4111 1111-1111.1111')).toBe('4111111111111111');
  });

  it('groups 4-4-4-4 for visa and 4-6-5 for amex', () => {
    expect(formatCardNumberDisplay('4111111111111111')).toBe('4111 1111 1111 1111');
    expect(formatCardNumberDisplay('378282246310005')).toBe('3782 822463 10005');
  });
});

describe('detectCardBrand', () => {
  it.each([
    ['4111111111111111', 'visa'],
    ['5555555555554444', 'mastercard'],
    ['2221000000000009', 'mastercard'],
    ['378282246310005', 'amex'],
    ['6011111111111117', 'discover'],
    ['9999999999999999', 'unknown'],
  ])('%s → %s', (digits, brand) => {
    expect(detectCardBrand(digits)).toBe(brand);
  });
});

describe('luhnCheck', () => {
  it('accepts valid PANs', () => {
    expect(luhnCheck('4111111111111111')).toBe(true);
    expect(luhnCheck('378282246310005')).toBe(true);
  });

  it('rejects invalid check digits and malformed input', () => {
    expect(luhnCheck('4111111111111112')).toBe(false);
    expect(luhnCheck('1234')).toBe(false);
    expect(luhnCheck('')).toBe(false);
  });
});

describe('parseExpiry / isExpiryValid', () => {
  it('parses MM/YY and MM/YYYY', () => {
    expect(parseExpiry('12/29')).toEqual({ month: 12, year: 2029 });
    expect(parseExpiry('01/2031')).toEqual({ month: 1, year: 2031 });
  });

  it('rejects malformed or impossible months', () => {
    expect(parseExpiry('13/29')).toBeNull();
    expect(parseExpiry('12-29')).toBeNull();
    expect(parseExpiry('')).toBeNull();
  });

  it('treats the current month as still valid (deterministic clock)', () => {
    const now = new Date(2030, 5, 15); // Jun 2030
    expect(isExpiryValid(6, 2030, now)).toBe(true);
    expect(isExpiryValid(5, 2030, now)).toBe(false);
    expect(isExpiryValid(1, 2031, now)).toBe(true);
    expect(isExpiryValid(12, 2029, now)).toBe(false);
  });
});

describe('validateCardInput', () => {
  it('accepts a valid visa card', () => {
    const result = validateCardInput({
      cardNumber: '4111 1111 1111 1111',
      expiry: FUTURE_EXPIRY,
      cvv: '123',
    });
    expect(result.valid).toBe(true);
    expect(result.brand).toBe('visa');
    expect(result.last4).toBe('1111');
  });

  it('requires 4-digit CVV for amex', () => {
    const bad = validateCardInput({
      cardNumber: '378282246310005',
      expiry: FUTURE_EXPIRY,
      cvv: '123',
    });
    expect(bad.errors.cvv).toBe('cvv_len');
    expect(bad.errorParams?.cvvLen).toBe(4);

    const good = validateCardInput({
      cardNumber: '378282246310005',
      expiry: FUTURE_EXPIRY,
      cvv: '1234',
    });
    expect(good.valid).toBe(true);
  });

  it('flags wrong length for a known brand', () => {
    const result = validateCardInput({
      cardNumber: '411111111111111', // 15 digits, visa expects 16
      expiry: FUTURE_EXPIRY,
      cvv: '123',
    });
    expect(result.errors.number).toBe('expected_len');
    expect(result.errorParams?.expectedLen).toBe(16);
  });

  it('flags Luhn failures', () => {
    const result = validateCardInput({
      cardNumber: '4111111111111112',
      expiry: FUTURE_EXPIRY,
      cvv: '123',
    });
    expect(result.errors.number).toBe('luhn');
  });
});

describe('validateCardForSandbox', () => {
  it('skips Luhn for charge-simulation cards (4001/4002/4003)', () => {
    for (const key of ['expired', 'decline', 'timeout'] as const) {
      const card = SANDBOX_TEST_CARDS[key];
      const result = validateCardForSandbox({
        cardNumber: card.number,
        expiry: FUTURE_EXPIRY,
        cvv: card.cvv,
      });
      expect(result.valid).toBe(true);
    }
  });

  it('still validates expiry and cvv shape for simulation cards', () => {
    const result = validateCardForSandbox({
      cardNumber: SANDBOX_TEST_CARDS.decline.number,
      expiry: 'nope',
      cvv: '12',
    });
    expect(result.valid).toBe(false);
    expect(result.errors.expiry).toBe('expiry_format');
    expect(result.errors.cvv).toBe('cvv_range');
  });

  it('applies full validation for regular cards', () => {
    const result = validateCardForSandbox({
      cardNumber: '4111111111111119', // fails Luhn, not a sim card
      expiry: FUTURE_EXPIRY,
      cvv: '123',
    });
    expect(result.valid).toBe(false);
    expect(result.errors.number).toBe('luhn');
  });
});
