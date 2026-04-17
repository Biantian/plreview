"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type NavItem = {
  href: string;
  label: string;
};

const navItems: NavItem[] = [
  { href: "/", label: "总览" },
  { href: "/reviews", label: "评审列表" },
  { href: "/reviews/new", label: "新建评审" },
  { href: "/rules", label: "规则管理" },
  { href: "/models", label: "模型设置" },
  { href: "/docs", label: "文档" },
];

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

export function SiteNav() {
  const pathname = usePathname() ?? "/";
  const activeNavHref = getActiveNavHref(pathname);

  return (
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
  );
}
