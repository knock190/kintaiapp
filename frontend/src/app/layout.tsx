import type { Metadata } from "next";

import { QueryProvider } from "@/shared/providers/QueryProvider";

import "./globals.css";

export const metadata: Metadata = {
  title: "勤怠管理",
  description: "勤怠管理 Web システム",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body>
        <QueryProvider>{children}</QueryProvider>
      </body>
    </html>
  );
}
