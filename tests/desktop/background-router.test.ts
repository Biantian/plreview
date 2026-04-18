import { describe, expect, it, vi } from "vitest";

import { createBackgroundRouter } from "@/desktop/worker/background-router";

describe("createBackgroundRouter", () => {
  it("routes review list requests through the injected Prisma-backed services", async () => {
    const listReviewJobs = vi.fn().mockResolvedValue([{ id: "job_1" }]);
    const router = createBackgroundRouter({
      reviews: {
        listReviewJobs,
      },
      rules: {
        listRules: vi.fn(),
        searchRules: vi.fn(),
      },
      files: {
        importDocumentsIntoStore: vi.fn(),
      },
    } as never);

    const result = await router.handle({
      id: "msg_1",
      channel: "review-jobs:list",
    });

    expect(listReviewJobs).toHaveBeenCalledTimes(1);
    expect(result).toEqual([{ id: "job_1" }]);
  });
});
