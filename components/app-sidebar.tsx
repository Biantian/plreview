import Link from "next/link";

import { SiteNav } from "@/components/site-nav";

export function AppSidebar() {
  return (
    <aside className="app-sidebar" aria-label="应用侧边栏">
      <div className="sidebar-brand">
        <Link className="sidebar-brand-link" href="/">
          <span className="sidebar-brand-mark">PL</span>
          <span className="sidebar-brand-copy">
            <span className="sidebar-brand-eyebrow">Planning Review Workspace</span>
            <span className="sidebar-brand-title">策划案评审系统</span>
          </span>
        </Link>
        <p className="sidebar-brand-description">
          把规则、模型、报告和段落定位放进同一张工作台里。
        </p>
      </div>

      <SiteNav />
    </aside>
  );
}
