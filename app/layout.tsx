import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Toaster } from "sonner";
import QueryProvider from "@/providers/query-provider";
import "./globals.css";
import "react-datepicker/dist/react-datepicker.css";
import GetGeneralData from "@/components/get-general-data";

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
        <QueryProvider>
          <GetGeneralData />
          {children}
        </QueryProvider>
        <Toaster richColors position="top-center" />
      </body>
    </html>
  );
}
