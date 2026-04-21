"use client";

import Link from "next/link";
import { startTransition, useEffect, useState } from "react";

import type {
  ModelDashboardData,
  RuleDashboardData,
} from "@/desktop/bridge/desktop-api";
import { IntakeWorkbench } from "@/components/intake-workbench";
import { PageIntro } from "@/components/page-intro";

const EMPTY_RULE_DASHBOARD: RuleDashboardData = {
  enabledCount: 0,
  categoryCount: 0,
  latestUpdatedAtLabel: "--",
  items: [],
  totalCount: 0,
};

const EMPTY_MODEL_DASHBOARD: ModelDashboardData = {
  metrics: {
    totalCount: 0,
    enabledCount: 0,
    liveCount: 0,
    latestUpdatedAtLabel: "--",
  },
  profiles: [],
};

export default function NewReviewPage() {
  const [ruleDashboard, setRuleDashboard] = useState<RuleDashboardData>(EMPTY_RULE_DASHBOARD);
  const [modelDashboard, setModelDashboard] = useState<ModelDashboardData>(EMPTY_MODEL_DASHBOARD);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadLaunchData() {
      if (!window.plreview?.getRuleDashboard || !window.plreview?.getModelDashboard) {
        setErrorMessage("桌面桥接不可用，请从 Electron 桌面壳启动。");
        setIsLoading(false);
        return;
      }

      try {
        const [nextRuleDashboard, nextModelDashboard] = await Promise.all([
          window.plreview.getRuleDashboard(),
          window.plreview.getModelDashboard(),
        ]);

        if (cancelled) {
          return;
        }

        startTransition(() => {
          setRuleDashboard(nextRuleDashboard);
          setModelDashboard(nextModelDashboard);
          setErrorMessage(null);
        });
      } catch (error) {
        if (!cancelled) {
          setErrorMessage(error instanceof Error ? error.message : "启动配置加载失败。");
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadLaunchData();

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
                <Link className="button" href="/reviews">
                  返回评审任务
                </Link>
                <Link className="button-ghost" href="/rules">
                  打开规则库
                </Link>
              </>
            }
            description="填写批次信息、选择规则并导入文件。"
            eyebrow="Review Launch"
            title="新建批次"
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
              <Link className="button" href="/reviews">
                返回评审任务
              </Link>
              <Link className="button-ghost" href="/rules">
                打开规则库
              </Link>
            </>
          }
          description="填写批次信息、选择规则并导入文件。"
          eyebrow="Review Launch"
          title="新建批次"
        />

        {isLoading ? (
          <p className="section-copy">正在准备模型配置、规则库和本地启动环境。</p>
        ) : (
          <IntakeWorkbench
            llmProfiles={modelDashboard.profiles.filter((profile) => profile.enabled)}
            rules={ruleDashboard.items.filter((rule) => rule.enabled)}
          />
        )}
      </section>
    </div>
  );
}
