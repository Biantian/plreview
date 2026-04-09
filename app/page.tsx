import Link from "next/link";

import { StatusBadge } from "@/components/status-badge";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/utils";

export default async function HomePage() {
  const [rulesCount, enabledRulesCount, documentsCount, recentReviews, llmProfiles] =
    await Promise.all([
      prisma.rule.count(),
      prisma.rule.count({ where: { enabled: true } }),
      prisma.document.count(),
      prisma.reviewJob.findMany({
        include: {
          document: true,
        },
        orderBy: {
          createdAt: "desc",
        },
        take: 6,
      }),
      prisma.llmProfile.findMany({
        where: { enabled: true },
        orderBy: { updatedAt: "desc" },
      }),
    ]);

  return (
    <>
      <section className="hero">
        <div className="panel stack">
          <span className="pill">本机启动 · OpenAI 兼容接口 · 段落级标注</span>
          <h1 className="section-title">把策划案评审流程先跑顺，再逐步做深。</h1>
          <p className="section-copy">
            当前 MVP 已按“上传文档、选择规则、调用百炼兼容接口、生成报告、回看段落标注”的路径组织。
            这版既支持真实模型评审，也支持未配置 API Key 时的本地演示模式。
          </p>
          <div className="actions">
            <Link className="button" href="/reviews/new">
              开始新评审
            </Link>
            <Link className="button-ghost" href="/rules">
              管理评审规则
            </Link>
          </div>
        </div>

        <div className="panel stack">
          <h2 className="section-title">当前概览</h2>
          <div className="stats">
            <div className="stat">
              <span className="muted">规则总数</span>
              <strong>{rulesCount}</strong>
            </div>
            <div className="stat">
              <span className="muted">启用规则</span>
              <strong>{enabledRulesCount}</strong>
            </div>
            <div className="stat">
              <span className="muted">已导入文档</span>
              <strong>{documentsCount}</strong>
            </div>
          </div>
        </div>
      </section>

      <section className="grid-2">
        <div className="card stack">
          <div>
            <h2 className="section-title">最近评审</h2>
            <p className="section-copy">最近 6 条任务会展示在这里，便于快速回看。</p>
          </div>

          <div className="list">
            {recentReviews.length === 0 ? (
              <div className="list-item">
                <div>
                  <h3>还没有评审记录</h3>
                  <p className="muted">先去上传一份策划案试跑完整流程。</p>
                </div>
              </div>
            ) : (
              recentReviews.map((review) => (
                <Link
                  className="list-item"
                  href={`/reviews/${review.id}`}
                  key={review.id}
                >
                  <div>
                    <h3>{review.document.title}</h3>
                    <p className="muted">
                      {review.modelNameSnapshot} · {formatDate(review.createdAt)}
                    </p>
                  </div>
                  <StatusBadge status={review.status} />
                </Link>
              ))
            )}
          </div>
        </div>

        <div className="card stack">
          <div>
            <h2 className="section-title">模型配置</h2>
            <p className="section-copy">MVP 目前只接 OpenAI 兼容接口，默认预置百炼配置。</p>
          </div>

          <div className="list">
            {llmProfiles.map((profile) => (
              <div className="list-item" key={profile.id}>
                <div>
                  <h3>{profile.name}</h3>
                  <p className="muted">
                    {profile.provider} · {profile.defaultModel}
                  </p>
                </div>
                <span className="pill">已启用</span>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
