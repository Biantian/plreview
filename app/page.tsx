"use client";

import Link from "next/link";
import { startTransition, useEffect, useState } from "react";

import { PageIntro } from "@/components/page-intro";
import { StatusBadge } from "@/components/status-badge";
import type { HomeDashboardData } from "@/desktop/bridge/desktop-api";
import { formatDate } from "@/lib/utils";

const EMPTY_HOME_DASHBOARD: HomeDashboardData = {
  rulesCount: 0,
  enabledRulesCount: 0,
  documentsCount: 0,
  reviewJobsCount: 0,
  annotationsCount: 0,
  recentReviews: [],
  llmProfiles: [],
};

type HomeDashboardViewState = {
  dashboard: HomeDashboardData;
  errorMessage: string | null;
  isLoading: boolean;
};

export default function HomePage() {
  const [dashboard, setDashboard] = useState<HomeDashboardData>(EMPTY_HOME_DASHBOARD);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadDashboard() {
      if (!window.plreview?.getHomeDashboard) {
        setErrorMessage("桌面桥接不可用，请从 Electron 桌面壳启动。");
        setIsLoading(false);
        return;
      }

      try {
        const nextDashboard = await window.plreview.getHomeDashboard();

        if (cancelled) {
          return;
        }

        startTransition(() => {
          setDashboard(nextDashboard);
          setErrorMessage(null);
        });
      } catch (error) {
        if (!cancelled) {
          setErrorMessage(error instanceof Error ? error.message : "工作台加载失败。");
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadDashboard();

    return () => {
      cancelled = true;
    };
  }, []);

  const viewState = { dashboard, errorMessage, isLoading };

  return (
    <div className="home-command-center" data-testid="home-desktop-cockpit">
      <header className="home-command-header" data-testid="home-command-header">
        <PageIntro
          description="继续最近评审，或开始一个新的本地批次。"
          eyebrow="Workspace"
          title="评审工作台"
        />
      </header>

      <section className="home-cockpit-grid" aria-label="工作台概览">
        <HomeRecentReviewsPane {...viewState} />
        <HomeSnapshotPane dashboard={dashboard} errorMessage={errorMessage} isLoading={isLoading} />
      </section>
    </div>
  );
}

function HomeSnapshotPane({
  dashboard,
  errorMessage,
  isLoading,
}: Pick<HomeDashboardViewState, "dashboard" | "errorMessage" | "isLoading">) {
  const primaryModel = dashboard.llmProfiles[0];
  const additionalModelCount = Math.max(dashboard.llmProfiles.length - 1, 0);

  return (
    <aside
      className="home-snapshot-pane"
      data-testid="home-snapshot-pane"
      aria-labelledby="home-snapshot-title"
    >
      <div className="home-snapshot-header">
        <p className="section-eyebrow">Status</p>
        <h2 className="subsection-title" id="home-snapshot-title">
          当前状态
        </h2>
        <p className="section-copy">只保留开始评审前真正需要确认的信息。</p>
      </div>

      {errorMessage ? (
        <div className="home-unavailable-block" aria-label="工作台状态暂不可用">
          <p className="section-eyebrow">Unavailable</p>
          <strong>工作台状态暂不可用</strong>
          <p className="muted">桌面桥接恢复后，这里会显示规则、模型和本地资料。</p>
        </div>
      ) : isLoading ? (
        <div className="home-unavailable-block" aria-label="正在读取工作台状态">
          <p className="section-eyebrow">Loading</p>
          <strong>正在读取工作台状态</strong>
          <p className="muted">桌面工作台正在同步规则、模型和本地资料。</p>
        </div>
      ) : (
        <div className="home-snapshot-list" aria-label="工作台状态">
          <SnapshotRow
            label="规则"
            title={`${dashboard.enabledRulesCount}/${dashboard.rulesCount} 条规则启用`}
            description="会作为本地评审的检查依据。"
          />
          {primaryModel ? (
            <SnapshotRow
              label={primaryModel.provider}
              title={primaryModel.name}
              description={
                additionalModelCount > 0
                  ? `${primaryModel.defaultModel}，另有 ${additionalModelCount} 个启用配置`
                  : primaryModel.defaultModel
              }
            />
          ) : (
            <SnapshotRow
              label="模型"
              title="当前没有启用模型配置"
              description="先在侧边栏进入模型配置启用一个配置。"
            />
          )}
          <SnapshotRow
            label="本地资料"
            title={`${dashboard.documentsCount} 份文档`}
            description={`${dashboard.reviewJobsCount} 个批次，${dashboard.annotationsCount} 个问题标注`}
          />
        </div>
      )}
    </aside>
  );
}

function HomeRecentReviewsPane({
  dashboard,
  errorMessage,
  isLoading,
}: HomeDashboardViewState) {
  return (
    <section
      className="home-pane home-recent-pane"
      data-testid="home-recent-reviews-pane"
      aria-labelledby="home-recent-reviews-title"
    >
      <PaneHeader
        eyebrow="Recent Reviews"
        title="最近评审"
        id="home-recent-reviews-title"
        description="继续查看近期批次的状态和报告。"
      />

      <div className="home-pane-scroll" data-testid="home-recent-scroll">
        <div className="list">
          {errorMessage ? (
            <div className="list-item">
              <div>
                <h3>加载失败：{errorMessage}</h3>
                <p className="muted">请确认桌面桥接可用后重试。</p>
              </div>
            </div>
          ) : isLoading ? (
            <div className="list-item">
              <div>
                <h3>正在读取最近评审</h3>
                <p className="muted">桌面工作台正在从本地数据库同步状态。</p>
              </div>
            </div>
          ) : dashboard.recentReviews.length === 0 ? (
            <div className="list-item">
              <div>
                <h3>还没有评审记录</h3>
                <p className="muted">创建新评审后，这里会显示结果。</p>
              </div>
            </div>
          ) : (
            dashboard.recentReviews.map((review) => (
              <Link
                className="list-item"
                href={`/reviews/detail?id=${encodeURIComponent(review.id)}`}
                key={review.id}
              >
                <div>
                  <h3>{review.title}</h3>
                  <p className="muted">
                    {review.modelName} · {formatDate(review.createdAt)}
                  </p>
                </div>
                <StatusBadge status={review.status} />
              </Link>
            ))
          )}
        </div>
      </div>
    </section>
  );
}

type PaneHeaderProps = {
  description: string;
  eyebrow: string;
  id: string;
  title: string;
};

function PaneHeader({ description, eyebrow, id, title }: PaneHeaderProps) {
  return (
    <div className="home-pane-header">
      <p className="section-eyebrow">{eyebrow}</p>
      <h2 className="subsection-title" id={id}>
        {title}
      </h2>
      <p className="section-copy">{description}</p>
    </div>
  );
}

type SnapshotRowProps = {
  description: string;
  label: string;
  title: string;
};

function SnapshotRow({ description, label, title }: SnapshotRowProps) {
  return (
    <div className="home-snapshot-row">
      <span className="feature-kicker">{label}</span>
      <div>
        <strong>{title}</strong>
        <p className="muted">{description}</p>
      </div>
    </div>
  );
}
