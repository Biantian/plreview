import Link from "next/link";

import { PageIntro } from "@/components/page-intro";
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
            description="查看当前任务负载、配置准备度和最近产出，直接回到下一步要处理的评审工作。"
            eyebrow="Workspace"
            title="评审工作台"
          />

          <aside className="desktop-info-rail">
            <div className="desktop-mini-card">
              <p className="section-eyebrow">当前值班</p>
              <h2 className="subsection-title">本地评审工位已就绪</h2>
              <p className="section-copy">
                文档导入、规则快照和 OpenAI 兼容模型配置都从这套桌面工作区进入。
              </p>
            </div>

            <div className="desktop-mini-card">
              <p className="section-eyebrow">今日重点</p>
              <div className="feature-list">
                <div className="feature-row">
                  <span className="feature-kicker">任务</span>
                  <div>
                    <strong>{reviewJobsCount} 条评审任务留存在队列中</strong>
                    <p className="muted">先从最近任务继续，避免在不同页面间来回切换。</p>
                  </div>
                </div>
                <div className="feature-row">
                  <span className="feature-kicker">配置</span>
                  <div>
                    <strong>
                      {enabledRulesCount} 条启用规则，{llmProfiles.length} 个模型配置在线
                    </strong>
                    <p className="muted">发起新评审前先确认本次所需规则和模型都已准备好。</p>
                  </div>
                </div>
              </div>
            </div>
          </aside>
        </div>

        <div className="desktop-kpi-grid">
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
      </section>

      <section className="desktop-dashboard-grid">
        <div className="desktop-surface stack">
          <div>
            <p className="section-eyebrow">Recent Reviews</p>
            <h2 className="subsection-title">最近评审</h2>
            <p className="section-copy">从最近完成或失败的任务继续复核、重试或查看报告。</p>
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

        <div className="desktop-surface stack">
          <div>
            <p className="section-eyebrow">Workbench</p>
            <h2 className="subsection-title">常用入口</h2>
            <p className="section-copy">从工作台直接进入任务、发起评审，或维护规则与模型配置。</p>
          </div>

          <div className="list">
            <Link className="list-item" href="/reviews">
              <div>
                <h3>查看评审任务列表与进度</h3>
                <p className="muted">打开评审任务页，继续跟踪当前状态。</p>
              </div>
              <span className="pill pill-brand">评审任务</span>
            </Link>

            <Link className="list-item" href="/reviews/new">
              <div>
                <h3>创建新的策划案批次</h3>
                <p className="muted">上传文件、选择规则和模型后开始执行。</p>
              </div>
              <span className="pill pill-brand">主操作</span>
            </Link>

            <Link className="list-item" href="/rules">
              <div>
                <h3>维护规则库与提示词模板</h3>
                <p className="muted">更新评审口径并保留历史版本可追踪。</p>
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
            <p className="section-copy">确认规则、模型和结果联动已经准备就绪，再进入新一轮评审。</p>
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
                <p className="muted">到模型配置页切换可用配置后再发起批次。</p>
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
        </div>

        <div className="desktop-surface stack">
          <div>
            <p className="section-eyebrow">Enabled Models</p>
            <h2 className="subsection-title">活跃模型配置</h2>
            <p className="section-copy">这些模型当前处于启用状态，可直接被新评审批次使用。</p>
          </div>

          <div className="feature-list">
            {llmProfiles.length === 0 ? (
              <div className="feature-row">
                <span className="feature-kicker">模型</span>
                <div>
                  <strong>当前没有启用模型配置</strong>
                  <p className="muted">先去模型配置页启用一个配置后再开始批次。</p>
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
    </div>
  );
}
