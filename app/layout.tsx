import type { Metadata } from "next";
import { DM_Sans } from "next/font/google";
import "./globals.css";

const dmSans = DM_Sans({
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
      <body className={`${dmSans.variable} antialiased`}>{children}</body>
    </html>
  );
}
