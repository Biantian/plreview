"use client";

import { startTransition, useEffect, useState } from "react";

import type { ReviewLaunchData } from "@/desktop/bridge/desktop-api";
import { IntakeWorkbench } from "@/components/intake-workbench";
import { PageIntro } from "@/components/page-intro";

const EMPTY_REVIEW_LAUNCH_DATA: ReviewLaunchData = {
  llmProfiles: [],
  rules: [],
  lastBatchRuleIds: [],
};

export default function NewReviewPage() {
  const [launchData, setLaunchData] = useState<ReviewLaunchData>(EMPTY_REVIEW_LAUNCH_DATA);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadLaunchData() {
      if (!window.plreview?.getReviewLaunchData) {
        setErrorMessage("桌面桥接不可用，请从 Electron 桌面壳启动。");
        setIsLoading(false);
        return;
      }

      try {
        const nextLaunchData = await window.plreview.getReviewLaunchData();

        if (cancelled) {
          return;
        }

        startTransition(() => {
          setLaunchData(nextLaunchData);
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
          description="填写批次信息、选择规则并导入文件。"
          eyebrow="Review Launch"
          title="新建批次"
        />

        {isLoading ? (
          <p className="section-copy">正在准备模型配置、规则库和本地启动环境。</p>
        ) : (
          <IntakeWorkbench
            initialRuleIds={launchData.lastBatchRuleIds}
            llmProfiles={launchData.llmProfiles}
            rules={launchData.rules}
          />
        )}
      </section>
    </div>
  );
}
