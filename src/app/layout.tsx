import type { Metadata } from "next";
import "./globals.css";

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
      <body className="antialiased">{children}</body>
    </html>
  );
}
