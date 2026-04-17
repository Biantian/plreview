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
              <h1 className="hero-title">上传文档，选择规则和模型，直接开始评审。</h1>
              <p className="hero-lead">从这里进入新评审、查看任务进度，或回到规则与模型设置完成准备工作。</p>
            </div>

            <div className="actions">
              <Link className="button" href="/reviews/new">
                开始新评审
              </Link>
              <Link className="button-ghost" href="/reviews">
                打开评审列表
              </Link>
              <Link className="button-ghost" href="/docs">
                查看文档
              </Link>
            </div>
          </div>

          <div className="hero-strip">
            <div className="hero-strip-item">
              <strong>上传文档</strong>
              <p className="muted">支持 `docx`、`txt`、`md`，导入后可直接开始评审。</p>
            </div>
            <div className="hero-strip-item">
              <strong>锁定规则</strong>
              <p className="muted">评审时自动保留规则快照，便于后续回查。</p>
            </div>
            <div className="hero-strip-item">
              <strong>定位问题</strong>
              <p className="muted">从报告、问题清单和原文段落之间快速跳转。</p>
            </div>
          </div>
        </div>

        <aside className="panel stack">
          <div>
            <p className="section-eyebrow">Workspace Snapshot</p>
            <h2 className="section-title">运行概览</h2>
            <p className="section-copy">查看文档、任务、规则和问题的当前状态。</p>
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
                <p className="muted">评审前确认规则已启用，执行时会保留快照。</p>
              </div>
            </div>
            <div className="feature-row">
              <span className="feature-kicker">模型</span>
              <div>
                <strong>{llmProfiles.length} 个启用中的模型配置</strong>
                <p className="muted">到模型设置页切换可用配置后再发起评审。</p>
              </div>
            </div>
            <div className="feature-row">
              <span className="feature-kicker">联动</span>
              <div>
                <strong>报告、问题、原文三处互相联动</strong>
                <p className="muted">发现命中后可以直接跳到对应原文段落。</p>
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
            <p className="section-copy">查看最近任务并继续处理结果。</p>
          </div>

          <div className="list">
            {recentReviews.length === 0 ? (
              <div className="list-item">
                <div>
                  <h3>还没有评审记录</h3>
                  <p className="muted">先创建一个新评审，结果会出现在这里。</p>
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
            <h2 className="section-title">常用操作</h2>
            <p className="section-copy">新建评审、查看任务和维护规则都在这里。</p>
          </div>

          <div className="list">
            <Link className="list-item" href="/reviews">
              <div>
                <h3>查看评审任务列表与进度</h3>
                <p className="muted">打开列表继续跟踪任务状态。</p>
              </div>
              <span className="pill pill-brand">任务中心</span>
            </Link>

            <Link className="list-item" href="/reviews/new">
              <div>
                <h3>创建新的策划案评审</h3>
                <p className="muted">上传文件、选择规则和模型后开始执行。</p>
              </div>
              <span className="pill pill-brand">主操作</span>
            </Link>

            <Link className="list-item" href="/rules">
              <div>
                <h3>维护评审规则与提示词模板</h3>
                <p className="muted">更新评审口径并保留历史版本可追踪。</p>
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
                  <p className="muted">先去模型设置页启用一个配置后再开始评审。</p>
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
