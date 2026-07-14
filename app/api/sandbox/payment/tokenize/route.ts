import { NextResponse } from 'next/server';
import { validateCardForSandbox, detectCardBrand } from '@/lib/payment/validate-card';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const cardNumber = body.card_number || body.cardNumber || '';
    const expiry = body.expiry || `${body.exp_month || ''}/${body.exp_year || ''}`;
    const cvv = body.cvv || body.cvc || '';

    const validation = validateCardForSandbox({ cardNumber, expiry, cvv });
    if (!validation.valid) {
      const message =
        validation.errors.number ||
        validation.errors.expiry ||
        validation.errors.cvv ||
        'Visa information is invalid.';
      return NextResponse.json(
        {
          error: message,
          errors: validation.errors,
          code: 'CARD_INVALID',
        },
        { status: 400 },
      );
    }

    const brand =
      validation.brand === 'unknown'
        ? body.card_brand || body.cardBrand || 'Visa'
        : validation.brand.charAt(0).toUpperCase() + validation.brand.slice(1);

    const last4 = validation.last4;
    const randomString = Math.random().toString(36).substring(2, 10);
    const cardToken = `tok_${last4}_${randomString}`;

    return NextResponse.json({
      card_token: cardToken,
      last4,
      card_brand: brand,
      exp_month: validation.expMonth,
      exp_year: validation.expYear,
      brand_detected: detectCardBrand(validation.digits),
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: 'Internal Server Error',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
