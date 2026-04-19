"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type NavItem = {
  href: string;
  label: string;
};

const navItems: NavItem[] = [
  { href: "/", label: "工作台" },
  { href: "/reviews", label: "评审任务" },
  { href: "/reviews/new", label: "新建批次" },
  { href: "/rules", label: "规则库" },
  { href: "/models", label: "模型配置" },
  { href: "/docs", label: "帮助文档" },
];

function getActiveNavHref(currentPathname: string) {
  const normalizedPathname = currentPathname.replace(/\/+$/, "") || "/";
  const exactMatch = navItems.find((item) => item.href === normalizedPathname);

  if (exactMatch) {
    return exactMatch.href;
  }

  const childMatch = navItems
    .filter((item) => item.href !== "/" && normalizedPathname.startsWith(`${item.href}/`))
    .sort((left, right) => right.href.length - left.href.length)[0];

  return childMatch?.href ?? null;
}

export function SiteNav() {
  const pathname = usePathname() ?? "/";
  const activeNavHref = getActiveNavHref(pathname);

  return (
    <nav aria-label="主导航" className="site-nav">
      {navItems.map((item) => {
        const isActive = item.href === activeNavHref;

        return (
          <Link
            aria-current={isActive ? "page" : undefined}
            className={isActive ? "site-nav-link active" : "site-nav-link"}
            key={item.href}
            href={item.href}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
