import { PageIntro } from "@/components/page-intro";
import { ModelManager } from "@/components/model-manager";
import { getModelDashboardData } from "@/lib/llm-profiles";

export default async function ModelsPage() {
  const { metrics, profiles } = await getModelDashboardData();

  return (
    <section className="panel stack-lg">
      <PageIntro
        description="这里统一查看、搜索和维护模型配置。"
        eyebrow="Model Settings"
        title="模型设置"
      />

      <ModelManager metrics={metrics} profiles={profiles} />
    </section>
  );
}
