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
            这里负责创建评审任务并立即回到任务列表。文档解析、规则快照、模型评审和报告入库会在后台继续完成，方便你提交后马上回到工作台。
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
            <p className="section-eyebrow">Flow</p>
            <h2 className="section-title">这次提交会发生什么</h2>
          </div>

          <div className="feature-list">
            <div className="feature-row">
              <span className="feature-kicker">01</span>
              <div>
                <strong>导入文件并解析段落</strong>
                <p className="muted">系统会把原文整理成可定位结构，并先创建一条可追踪的评审任务。</p>
              </div>
            </div>
            <div className="feature-row">
              <span className="feature-kicker">02</span>
              <div>
                <strong>跳回评审列表并在后台执行</strong>
                <p className="muted">提交后会立刻返回评审列表，任务状态先显示为“评审中”。</p>
              </div>
            </div>
            <div className="feature-row">
              <span className="feature-kicker">03</span>
              <div>
                <strong>生成报告并标注原文</strong>
                <p className="muted">评审完成后会生成 Markdown 报告、问题清单和正文命中提示。</p>
              </div>
            </div>
          </div>
        </section>

        <section className="card stack">
          <div>
            <p className="section-eyebrow">Runtime</p>
            <h2 className="section-title">运行环境</h2>
            <p className="section-copy">未配置真实 Key 时，系统会自动切换到演示模式，方便先验证流程。</p>
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
                <p className="muted">默认 base URL 已预置为百炼 OpenAI 兼容地址。</p>
              </div>
            </div>
          </div>

          <div className="hint">
            <code>OPENAI_COMPATIBLE_API_KEY</code>
          </div>
          <div className="hint">
            <code>OPENAI_COMPATIBLE_BASE_URL=https://dashscope.aliyuncs.com/compatible-mode/v1</code>
          </div>
        </section>
      </aside>
    </div>
  );
}
