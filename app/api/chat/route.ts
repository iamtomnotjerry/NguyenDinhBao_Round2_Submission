import { createClient } from '@/lib/supabase/server';
import { SafeDatabase } from '@/types/database.types';
import { SupabaseClient } from '@supabase/supabase-js';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { streamText } from 'ai';
import { NextResponse } from 'next/server';
import { HUMAN_HANDOFF_TOKEN, markChatWaitingSupport } from '@/lib/chat/handoff';

function handoffHeaders(sessionId: string, handoffOk?: boolean): HeadersInit {
  const headers: Record<string, string> = {
    'X-Session-Id': sessionId,
  };
  if (handoffOk) {
    headers['X-Chat-Handoff'] = 'waiting_support';
  }
  return headers;
}

export async function POST(request: Request) {
  try {
    const supabase: SupabaseClient<SafeDatabase> = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Chưa đăng nhập (Unauthorized)' }, { status: 401 });
    }

    const body = await request.json();
    let message = body.message;
    const { sessionId } = body;

    if (!message && Array.isArray(body.messages)) {
      const lastMsg = body.messages[body.messages.length - 1];
      if (lastMsg) {
        if (typeof lastMsg.content === 'string') {
          message = lastMsg.content;
        } else if (Array.isArray(lastMsg.parts)) {
          message = lastMsg.parts
            .filter((p: { type: string; text?: string }) => p.type === 'text')
            .map((p: { type: string; text?: string }) => p.text || '')
            .join('');
        }
      }
    }

    if (!message) {
      return NextResponse.json({ error: 'Tin nhắn không được để trống' }, { status: 400 });
    }

    let currentSessionId = sessionId;
    if (!currentSessionId) {
      const { data: session, error: sessionErr } = await supabase
        .from('chat_sessions')
        .insert({ user_id: user.id, status: 'active' })
        .select()
        .single();

      if (sessionErr) {
        return NextResponse.json({ error: sessionErr.message }, { status: 400 });
      }
      currentSessionId = session.id;
    } else {
      const { data: owned } = await supabase
        .from('chat_sessions')
        .select('id')
        .eq('id', currentSessionId)
        .eq('user_id', user.id)
        .maybeSingle();
      if (!owned) {
        return NextResponse.json({ error: 'Forbidden chat session' }, { status: 403 });
      }
    }

    await supabase.from('chat_messages').insert({
      session_id: currentSessionId,
      sender: 'user',
      message: message,
    });

    const geminiKey = process.env.GEMINI_API_KEY;
    const isMockAI = !geminiKey || geminiKey === 'your-gemini-api-key' || geminiKey === '';

    if (isMockAI) {
      let responseText = '';
      const lowercaseMsg = message.toLowerCase();

      if (
        lowercaseMsg.includes('người') ||
        lowercaseMsg.includes('nhân viên') ||
        lowercaseMsg.includes('hỗ trợ viên') ||
        lowercaseMsg.includes('human') ||
        lowercaseMsg.includes('support')
      ) {
        responseText = `${HUMAN_HANDOFF_TOKEN} Yêu cầu của bạn đã được ghi nhận. Tôi sẽ chuyển cuộc hội thoại này sang nhân viên hỗ trợ (con người) ngay lập tức. Vui lòng đợi trong giây lát.`;
      } else if (lowercaseMsg.includes('in') || lowercaseMsg.includes('print')) {
        responseText =
          'Để sử dụng dịch vụ in ấn từ xa, bạn hãy chuyển sang tab "In ấn từ xa", tải tệp PDF lên, chọn cấu hình in (đen trắng/màu, khổ giấy A3/A4/A5, đóng gáy) và bấm bắt đầu in. Hệ thống sẽ tự động tính giá và mô phỏng in ấn thời gian thực.';
      } else if (
        lowercaseMsg.includes('mua') ||
        lowercaseMsg.includes('cửa hàng') ||
        lowercaseMsg.includes('shop') ||
        lowercaseMsg.includes('store')
      ) {
        responseText =
          'PlatPrint cung cấp gian hàng bán các ấn phẩm in sẵn như Tập sách hướng dẫn hành chính, Biểu mẫu tờ khai, Báo cáo nghiên cứu công nghệ. Bạn có thể chọn mua trong mục "Gian hàng", thêm vào giỏ hàng và chọn thanh toán bằng thẻ/điểm thưởng.';
      } else if (
        lowercaseMsg.includes('điểm') ||
        lowercaseMsg.includes('points') ||
        lowercaseMsg.includes('reward')
      ) {
        responseText =
          'Với mỗi đơn hàng in ấn hoặc mua ấn phẩm, bạn sẽ được tích điểm thưởng tương ứng với giá trị đơn hàng. Bạn có thể sử dụng điểm này để giảm giá cho các đơn hàng tiếp theo (quy đổi 10 điểm = $1). Bạn có thể xem lịch sử tích điểm trong Dashboard.';
      } else {
        responseText = `Cảm ơn bạn đã nhắn tin. Đây là phản hồi giả lập từ trợ lý ảo PlatPrint (Gemini API Key hiện chưa được điền ở .env.local). Lời nhắn của bạn: "${message}". Tôi có thể hỗ trợ bạn về dịch vụ in ấn hoặc mua ấn phẩm.`;
      }

      let handoffOk = false;
      const saveMockResponse = async () => {
        await supabase.from('chat_messages').insert({
          session_id: currentSessionId,
          sender: 'ai',
          message: responseText,
        });

        if (responseText.includes(HUMAN_HANDOFF_TOKEN)) {
          const result = await markChatWaitingSupport(supabase, currentSessionId, user.id);
          handoffOk = result.ok;
          if (!result.ok) {
            console.error('Chat handoff persist failed:', result.error);
          }
        }
      };
      await saveMockResponse();

      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        async start(controller) {
          const words = responseText.split(' ');
          for (const word of words) {
            const formatted = `0:${JSON.stringify(word + ' ')}\n`;
            controller.enqueue(encoder.encode(formatted));
            await new Promise((resolve) => setTimeout(resolve, 80));
          }
          controller.close();
        },
      });

      return new Response(stream, {
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
          'Transfer-Encoding': 'chunked',
          ...handoffHeaders(currentSessionId, handoffOk),
        },
      });
    }

    const google = createGoogleGenerativeAI({
      apiKey: geminiKey,
    });

    const systemInstruction = `
Bạn là trợ lý ảo hỗ trợ khách hàng của dịch vụ in ấn từ xa PlatPrint.
Hãy trả lời lịch sự, chuyên nghiệp.
Tự động nhận diện ngôn ngữ của khách hàng để trả lời bằng ngôn ngữ tương ứng (Tiếng Việt, Tiếng Anh...).
Phạm vi trả lời: Chỉ trả lời các thông tin liên quan đến dịch vụ in ấn, cấu hình in, mua ấn phẩm ở gian hàng, hỗ trợ thanh toán lỗi hoặc điểm thưởng tích lũy.
QUY TẮC ĐẶC BIỆT: Nếu khách hàng yêu cầu gặp người thật hỗ trợ, hoặc hỏi về các vấn đề ngoài phạm vi chuyên môn in ấn mà bạn không thể tự giải quyết, bạn BẮT BUỘC phải phản hồi chính xác chuỗi ký tự sau ở ngay đầu câu trả lời: ${HUMAN_HANDOFF_TOKEN}.
`;

    // Capture handoff result for response header (stream starts before onFinish completes)
    let handoffPersisted = false;

    const result = streamText({
      model: google('gemini-2.5-flash'),
      system: systemInstruction,
      prompt: message,
      onFinish: async ({ text }) => {
        await supabase.from('chat_messages').insert({
          session_id: currentSessionId,
          sender: 'ai',
          message: text,
        });

        if (text.includes(HUMAN_HANDOFF_TOKEN)) {
          const handoff = await markChatWaitingSupport(supabase, currentSessionId, user.id);
          handoffPersisted = handoff.ok;
          if (!handoff.ok) {
            console.error('Chat handoff persist failed:', handoff.error);
          }
        }
      },
    });

    return result.toUIMessageStreamResponse({
      headers: handoffHeaders(currentSessionId, handoffPersisted),
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
