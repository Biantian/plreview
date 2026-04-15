import { ModelManager } from "@/components/model-manager";
import { getModelDashboardData } from "@/lib/llm-profiles";

export default async function ModelsPage() {
  const { metrics, profiles } = await getModelDashboardData();

  return (
    <section className="panel stack-lg">
      <div>
        <p className="section-eyebrow">Model Settings</p>
        <h1 className="section-title">模型设置</h1>
        <p className="section-copy">这里统一查看、搜索和维护模型配置。</p>
      </div>

      <ModelManager metrics={metrics} profiles={profiles} />
    </section>
  );
}
