import { describe, expect, it, vi } from "vitest";

import { createBackgroundRouter } from "@/desktop/worker/background-router";
import { DESKTOP_REQUESTS } from "@/desktop/worker/protocol";

describe("createBackgroundRouter", () => {
  it("routes review list requests through the injected Prisma-backed services", async () => {
    const listReviewJobs = vi.fn().mockResolvedValue([{ id: "job_1" }]);
    const getReviewLaunchData = vi.fn().mockResolvedValue({
      llmProfiles: [],
      rules: [],
      lastBatchRuleIds: [],
    });
    const router = createBackgroundRouter({
      reviews: {
        createReviewBatch: vi.fn(),
        getReviewLaunchData,
        listReviewJobs,
        searchReviewJobs: vi.fn(),
      },
      rules: {
        listRules: vi.fn(),
        searchRules: vi.fn(),
      },
      files: {
        importDocumentsIntoStore: vi.fn(),
      },
    });

    const result = await router.handle({
      id: "msg_1",
      channel: DESKTOP_REQUESTS.reviewJobsList,
    });

    expect(listReviewJobs).toHaveBeenCalledTimes(1);
    expect(result).toEqual([{ id: "job_1" }]);
  });

  it("routes review launch requests through the injected review bootstrap service", async () => {
    const getReviewLaunchData = vi.fn().mockResolvedValue({
      llmProfiles: [{ id: "profile_1" }],
      rules: [{ id: "rule_1" }],
      lastBatchRuleIds: ["rule_1"],
    });
    const router = createBackgroundRouter({
      reviews: {
        createReviewBatch: vi.fn(),
        getReviewLaunchData,
        listReviewJobs: vi.fn(),
        searchReviewJobs: vi.fn(),
      },
      rules: {
        listRules: vi.fn(),
        searchRules: vi.fn(),
      },
      files: {
        importDocumentsIntoStore: vi.fn(),
      },
    });

    const result = await router.handle({
      id: "msg_2",
      channel: DESKTOP_REQUESTS.reviewLaunch,
    });

    expect(getReviewLaunchData).toHaveBeenCalledTimes(1);
    expect(result).toEqual({
      llmProfiles: [{ id: "profile_1" }],
      rules: [{ id: "rule_1" }],
      lastBatchRuleIds: ["rule_1"],
    });
  });
});
