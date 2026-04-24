"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

type NavItem = {
  href: string;
  label: string;
};

const navItems: NavItem[] = [
  { href: "/", label: "工作台" },
  { href: "/reviews", label: "评审任务" },
  { href: "/rules", label: "规则库" },
  { href: "/models", label: "模型配置" },
  { href: "/docs", label: "帮助文档" },
];

function getActiveNavHref(currentPathname: string) {
  const normalizedPathname = normalizeRoutePathname(currentPathname);
  const exactMatch = navItems.find((item) => item.href === normalizedPathname);

  if (exactMatch) {
    return exactMatch.href;
  }

  const childMatch = navItems
    .filter((item) => item.href !== "/" && normalizedPathname.startsWith(`${item.href}/`))
    .sort((left, right) => right.href.length - left.href.length)[0];

  return childMatch?.href ?? null;
}

function normalizeRoutePathname(currentPathname: string) {
  const trimmedPathname = currentPathname.replace(/\/+$/, "") || "/";

  if (trimmedPathname === "/index" || trimmedPathname === "/index.html") {
    return "/";
  }

  const withoutHtmlExtension = trimmedPathname.replace(/\.html$/, "");

  return withoutHtmlExtension || "/";
}

function getBrowserPathname() {
  if (typeof window === "undefined") {
    return null;
  }

  return window.location.pathname;
}

function shouldPreferBrowserPathname(browserPathname: string | null) {
  return browserPathname ? normalizeRoutePathname(browserPathname) !== "/" : false;
}

export function SiteNav() {
  const pathname = usePathname() ?? "/";
  const [browserPathname, setBrowserPathname] = useState<string | null>(() => getBrowserPathname());
  const [optimisticActiveHref, setOptimisticActiveHref] = useState<string | null>(null);
  const activeNavHrefFromPathname = getActiveNavHref(pathname);
  const activeNavHrefFromBrowser = browserPathname ? getActiveNavHref(browserPathname) : null;
  const routeActiveNavHref = shouldPreferBrowserPathname(browserPathname)
    ? activeNavHrefFromBrowser
    : activeNavHrefFromPathname;
  const activeNavHref = optimisticActiveHref ?? routeActiveNavHref;

  useEffect(() => {
    const syncBrowserPathname = () => setBrowserPathname(getBrowserPathname());

    syncBrowserPathname();
    window.addEventListener("popstate", syncBrowserPathname);

    return () => {
      window.removeEventListener("popstate", syncBrowserPathname);
    };
  }, []);

  useEffect(() => {
    if (routeActiveNavHref === optimisticActiveHref) {
      setOptimisticActiveHref(null);
    }
  }, [routeActiveNavHref, optimisticActiveHref]);

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
            onClick={() => {
              setBrowserPathname(item.href);
              setOptimisticActiveHref(item.href);
            }}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
