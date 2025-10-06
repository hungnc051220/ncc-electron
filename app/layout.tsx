import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const dmSans = Inter({
  variable: "--font-dm-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Hệ thống quản lý Rạp Chiếu Phim Quốc Gia - NCC System",
  description: "Developed By HungNC",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="light">
      <body className={`${dmSans.variable} font-sans antialiased`}>{children}</body>
    </html>
  );
}
