import { ModelManager } from "@/components/model-manager";
import { prisma } from "@/lib/prisma";

export default async function ModelsPage() {
  const profiles = await prisma.llmProfile.findMany({
    orderBy: [{ enabled: "desc" }, { updatedAt: "desc" }],
  });

  return (
    <section className="panel stack-lg">
      <div>
        <p className="section-eyebrow">Model Settings</p>
        <h1 className="section-title">模型设置</h1>
        <p className="section-copy">管理供应商连接、默认模型和密钥状态。</p>
      </div>

      <ModelManager
        profiles={profiles.map((profile) => ({
          id: profile.id,
          name: profile.name,
          provider: profile.provider,
          vendorKey: profile.vendorKey,
          mode: profile.mode,
          baseUrl: profile.baseUrl,
          defaultModel: profile.defaultModel,
          modelOptionsText: JSON.parse(profile.modelOptionsJson ?? "[]").join("\n"),
          enabled: profile.enabled,
          hasApiKey: profile.hasApiKey,
          apiKeyLast4: profile.apiKeyLast4,
        }))}
      />
    </section>
  );
}
