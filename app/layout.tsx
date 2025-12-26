import { Analytics } from "@vercel/analytics/next"

import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'StoryVillage',
  description: '당신의 취향을 찾아주는 웹소설/웹툰 맛집',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body className={inter.className}>
        {/* 여기에 있던 <header>나 <nav> 태그를 다 지웠습니다! 
          이제 각 페이지에서 만든 헤더만 깔끔하게 나옵니다.
        */}
        {children}
        <Analytics />
      </body>
    </html>
  );
}