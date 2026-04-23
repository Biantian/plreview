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

type MetricItem = {
  label: string;
  value: number;
};

const QUICK_LINKS = [
  {
    description: "查看任务列表、进度和结果。",
    href: "/reviews",
    label: "查看评审任务",
    tag: "任务",
  },
  {
    description: "导入文档并启动评审。",
    href: "/reviews/new",
    label: "创建评审批次",
    tag: "新建",
  },
  {
    description: "维护规则和提示词模板。",
    href: "/rules",
    label: "维护规则库",
    tag: "规则",
  },
  {
    description: "管理可用于评审的模型。",
    href: "/models",
    label: "管理模型配置",
    tag: "模型",
  },
] as const;

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
          actions={
            <Link className="button" href="/reviews/new">
              开始新批次
            </Link>
          }
          description="从这里进入任务、规则、模型配置和最近结果。"
          eyebrow="Workspace"
          title="评审工作台"
        />
      </header>

      <section className="home-cockpit-grid" aria-label="工作台概览">
        <HomeCommandRail dashboard={dashboard} errorMessage={errorMessage} isLoading={isLoading} />
        <HomeRecentReviewsPane {...viewState} />
        <HomeReadinessPane {...viewState} />
      </section>
    </div>
  );
}

function HomeCommandRail({
  dashboard,
  errorMessage,
  isLoading,
}: Pick<HomeDashboardViewState, "dashboard" | "errorMessage" | "isLoading">) {
  const metrics: MetricItem[] = [
    { label: "已导入文档", value: dashboard.documentsCount },
    { label: "评审任务", value: dashboard.reviewJobsCount },
    { label: "启用规则", value: dashboard.enabledRulesCount },
    { label: "问题标注", value: dashboard.annotationsCount },
  ];

  return (
    <aside
      className="home-command-rail"
      data-testid="home-command-rail"
      aria-label="工作台常用操作"
    >
      <Link className="home-primary-action" href="/reviews/new" aria-label="创建评审批次">
        <span>
          <span className="section-eyebrow">Primary action</span>
          <strong>创建评审批次</strong>
        </span>
        <span className="home-action-arrow" aria-hidden="true">
          →
        </span>
      </Link>

      <div className="home-quick-links" aria-label="常用入口">
        {QUICK_LINKS.map((link) => (
          <Link
            className="home-quick-link"
            href={link.href}
            key={link.href}
            aria-label={link.label}
          >
            <span className="home-quick-link-copy">
              <strong>{link.label}</strong>
              <span>{link.description}</span>
            </span>
            <span className="pill pill-brand">{link.tag}</span>
          </Link>
        ))}
      </div>

      {errorMessage ? (
        <div className="home-unavailable-block" aria-label="工作台指标暂不可用">
          <p className="section-eyebrow">Unavailable</p>
          <strong>工作台指标暂不可用</strong>
          <p className="muted">桌面桥接恢复后，这里会显示文档、任务、规则和标注概览。</p>
        </div>
      ) : isLoading ? (
        <div className="home-unavailable-block" aria-label="正在读取工作台指标">
          <p className="section-eyebrow">Loading</p>
          <strong>正在读取工作台指标</strong>
          <p className="muted">桌面工作台正在同步文档、任务、规则和标注概览。</p>
        </div>
      ) : (
        <div className="home-metric-grid" aria-label="工作台指标">
          {metrics.map((metric) => (
            <div className="home-metric-card" key={metric.label}>
              <p className="metric-label">{metric.label}</p>
              <strong className="metric-value">{metric.value}</strong>
            </div>
          ))}
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
        description="查看最近完成、进行中或失败的任务。"
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

function HomeReadinessPane({ dashboard, errorMessage, isLoading }: HomeDashboardViewState) {
  return (
    <aside
      className="home-pane home-readiness-pane"
      data-testid="home-readiness-pane"
      aria-labelledby="home-readiness-title"
    >
      <PaneHeader
        eyebrow="Readiness"
        title="配置准备度"
        id="home-readiness-title"
        description="确认规则、模型和结果阅读能力。"
      />

      <div className="home-pane-scroll" data-testid="home-readiness-scroll">
        <div className="feature-list">
          {errorMessage ? (
            <FeatureRow
              kicker="桥接"
              title="桌面桥接不可用"
              description="无法读取规则、模型和结果状态。"
            />
          ) : (
            <>
              {isLoading ? (
                <FeatureRow
                  kicker="规则"
                  title="正在读取规则状态"
                  description="完成后会显示已建档规则和启用情况。"
                />
              ) : (
                <FeatureRow
                  kicker="规则"
                  title={`${dashboard.rulesCount} 条规则已建档`}
                  description={`${dashboard.enabledRulesCount} 条规则已启用`}
                />
              )}

              {isLoading ? (
                <FeatureRow
                  kicker="模型"
                  title="正在读取模型配置"
                  description="完成后会显示当前启用的桌面模型。"
                />
              ) : dashboard.llmProfiles.length === 0 ? (
                <FeatureRow
                  kicker="模型"
                  title="当前没有启用模型配置"
                  description="先去模型配置页启用一个配置后再开始批次。"
                />
              ) : (
                dashboard.llmProfiles.map((profile) => (
                  <FeatureRow
                    kicker={profile.provider}
                    title={profile.name}
                    description={profile.defaultModel}
                    key={profile.id}
                  />
                ))
              )}

              <FeatureRow
                kicker="结果"
                title="可查看报告、问题和原文位置"
                description="结果页会显示对应内容。"
              />
            </>
          )}
        </div>
      </div>
    </aside>
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

type FeatureRowProps = {
  description: string;
  kicker: string;
  title: string;
};

function FeatureRow({ description, kicker, title }: FeatureRowProps) {
  return (
    <div className="feature-row">
      <span className="feature-kicker">{kicker}</span>
      <div>
        <strong>{title}</strong>
        <p className="muted">{description}</p>
      </div>
    </div>
  );
}
