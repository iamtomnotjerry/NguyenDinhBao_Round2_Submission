import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { card_token, amount } = body;

    if (!card_token) {
      return NextResponse.json({ error: 'Thiếu card_token' }, { status: 400 });
    }

    // Extract last 4 digits from token format: tok_last4_randomstring
    // Default to '0000' if format doesn't match
    const tokenParts = card_token.split('_');
    const last4 = tokenParts[1] || '0000';

    if (last4 === '4001') {
      return NextResponse.json(
        { error: 'Thẻ của bạn đã hết hạn (Card Expired)' },
        { status: 400 }
      );
    } else if (last4 === '4002') {
      return NextResponse.json(
        { error: 'Giao dịch bị từ chối (Transaction Declined)' },
        { status: 400 }
      );
    } else if (last4 === '4003') {
      // Simulate timeout by sleeping 10 seconds
      await new Promise((resolve) => setTimeout(resolve, 10000));
      return NextResponse.json(
        { error: 'Giao dịch hết thời gian chờ (Timeout)' },
        { status: 504 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Thanh toán thành công',
      transaction_id: `tx_${Math.random().toString(36).substring(2, 12)}`,
      amount,
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal Server Error', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
