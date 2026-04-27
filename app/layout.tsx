import type { Metadata } from "next";

import { AppSidebar } from "@/components/app-sidebar";

import "./globals.css";

export const metadata: Metadata = {
  title: "PL Review | 策划案评审桌面工作台",
  description: "支持文件上传、规则库维护、OpenAI 兼容接口评审与段落标注展示的策划案评审桌面工作台。",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body>
        <div className="desktop-titlebar" aria-hidden="true" />
        <div className="desktop-shell">
          <AppSidebar />
          <main className="workspace page">{children}</main>
        </div>
      </body>
    </html>
  );
}
