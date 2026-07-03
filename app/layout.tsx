import type { Metadata } from "next";
import { Noto_Serif_KR } from "next/font/google";
import "./globals.css";

const notoSerifKR = Noto_Serif_KR({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  variable: "--font-noto-serif-kr",
});

export const metadata: Metadata = {
  title: "숨비소리",
  description: "오늘 하루도 욕심내지 말고 너의 숨만큼만 있다 오거라.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body className={`${notoSerifKR.variable} font-serif antialiased`}>
        {children}
      </body>
    </html>
  );
}
