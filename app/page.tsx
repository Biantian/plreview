import Link from "next/link";

import { StatusBadge } from "@/components/status-badge";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/utils";

export default async function HomePage() {
  const [
    rulesCount,
    enabledRulesCount,
    documentsCount,
    reviewJobsCount,
    annotationsCount,
    recentReviews,
    llmProfiles,
  ] = await Promise.all([
    prisma.rule.count(),
    prisma.rule.count({ where: { enabled: true } }),
    prisma.document.count(),
    prisma.reviewJob.count(),
    prisma.annotation.count(),
    prisma.reviewJob.findMany({
      include: {
        document: true,
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 5,
    }),
    prisma.llmProfile.findMany({
      where: { enabled: true },
      orderBy: { updatedAt: "desc" },
    }),
  ]);

  return (
    <>
      <section className="hero-grid">
        <div className="panel stack-lg">
          <div className="stack">
            <div className="inline-actions">
              <span className="pill pill-brand">精品评审工作台</span>
              <span className="pill">本机运行</span>
              <span className="pill">OpenAI 兼容接口</span>
            </div>

            <div className="hero-copy stack">
              <h1 className="hero-title">把策划案评审的启动、判断与定位放进同一张工作台。</h1>
              <p className="hero-lead">
                这版首页不再只是在展示模块，而是直接把你带入工作状态。上传文档、套用规则、触发模型评审、回看段落命中，都围绕同一个主流程组织。
              </p>
            </div>

            <div className="actions">
              <Link className="button" href="/reviews/new">
                开始新评审
              </Link>
              <Link className="button-ghost" href="/rules">
                打开规则库
              </Link>
            </div>
          </div>

          <div className="hero-strip">
            <div className="hero-strip-item">
              <strong>上传与解析</strong>
              <p className="muted">支持 `docx`、`txt`、`md`，并自动拆分为可定位的段落结构。</p>
            </div>
            <div className="hero-strip-item">
              <strong>规则冻结</strong>
              <p className="muted">评审时固化规则版本，历史报告可回看、可追溯。</p>
            </div>
            <div className="hero-strip-item">
              <strong>问题回查</strong>
              <p className="muted">报告、问题清单与原文段落同屏联动，落点更快找到。</p>
            </div>
          </div>
        </div>

        <aside className="panel stack">
          <div>
            <p className="section-eyebrow">Workspace Snapshot</p>
            <h2 className="section-title">当前概览</h2>
            <p className="section-copy">首屏保留品牌感，但第一优先级仍然是让你立即进入评审流程。</p>
          </div>

          <div className="metric-grid">
            <div className="metric-card">
              <p className="metric-label">已导入文档</p>
              <strong className="metric-value">{documentsCount}</strong>
            </div>
            <div className="metric-card">
              <p className="metric-label">评审任务</p>
              <strong className="metric-value">{reviewJobsCount}</strong>
            </div>
            <div className="metric-card">
              <p className="metric-label">启用规则</p>
              <strong className="metric-value">{enabledRulesCount}</strong>
            </div>
            <div className="metric-card">
              <p className="metric-label">问题标注</p>
              <strong className="metric-value">{annotationsCount}</strong>
            </div>
          </div>

          <div className="feature-list">
            <div className="feature-row">
              <span className="feature-kicker">规则</span>
              <div>
                <strong>{rulesCount} 条规则已建档</strong>
                <p className="muted">规则可以持续编辑，但每次评审都会保留当时的冻结快照。</p>
              </div>
            </div>
            <div className="feature-row">
              <span className="feature-kicker">模型</span>
              <div>
                <strong>{llmProfiles.length} 个启用中的模型配置</strong>
                <p className="muted">默认接百炼兼容接口，未配置 API Key 时也能切换到演示模式验证流程。</p>
              </div>
            </div>
            <div className="feature-row">
              <span className="feature-kicker">联动</span>
              <div>
                <strong>报告、问题、原文三处互相映射</strong>
                <p className="muted">详情页已经围绕“先发现问题，再快速定位原文”来组织阅读路径。</p>
              </div>
            </div>
          </div>
        </aside>
      </section>

      <section className="grid-2">
        <div className="card stack">
          <div>
            <p className="section-eyebrow">Recent Reviews</p>
            <h2 className="section-title">最近评审</h2>
            <p className="section-copy">从首页就能回看最近任务，避免每次都从列表重新查找。</p>
          </div>

          <div className="list">
            {recentReviews.length === 0 ? (
              <div className="list-item">
                <div>
                  <h3>还没有评审记录</h3>
                  <p className="muted">先上传一份策划案，跑一遍完整流程后，这里会变成你的工作回看入口。</p>
                </div>
              </div>
            ) : (
              recentReviews.map((review) => (
                <Link className="list-item" href={`/reviews/${review.id}`} key={review.id}>
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
            <p className="section-eyebrow">Workbench</p>
            <h2 className="section-title">工作入口</h2>
            <p className="section-copy">首页不铺太多冗余内容，而是把你最常用的两件事放在显眼位置。</p>
          </div>

          <div className="list">
            <Link className="list-item" href="/reviews/new">
              <div>
                <h3>创建一次新的策划案评审</h3>
                <p className="muted">从文件导入、规则快照到报告生成，一次完成完整启动流程。</p>
              </div>
              <span className="pill pill-brand">主操作</span>
            </Link>

            <Link className="list-item" href="/rules">
              <div>
                <h3>维护评审规则与提示词模板</h3>
                <p className="muted">统一调整评审口径，并保持历史结果仍然可追踪到旧版本规则。</p>
              </div>
              <span className="pill pill-accent">配置台</span>
            </Link>
          </div>

          <div className="feature-list">
            {llmProfiles.length === 0 ? (
              <div className="feature-row">
                <span className="feature-kicker">模型</span>
                <div>
                  <strong>当前没有启用模型配置</strong>
                  <p className="muted">你仍然可以先使用演示模式验证 UI 和流程，再回头补接真实模型。</p>
                </div>
              </div>
            ) : (
              llmProfiles.map((profile) => (
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
    </>
  );
}
