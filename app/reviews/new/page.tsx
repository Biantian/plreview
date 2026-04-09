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
      <section className="panel stack">
        <div>
          <h1 className="section-title">新建评审</h1>
          <p className="section-copy">
            这一步会完成文件导入、规则快照、模型评审和报告入库。若未配置 API Key，系统会自动使用演示模式帮助你先验证流程。
          </p>
        </div>

        <form action={createReviewAction} className="form-grid">
          <div className="field">
            <label htmlFor="title">评审标题</label>
            <input
              id="title"
              name="title"
              placeholder="可选，不填则使用文件名"
            />
          </div>

          <FilePicker />

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

          <div className="field">
            <span>本次评审规则</span>
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
              开始评审
            </button>
          </div>
        </form>
      </section>

      <section className="stack">
        <div className="card">
          <h2 className="section-title">本版说明</h2>
          <p className="section-copy">
            当前结果以段落级标注为主。评审页会同时展示报告摘要、问题列表和原文高亮，便于快速回看问题落点。
          </p>
        </div>

        <div className="card stack">
          <h2 className="section-title">接入百炼</h2>
          <p className="section-copy">
            在项目根目录创建 <code>.env</code>，填入百炼兼容接口 API Key。默认 base URL
            已按你确认的地址预置。
          </p>
          <div className="hint">
            <code>OPENAI_COMPATIBLE_API_KEY</code>
          </div>
          <div className="hint">
            <code>OPENAI_COMPATIBLE_BASE_URL=https://dashscope.aliyuncs.com/compatible-mode/v1</code>
          </div>
        </div>
      </section>
    </div>
  );
}
