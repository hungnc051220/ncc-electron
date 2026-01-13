import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";
import "react-datepicker/dist/react-datepicker.css";
import AntdProvider from "@/components/providers/antd-provider";

const inter = Inter({
  variable: "--font-inter",
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
      <body className={`${inter.variable} font-sans antialiased`}>
        <AntdProvider>{children}</AntdProvider>
        <Toaster richColors position="top-center" />
      </body>
    </html>
  );
}
