import type { Metadata } from "next";
import { headers } from "next/headers";
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
  { href: "/models", label: "模型设置" },
  { href: "/docs", label: "帮助" },
];

async function getCurrentPathname() {
  const requestHeaders = await headers();
  const requestUrl = requestHeaders.get("next-url") ?? requestHeaders.get("x-matched-path") ?? "/";

  try {
    return new URL(requestUrl, "http://localhost").pathname || "/";
  } catch {
    return requestUrl.split("?")[0] || "/";
  }
}

function getActiveNavHref(currentPathname: string) {
  const exactMatch = navItems.find((item) => item.href === currentPathname);

  if (exactMatch) {
    return exactMatch.href;
  }

  const childMatch = navItems
    .filter((item) => item.href !== "/" && currentPathname.startsWith(`${item.href}/`))
    .sort((left, right) => right.href.length - left.href.length)[0];

  return childMatch?.href ?? null;
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const currentPathname = await getCurrentPathname();
  const activeNavHref = getActiveNavHref(currentPathname);

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
              {navItems.map((item) => {
                const isActive = item.href === activeNavHref;

                return (
                  <Link
                    aria-current={isActive ? "page" : undefined}
                    className={isActive ? "active" : undefined}
                    key={item.href}
                    href={item.href}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </header>

          <main className="page">{children}</main>
        </div>
      </body>
    </html>
  );
}
