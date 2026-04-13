import { IntakeWorkbench } from "@/components/intake-workbench";
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

  return <IntakeWorkbench llmProfiles={llmProfiles} rules={rules} />;
}
