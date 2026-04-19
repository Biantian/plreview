import Link from "next/link";

import { IntakeWorkbench } from "@/components/intake-workbench";
import { PageIntro } from "@/components/page-intro";
import { prisma } from "@/lib/prisma";

export default async function NewReviewPage() {
  const [rules, llmProfiles] = await Promise.all([
    prisma.rule.findMany({
      where: { enabled: true },
      orderBy: [{ category: "asc" }, { updatedAt: "desc" }],
    }),
    prisma.llmProfile.findMany({
      where: { enabled: true },
      orderBy: { updatedAt: "desc" },
    }),
  ]);

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
          description="在桌面工作区里完成批次配置、规则勾选与本地文件导入，然后直接发起新的评审批次。"
          eyebrow="Review Launch"
          title="新建批次"
        />

        <IntakeWorkbench llmProfiles={llmProfiles} rules={rules} />
      </section>
    </div>
  );
}
