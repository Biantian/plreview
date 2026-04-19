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
          规则、评审、模型和文档入口。
        </p>
      </div>

      <SiteNav />

      <footer aria-label="侧边栏页脚操作" className="app-sidebar-footer stack-sm">
        <Link className="button" href="/reviews/new">
          新建批次
        </Link>
        <Link className="button-ghost" href="/reviews">
          返回评审任务
        </Link>
      </footer>
    </aside>
  );
}
