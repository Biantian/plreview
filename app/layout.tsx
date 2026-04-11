import type { Metadata } from "next";
import Link from "next/link";

import "./globals.css";

export const metadata: Metadata = {
  title: "PL Review | 策划案评审工作台",
  description: "支持文件上传、规则管理、百炼兼容接口评审与段落标注展示的策划案评审工作台。",
};

const navItems = [
  { href: "/", label: "总览" },
  { href: "/reviews", label: "评审列表" },
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
            <div className="topbar-brand">
              <Link className="brand-lockup" href="/">
                <span className="brand-mark">PL</span>
                <span className="brand-copy">
                  <span className="eyebrow">Planning Review Workspace</span>
                  <span className="brand">策划案评审系统</span>
                </span>
              </Link>
              <p className="topbar-copy">
                把规则、模型、报告和段落定位放进同一张工作台里，让每次评审都能快速启动、快速回看。
              </p>
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
