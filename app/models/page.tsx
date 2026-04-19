import Link from "next/link";

import { PageIntro } from "@/components/page-intro";
import { ModelManager } from "@/components/model-manager";
import { getModelDashboardData } from "@/lib/llm-profiles";

export default async function ModelsPage() {
  const { metrics, profiles } = await getModelDashboardData();

  return (
    <div className="desktop-management-page stack-lg">
      <section className="panel stack-lg">
        <PageIntro
          actions={
            <>
              <Link className="button" href="/reviews/new">
                去新建批次
              </Link>
              <Link className="button-ghost" href="/rules">
                查看规则库
              </Link>
            </>
          }
          description="统一查看供应商连接、默认模型和启用状态，在桌面管理界面里完成搜索、启停、新增和维护。"
          eyebrow="Model Settings"
          title="模型配置"
        />

        <div className="desktop-kpi-grid">
          <div className="metric-card">
            <p className="metric-label">模型总数</p>
            <strong className="metric-value">{metrics.totalCount}</strong>
          </div>
          <div className="metric-card">
            <p className="metric-label">启用中</p>
            <strong className="metric-value">{metrics.enabledCount}</strong>
          </div>
          <div className="metric-card">
            <p className="metric-label">实时模式</p>
            <strong className="metric-value">{metrics.liveCount}</strong>
          </div>
          <div className="metric-card">
            <p className="metric-label">最近更新</p>
            <strong className="metric-value">{metrics.latestUpdatedAtLabel}</strong>
          </div>
        </div>
      </section>

      <ModelManager profiles={profiles} />
    </div>
  );
}
