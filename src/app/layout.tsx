import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "크리에이터 스튜디오",
  description: "유튜브 기획, AI 음악 제작, 음원 마스터링과 자막 추출 도구",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
