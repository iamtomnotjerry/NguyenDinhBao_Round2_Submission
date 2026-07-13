import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col premium-bg bg-zinc-950 text-white selection:bg-indigo-500 selection:text-white">
        {children}
      </body>
    </html>
  );
}
