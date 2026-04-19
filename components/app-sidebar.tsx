import Link from "next/link";

import { SiteNav } from "@/components/site-nav";

export function AppSidebar() {
  return (
    <aside className="app-sidebar" aria-label="应用侧边栏">
      <div className="sidebar-brand">
        <Link className="sidebar-brand-link" href="/">
          <span className="sidebar-brand-mark">PL</span>
          <span className="sidebar-brand-copy">
            <span className="sidebar-brand-title">PL Review</span>
            <span className="sidebar-brand-eyebrow">Desktop Workspace</span>
          </span>
        </Link>
        <p className="sidebar-brand-description">
          规则、批次、结果和文档都固定停靠在这条桌面导航轨道里。
        </p>
      </div>

      <SiteNav />
    </aside>
  );
}
