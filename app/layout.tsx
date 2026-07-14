import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import AppProviders from '@/components/AppProviders';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'PlatPrint - Dịch Vụ In Ấn Từ Xa & Cửa Hàng Ấn Phẩm',
  description: 'Nền tảng in ấn từ xa và gian hàng ấn phẩm tích hợp trợ lý ảo AI đa ngôn ngữ.',
};

const themeInitScript = `
(function(){
  try {
    var t = localStorage.getItem('platprint_theme');
    if (t !== 'light' && t !== 'dark') t = 'dark';
    document.documentElement.setAttribute('data-theme', t);
    document.documentElement.classList.toggle('dark', t === 'dark');
    document.documentElement.classList.toggle('light', t === 'light');
    var l = localStorage.getItem('platprint_locale');
    if (l === 'en' || l === 'vi') document.documentElement.lang = l;
  } catch (e) {}
})();
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="vi"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased dark`}
      data-theme="dark"
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="min-h-full flex flex-col premium-bg bg-[#050505] text-white selection:bg-emerald-500 selection:text-black pb-20 md:pb-0">
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
