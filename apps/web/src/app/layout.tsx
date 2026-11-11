import type { Metadata, Viewport } from 'next';
import { Header } from '@/components/Header';
import './globals.css';
import { Providers } from './providers';

export const metadata: Metadata = {
  title: 'BrewLite – Đặt cà phê không tiền mặt',
  description: 'Chọn đồ uống, thanh toán không tiền mặt và nhận nước tại quầy.',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#3b2416',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi">
      <head>
        {/* Trình duyệt tự tải font khi chạy; build không cần mạng, thiếu mạng thì dùng font hệ thống */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@400;500;600;700&display=swap"
        />
      </head>
      <body className="min-h-screen font-sans antialiased">
        <Providers>
          <Header />
          <main className="mx-auto w-full max-w-5xl px-4 pb-16 pt-6">{children}</main>
        </Providers>
      </body>
    </html>
  );
}
