import Link from "next/link";

import { FilePicker } from "@/components/file-picker";
import { createReviewAction } from "@/lib/actions";
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

  const defaultProfile = llmProfiles[0];

  return (
    <div className="grid-main">
      <section className="panel stack-lg">
        <div>
          <p className="section-eyebrow">Review Launchpad</p>
          <h1 className="section-title">新建评审</h1>
          <p className="section-copy">
            在这里启动一次评审任务；详细流程说明可在顶部“帮助”中查看。
          </p>
        </div>

        <form action={createReviewAction} className="form-grid">
          <div className="form-section">
            <div>
              <h2 className="subsection-title">任务设置</h2>
              <p className="section-copy">先确认评审标题与本次使用的模型配置。</p>
            </div>

            <div className="field">
              <label htmlFor="title">评审标题</label>
              <input id="title" name="title" placeholder="可选，不填则使用文件名" />
            </div>

            <div className="form-grid two">
              <div className="field">
                <label htmlFor="llmProfileId">模型配置</label>
                <select
                  defaultValue={defaultProfile?.id}
                  id="llmProfileId"
                  name="llmProfileId"
                  required
                >
                  {llmProfiles.map((profile) => (
                    <option key={profile.id} value={profile.id}>
                      {profile.name} · {profile.provider}
                    </option>
                  ))}
                </select>
              </div>

              <div className="field">
                <label htmlFor="modelName">模型名称</label>
                <input
                  defaultValue={defaultProfile?.defaultModel}
                  id="modelName"
                  name="modelName"
                  placeholder="例如 qwen-plus"
                />
              </div>
            </div>
          </div>

          <div className="form-section">
            <div>
              <h2 className="subsection-title">文档导入</h2>
              <p className="section-copy">文件会被解析为段落数组，后续标注结果也会按段落回写。</p>
            </div>
            <FilePicker />
          </div>

          <div className="form-section">
            <div>
              <h2 className="subsection-title">本次评审规则</h2>
              <p className="section-copy">默认勾选所有启用规则，你也可以只保留本次需要的审查口径。</p>
            </div>

            <div className="checkbox-list">
              {rules.length === 0 ? (
                <div className="checkbox-card">
                  <div>
                    <strong>还没有启用规则</strong>
                    <p className="muted">
                      先去 <Link href="/rules">规则管理</Link> 页面创建至少一条启用规则。
                    </p>
                  </div>
                </div>
              ) : (
                rules.map((rule) => (
                  <label className="checkbox-card" key={rule.id}>
                    <input defaultChecked name="ruleIds" type="checkbox" value={rule.id} />
                    <div>
                      <strong>{rule.name}</strong>
                      <p className="muted">
                        {rule.category} · {rule.description}
                      </p>
                    </div>
                  </label>
                ))
              )}
            </div>
          </div>

          <div className="actions">
            <button className="button" disabled={rules.length === 0} type="submit">
              开始评审并返回列表
            </button>
          </div>
        </form>
      </section>

      <aside className="stack-lg">
        <section className="card stack">
          <div>
            <p className="section-eyebrow">Quick Help</p>
            <h2 className="section-title">快速提示</h2>
            <p className="section-copy">这里专注于发起任务，完整流程和配置说明统一放到帮助页。</p>
          </div>

          <div className="actions">
            <Link className="button-ghost" href="/docs">
              查看帮助
            </Link>
            <Link className="button-ghost" href="/models">
              管理模型配置
            </Link>
          </div>
        </section>

        <section className="card stack">
          <div>
            <p className="section-eyebrow">Current Setup</p>
            <h2 className="section-title">当前资源</h2>
            <p className="section-copy">模型配置和规则都在独立页面维护，这里只负责选择并启动本次任务。</p>
          </div>

          <div className="feature-list">
            <div className="feature-row">
              <span className="feature-kicker">规则</span>
              <div>
                <strong>{rules.length} 条启用规则可用</strong>
                <p className="muted">当前页只会展示启用状态的规则，减少误选和空跑。</p>
              </div>
            </div>
            <div className="feature-row">
              <span className="feature-kicker">模型</span>
              <div>
                <strong>{llmProfiles.length} 个配置可选</strong>
                <p className="muted">请在模型设置页维护供应商、模型与密钥状态。</p>
              </div>
            </div>
          </div>
        </section>
      </aside>
    </div>
  );
}
