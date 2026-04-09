import type { Metadata } from "next";
import Link from "next/link";

import "./globals.css";

export const metadata: Metadata = {
  title: "策划案评审系统 MVP",
  description: "支持文件上传、规则管理、百炼兼容接口评审与段落标注展示。",
};

const navItems = [
  { href: "/", label: "总览" },
  { href: "/reviews/new", label: "新建评审" },
  { href: "/rules", label: "规则管理" },
];

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body>
        <div className="app-shell">
          <header className="topbar">
            <div>
              <p className="eyebrow">Planning Review MVP</p>
              <Link className="brand" href="/">
                策划案评审系统
              </Link>
            </div>

            <nav className="nav">
              {navItems.map((item) => (
                <Link key={item.href} href={item.href}>
                  {item.label}
                </Link>
              ))}
            </nav>
          </header>

          <main className="page">{children}</main>
        </div>
      </body>
    </html>
  );
}
