import type { Metadata } from 'next';
import { cookies } from 'next/headers';

const META = {
  vi: {
    home: {
      title: 'PlatPrint — In ấn từ xa & Gian hàng ấn phẩm',
      description: 'Nền tảng in ấn từ xa và gian hàng ấn phẩm tích hợp trợ lý AI đa ngôn ngữ.',
    },
    print: {
      title: 'In ấn từ xa | PlatPrint',
      description: 'Tải tài liệu, cấu hình in và thanh toán token an toàn.',
    },
    store: {
      title: 'Gian hàng | PlatPrint',
      description: 'Mua ấn phẩm in sẵn, thanh toán thẻ sandbox và điểm thưởng.',
    },
    chat: {
      title: 'Hỗ trợ AI | PlatPrint',
      description: 'Trò chuyện với trợ lý AI về in ấn, giá và thanh toán.',
    },
    auth: {
      title: 'Đăng nhập | PlatPrint',
      description: 'Đăng nhập hoặc tạo tài khoản PlatPrint.',
    },
    dashboard: {
      title: 'Dashboard | PlatPrint',
      description: 'Theo dõi đơn in, đơn hàng và điểm thưởng.',
    },
  },
  en: {
    home: {
      title: 'PlatPrint — Remote Printing & Print Store',
      description: 'Remote printing and print-shop platform with multilingual AI support.',
    },
    print: {
      title: 'Remote Print | PlatPrint',
      description: 'Upload documents, configure print settings, and pay with secure tokens.',
    },
    store: {
      title: 'Store | PlatPrint',
      description: 'Buy ready-made prints with sandbox cards and reward points.',
    },
    chat: {
      title: 'AI Support | PlatPrint',
      description: 'Chat with an AI assistant about printing, pricing, and payments.',
    },
    auth: {
      title: 'Sign in | PlatPrint',
      description: 'Sign in or create your PlatPrint account.',
    },
    dashboard: {
      title: 'Dashboard | PlatPrint',
      description: 'Track print jobs, orders, and reward points.',
    },
  },
} as const;

export type SeoPage = keyof typeof META.vi;

export async function pageMetadata(page: SeoPage): Promise<Metadata> {
  const jar = await cookies();
  const locale = jar.get('platprint_locale')?.value === 'en' ? 'en' : 'vi';
  const entry = META[locale][page];
  return {
    title: entry.title,
    description: entry.description,
  };
}
