import { Severity } from "@prisma/client";
import { describe, expect, it, vi } from "vitest";

import { listRules } from "@/desktop/core/rules/list-rules";

describe("listRules", () => {
  it("filters deleted rules by default", async () => {
    const updatedAt = new Date("2026-04-27T09:00:00.000Z");
    const findMany = vi.fn().mockResolvedValue([
      {
        id: "rule_1",
        enabled: true,
        name: "规则一",
        category: "格式",
        severity: Severity.medium,
        description: "说明一",
        promptTemplate: "模板一",
        updatedAt,
      },
    ]);

    const rows = await listRules({
      rule: {
        findMany,
      },
    } as never);

    expect(findMany).toHaveBeenCalledWith({
      where: { deletedAt: null },
      orderBy: [{ enabled: "desc" }, { category: "asc" }, { updatedAt: "desc" }],
    });
    expect(rows).toEqual([
      expect.objectContaining({
        id: "rule_1",
        enabled: true,
        name: "规则一",
        category: "格式",
      }),
    ]);
  });
});
