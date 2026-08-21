import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Ziwon.AI | 기업지원사업 AI Finder & Consulting Platform",
  description: "정부 및 공공기관 지원사업 통합 탐색, AI 공고 분석 및 기업 맞춤형 적합도 컨설팅 플랫폼",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=Outfit:wght@400;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="antialiased selection:bg-blue-600 selection:text-white">
        {children}
      </body>
    </html>
  );
}
