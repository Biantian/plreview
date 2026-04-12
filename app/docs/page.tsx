export default function DocsPage() {
  return (
    <div className="grid-main">
      <section className="panel stack-lg">
        <div>
          <p className="section-eyebrow">Docs</p>
          <h1 className="section-title">帮助中心</h1>
          <p className="section-copy">把完整流程说明、规则写法和模型配置说明集中到这里。</p>
        </div>

        <section className="card stack">
          <h2 className="subsection-title">工作流程</h2>
          <p className="muted">上传文档、选择规则与模型、等待后台评审、回到结果页阅读报告与原文命中。</p>
        </section>

        <section className="card stack">
          <h2 className="subsection-title">规则怎么写</h2>
          <p className="muted">每条规则都应说明检查目标、判断标准和命中后的建议输出。</p>
        </section>

        <section className="card stack">
          <h2 className="subsection-title">模型怎么配</h2>
          <p className="muted">在模型设置页维护供应商、Base URL、默认模型和 API Key，评审时只负责选择配置。</p>
        </section>
      </section>
    </div>
  );
}
