export default function DocsPage() {
  return (
    <div className="page-stack">
      <section className="panel stack-lg">
        <div className="page-header">
          <p className="section-eyebrow">Docs</p>
          <h1 className="section-title">帮助中心</h1>
          <p className="section-copy">
            这里把模型配置、规则编写、提交流程和结果阅读整理成一份连续的操作说明。先看工作流程，再按需跳到对应章节。
          </p>
        </div>

        <div className="inline-actions">
          <span className="pill pill-brand">建议先读工作流程</span>
          <span className="pill">模型配置</span>
          <span className="pill">规则编写</span>
          <span className="pill">结果阅读</span>
        </div>

        <section className="stack" id="workflow">
          <div className="page-header">
            <h2 className="subsection-title">工作流程</h2>
            <p className="section-copy">
              这条路径适合第一次上手。目标是先确认模型和规则都准备好，再把文档送进评审队列，最后回到结果页做核对。
            </p>
          </div>

          <div className="list">
            <article className="list-item">
              <div>
                <h3>1. 先检查模型配置</h3>
                <p className="muted">确认供应商连接可用、默认模型已选好、API Key 已填写或至少有可用的演示配置。</p>
              </div>
            </article>
            <article className="list-item">
              <div>
                <h3>2. 再确认本次要用的规则</h3>
                <p className="muted">只保留这次评审真正需要的规则，避免一次性塞入太多口径，导致结果难以解释。</p>
              </div>
            </article>
            <article className="list-item">
              <div>
                <h3>3. 上传文档并提交评审</h3>
                <p className="muted">文档会被拆成段落和片段，系统会把规则和模型一起送去后台处理，前台只负责显示状态。</p>
              </div>
            </article>
            <article className="list-item">
              <div>
                <h3>4. 回到结果页做复核</h3>
                <p className="muted">等任务完成后，打开结果页先看摘要，再逐条检查命中项和原文位置，确认结论是否成立。</p>
              </div>
            </article>
          </div>
        </section>

        <section className="stack" id="models">
          <div className="page-header">
            <h2 className="subsection-title">模型配置</h2>
            <p className="section-copy">
              模型设置页负责维护供应商、Base URL、默认模型和 API Key。帮助页只说明怎么选，不替代实际配置界面。
            </p>
          </div>

          <div className="list">
            <article className="list-item">
              <div>
                <h3>供应商与连接地址</h3>
                <p className="muted">如果你接入的是兼容 OpenAI 风格的服务，先填对 Base URL，再确认供应商名称和接口格式没有偏差。</p>
              </div>
            </article>
            <article className="list-item">
              <div>
                <h3>默认模型</h3>
                <p className="muted">默认模型应该覆盖日常评审场景，优先选稳定、成本可控、输出格式一致的配置，减少每次手动切换。</p>
              </div>
            </article>
            <article className="list-item">
              <div>
                <h3>API Key 与可用性</h3>
                <p className="muted">只要密钥无效，后台任务就会失败；提交前最好先确认模型页显示的连接状态和密钥尾号是否符合预期。</p>
              </div>
            </article>
          </div>
        </section>

        <section className="stack" id="rules">
          <div className="page-header">
            <h2 className="subsection-title">规则编写</h2>
            <p className="section-copy">
              规则要像清晰的评审指令，而不是抽象的愿望清单。把目标、判断标准、输出格式和严重程度都写明白，模型才更容易稳定执行。
            </p>
          </div>

          <div className="list">
            <article className="list-item">
              <div>
                <h3>先写检查目标</h3>
                <p className="muted">说明这条规则到底在看什么，例如一致性、缺失项、越权表述、数字错误或格式偏差。</p>
              </div>
            </article>
            <article className="list-item">
              <div>
                <h3>再写判断标准</h3>
                <p className="muted">避免只说“注意表达”，而是明确什么情况算命中、什么情况算通过，并尽量给出可观察的判断条件。</p>
              </div>
            </article>
            <article className="list-item">
              <div>
                <h3>最后定义命中输出</h3>
                <p className="muted">建议写清楚问题摘要、命中的原文依据、建议修正方式，以及是否需要标记为低/中/高风险。</p>
              </div>
            </article>
          </div>
        </section>

        <section className="stack" id="results">
          <div className="page-header">
            <h2 className="subsection-title">结果阅读</h2>
            <p className="section-copy">
              结果页不是只看总分，而是要顺着摘要、命中列表和原文联动逐步核对。这样能快速判断结论是否可靠，哪里需要回头修规则。
            </p>
          </div>

          <div className="list">
            <article className="list-item">
              <div>
                <h3>先看整体状态</h3>
                <p className="muted">如果任务是 completed，可以直接进入核对；如果是 partial 或 failed，先看错误信息和可恢复的任务片段。</p>
              </div>
            </article>
            <article className="list-item">
              <div>
                <h3>再看命中与证据</h3>
                <p className="muted">每个问题都应该能对应回原文位置。优先检查命中片段是否足够完整，是否真的支持当前结论。</p>
              </div>
            </article>
            <article className="list-item">
              <div>
                <h3>最后决定下一步</h3>
                <p className="muted">如果是规则问题，回到规则页调整描述；如果是模型问题，回到模型页换配置；如果是文档问题，重新上传再跑一次。</p>
              </div>
            </article>
          </div>
        </section>
      </section>
    </div>
  );
}
