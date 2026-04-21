"use client";

import Link from "next/link";
import { startTransition, useEffect, useState } from "react";

import type { HomeDashboardData } from "@/desktop/bridge/desktop-api";
import { PageIntro } from "@/components/page-intro";
import { StatusBadge } from "@/components/status-badge";
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

  if (!isLoading && errorMessage) {
    return (
      <div className="desktop-dashboard stack-lg">
        <section className="panel stack-lg desktop-dashboard-header">
          <PageIntro
            actions={
              <>
                <Link className="button" href="/reviews/new">
                  开始新批次
                </Link>
                <Link className="button-ghost" href="/reviews">
                  打开评审任务
                </Link>
                <Link className="button-ghost" href="/docs">
                  查看帮助文档
                </Link>
              </>
            }
            description="查看任务、配置和最近结果。"
            eyebrow="Workspace"
            title="评审工作台"
          />
          <p className="section-copy">加载失败：{errorMessage}</p>
          <p className="section-copy">请确认桌面桥接可用后重试。</p>
        </section>
      </div>
    );
  }

  return (
    <div className="desktop-dashboard stack-lg">
      <section className="panel stack-lg desktop-dashboard-header">
        <div className="desktop-heading-grid">
          <PageIntro
            actions={
              <>
                <Link className="button" href="/reviews/new">
                  开始新批次
                </Link>
                <Link className="button-ghost" href="/reviews">
                  打开评审任务
                </Link>
                <Link className="button-ghost" href="/docs">
                  查看帮助文档
                </Link>
              </>
            }
            description="查看任务、配置和最近结果。"
            eyebrow="Workspace"
            title="评审工作台"
          />

          <aside className="desktop-info-rail">
            <div className="desktop-mini-card">
              <p className="section-eyebrow">当前值班</p>
              <h2 className="subsection-title">本地评审工位已就绪</h2>
              <p className="section-copy">可查看文档、规则、模型和评审结果。</p>
            </div>

            <div className="desktop-mini-card">
              <p className="section-eyebrow">今日重点</p>
              <div className="feature-list">
                <div className="feature-row">
                  <span className="feature-kicker">任务</span>
                  <div>
                    <strong>{dashboard.reviewJobsCount} 条评审任务留存在队列中</strong>
                    <p className="muted">可继续处理最近任务。</p>
                  </div>
                </div>
                <div className="feature-row">
                  <span className="feature-kicker">配置</span>
                  <div>
                    <strong>
                      {dashboard.enabledRulesCount} 条启用规则，{dashboard.llmProfiles.length} 个模型配置在线
                    </strong>
                    <p className="muted">当前配置可用于新批次。</p>
                  </div>
                </div>
              </div>
            </div>
          </aside>
        </div>

        <div className="desktop-kpi-grid">
          <div className="metric-card">
            <p className="metric-label">已导入文档</p>
            <strong className="metric-value">{dashboard.documentsCount}</strong>
          </div>
          <div className="metric-card">
            <p className="metric-label">评审任务</p>
            <strong className="metric-value">{dashboard.reviewJobsCount}</strong>
          </div>
          <div className="metric-card">
            <p className="metric-label">启用规则</p>
            <strong className="metric-value">{dashboard.enabledRulesCount}</strong>
          </div>
          <div className="metric-card">
            <p className="metric-label">问题标注</p>
            <strong className="metric-value">{dashboard.annotationsCount}</strong>
          </div>
        </div>
      </section>

      <section className="desktop-dashboard-grid">
        <div className="desktop-surface stack">
          <div>
            <p className="section-eyebrow">Recent Reviews</p>
            <h2 className="subsection-title">最近评审</h2>
            <p className="section-copy">查看最近完成或失败的任务。</p>
          </div>

          <div className="list">
            {isLoading ? (
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

        <div className="desktop-surface stack">
          <div>
            <p className="section-eyebrow">Workbench</p>
            <h2 className="subsection-title">常用入口</h2>
            <p className="section-copy">快速进入任务、批次、规则和模型。</p>
          </div>

          <div className="list">
            <Link className="list-item" href="/reviews">
              <div>
                <h3>查看评审任务列表与进度</h3>
                <p className="muted">查看当前任务。</p>
              </div>
              <span className="pill pill-brand">评审任务</span>
            </Link>

            <Link className="list-item" href="/reviews/new">
              <div>
                <h3>创建新的策划案批次</h3>
                <p className="muted">填写批次信息并开始评审。</p>
              </div>
              <span className="pill pill-brand">主操作</span>
            </Link>

            <Link className="list-item" href="/rules">
              <div>
                <h3>维护规则库与提示词模板</h3>
                <p className="muted">管理规则和提示词。</p>
              </div>
              <span className="pill pill-accent">配置台</span>
            </Link>
          </div>
        </div>
      </section>

      <section className="desktop-dashboard-grid">
        <div className="desktop-surface stack">
          <div>
            <p className="section-eyebrow">Readiness</p>
            <h2 className="subsection-title">配置准备度</h2>
            <p className="section-copy">查看当前规则、模型和结果状态。</p>
          </div>

          <div className="feature-list">
            <div className="feature-row">
              <span className="feature-kicker">规则</span>
              <div>
                <strong>{dashboard.rulesCount} 条规则已建档</strong>
                <p className="muted">当前启用规则会参与评审。</p>
              </div>
            </div>
            <div className="feature-row">
              <span className="feature-kicker">模型</span>
              <div>
                <strong>{dashboard.llmProfiles.length} 个启用中的模型配置</strong>
                <p className="muted">启用的模型可用于新批次。</p>
              </div>
            </div>
            <div className="feature-row">
              <span className="feature-kicker">结果</span>
              <div>
                <strong>可查看报告、问题和原文位置</strong>
                <p className="muted">结果页会显示对应内容。</p>
              </div>
            </div>
          </div>
        </div>

        <div className="desktop-surface stack">
          <div>
            <p className="section-eyebrow">Enabled Models</p>
            <h2 className="subsection-title">活跃模型配置</h2>
            <p className="section-copy">这些模型当前处于启用状态，可直接被新评审批次使用。</p>
          </div>

          <div className="feature-list">
            {isLoading ? (
              <div className="feature-row">
                <span className="feature-kicker">模型</span>
                <div>
                  <strong>正在读取模型配置</strong>
                  <p className="muted">完成后会显示当前启用的桌面模型。</p>
                </div>
              </div>
            ) : dashboard.llmProfiles.length === 0 ? (
              <div className="feature-row">
                <span className="feature-kicker">模型</span>
                <div>
                  <strong>当前没有启用模型配置</strong>
                  <p className="muted">先去模型配置页启用一个配置后再开始批次。</p>
                </div>
              </div>
            ) : (
              dashboard.llmProfiles.map((profile) => (
                <div className="feature-row" key={profile.id}>
                  <span className="feature-kicker">{profile.provider}</span>
                  <div>
                    <strong>{profile.name}</strong>
                    <p className="muted">{profile.defaultModel}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
