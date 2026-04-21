"use client";

import Link from "next/link";
import { startTransition, useEffect, useState } from "react";

import type { RuleDashboardData } from "@/desktop/bridge/desktop-api";
import { PageIntro } from "@/components/page-intro";
import { RulesTable } from "@/components/rules-table";

const EMPTY_RULE_DASHBOARD: RuleDashboardData = {
  enabledCount: 0,
  categoryCount: 0,
  latestUpdatedAtLabel: "--",
  items: [],
  totalCount: 0,
};

export default function RulesPage() {
  const [dashboard, setDashboard] = useState<RuleDashboardData>(EMPTY_RULE_DASHBOARD);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadRules() {
      if (!window.plreview?.getRuleDashboard) {
        setErrorMessage("桌面桥接不可用，请从 Electron 桌面壳启动。");
        setIsLoading(false);
        return;
      }

      try {
        const nextDashboard = await window.plreview.getRuleDashboard();

        if (cancelled) {
          return;
        }

        startTransition(() => {
          setDashboard(nextDashboard);
          setErrorMessage(null);
        });
      } catch (error) {
        if (!cancelled) {
          setErrorMessage(error instanceof Error ? error.message : "规则库加载失败。");
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadRules();

    return () => {
      cancelled = true;
    };
  }, []);

  if (!isLoading && errorMessage) {
    return (
      <div className="desktop-management-page stack-lg">
        <section className="panel stack-lg">
          <PageIntro
            actions={
              <>
                <Link className="button" href="/reviews/new">
                  去新建批次
                </Link>
                <Link className="button-ghost" href="/models">
                  查看模型配置
                </Link>
              </>
            }
            description="查看和管理规则。"
            eyebrow="Rule Library"
            title="规则库"
          />
          <p className="section-copy">加载失败：{errorMessage}</p>
          <p className="section-copy">请确认桌面桥接可用后重试。</p>
        </section>
      </div>
    );
  }

  return (
    <div className="desktop-management-page stack-lg">
      <section className="panel stack-lg">
        <PageIntro
          actions={
            <>
              <Link className="button" href="/reviews/new">
                去新建批次
              </Link>
              <Link className="button-ghost" href="/models">
                查看模型配置
              </Link>
            </>
          }
          description="查看和管理规则。"
          eyebrow="Rule Library"
          title="规则库"
        />

        <div className="desktop-kpi-grid">
          <div className="metric-card">
            <p className="metric-label">规则总数</p>
            <strong className="metric-value">{dashboard.totalCount}</strong>
          </div>
          <div className="metric-card">
            <p className="metric-label">启用中</p>
            <strong className="metric-value">{dashboard.enabledCount}</strong>
          </div>
          <div className="metric-card">
            <p className="metric-label">分类数</p>
            <strong className="metric-value">{dashboard.categoryCount}</strong>
          </div>
          <div className="metric-card">
            <p className="metric-label">最近更新</p>
            <strong className="metric-value">{dashboard.latestUpdatedAtLabel}</strong>
          </div>
        </div>
      </section>

      {isLoading ? (
        <section className="desktop-surface stack">
          <p className="section-copy">正在读取规则库。</p>
        </section>
      ) : (
        <RulesTable items={dashboard.items} />
      )}
    </div>
  );
}
