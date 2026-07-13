import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { cardNumber, cardBrand, expMonth, expYear } = body;

    if (!cardNumber || cardNumber.length < 12) {
      return NextResponse.json(
        { error: 'Số thẻ không hợp lệ (Card number must be at least 12 digits)' },
        { status: 400 }
      );
    }

    const last4 = cardNumber.slice(-4);
    // Generate a secure-looking random token incorporating the last4 digits for state mock charging
    const randomString = Math.random().toString(36).substring(2, 10);
    const cardToken = `tok_${last4}_${randomString}`;

    return NextResponse.json({
      card_token: cardToken,
      last4,
      card_brand: cardBrand || 'Visa',
      exp_month: parseInt(expMonth, 10) || 12,
      exp_year: parseInt(expYear, 10) || 2030,
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal Server Error', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
