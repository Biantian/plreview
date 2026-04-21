"use client";

import Link from "next/link";
import { startTransition, useEffect, useState } from "react";

import type { ModelDashboardData } from "@/desktop/bridge/desktop-api";
import { PageIntro } from "@/components/page-intro";
import { ModelManager } from "@/components/model-manager";

const EMPTY_MODEL_DASHBOARD: ModelDashboardData = {
  metrics: {
    totalCount: 0,
    enabledCount: 0,
    liveCount: 0,
    latestUpdatedAtLabel: "--",
  },
  profiles: [],
};

export default function ModelsPage() {
  const [dashboard, setDashboard] = useState<ModelDashboardData>(EMPTY_MODEL_DASHBOARD);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadModels() {
      if (!window.plreview?.getModelDashboard) {
        setErrorMessage("桌面桥接不可用，请从 Electron 桌面壳启动。");
        setIsLoading(false);
        return;
      }

      try {
        const nextDashboard = await window.plreview.getModelDashboard();

        if (cancelled) {
          return;
        }

        startTransition(() => {
          setDashboard(nextDashboard);
          setErrorMessage(null);
        });
      } catch (error) {
        if (!cancelled) {
          setErrorMessage(error instanceof Error ? error.message : "模型配置加载失败。");
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadModels();

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
                <Link className="button-ghost" href="/rules">
                  查看规则库
                </Link>
              </>
            }
            description="查看和管理模型配置。"
            eyebrow="Model Settings"
            title="模型配置"
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
              <Link className="button-ghost" href="/rules">
                查看规则库
              </Link>
            </>
          }
          description="查看和管理模型配置。"
          eyebrow="Model Settings"
          title="模型配置"
        />

        <div className="desktop-kpi-grid">
          <div className="metric-card">
            <p className="metric-label">模型总数</p>
            <strong className="metric-value">{dashboard.metrics.totalCount}</strong>
          </div>
          <div className="metric-card">
            <p className="metric-label">启用中</p>
            <strong className="metric-value">{dashboard.metrics.enabledCount}</strong>
          </div>
          <div className="metric-card">
            <p className="metric-label">实时模式</p>
            <strong className="metric-value">{dashboard.metrics.liveCount}</strong>
          </div>
          <div className="metric-card">
            <p className="metric-label">最近更新</p>
            <strong className="metric-value">{dashboard.metrics.latestUpdatedAtLabel}</strong>
          </div>
        </div>
      </section>

      {isLoading ? (
        <section className="desktop-surface stack">
          <p className="section-copy">正在读取模型配置。</p>
        </section>
      ) : (
        <ModelManager profiles={dashboard.profiles} />
      )}
    </div>
  );
}
