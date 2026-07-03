import type { Metadata, Viewport } from "next";
import { Noto_Serif_KR } from "next/font/google";
import { SharedLayout } from "@/layouts";
import "./globals.css";

const notoSerif = Noto_Serif_KR({
  weight: ["300", "400"],
  display: "swap",
  variable: "--font-noto-serif",
});

export const metadata: Metadata = {
  title: "숨비소리",
  description: "조용한 디지털 살롱, 숨비소리",
  applicationName: "숨비소리",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "숨비",
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: [{ url: "/icon", type: "image/png", sizes: "512x512" }],
    apple: [{ url: "/apple-icon", type: "image/png", sizes: "180x180" }],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
  themeColor: "#2E7D7A",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body className={`${notoSerif.variable} ${notoSerif.className}`}>
        <SharedLayout>{children}</SharedLayout>
      </body>
    </html>
  );
}
