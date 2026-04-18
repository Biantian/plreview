import { beforeEach, describe, expect, it, vi } from "vitest";

const { queueReviewJobRetry } = vi.hoisted(() => ({
  queueReviewJobRetry: vi.fn(),
}));

vi.mock("@/lib/review-jobs", () => ({
  queueReviewJobRetry,
}));

import { POST } from "../../app/api/reviews/retry/route";

describe("POST /api/reviews/retry", () => {
  beforeEach(() => {
    queueReviewJobRetry.mockReset();
  });

  it("queues a retry for the requested review id", async () => {
    queueReviewJobRetry.mockResolvedValue(undefined);

    const response = await POST(
      new Request("http://localhost/api/reviews/retry", {
        method: "POST",
        body: JSON.stringify({
          reviewJobId: "review_1",
        }),
      }),
    );

    await expect(response.json()).resolves.toEqual({
      queued: true,
    });
    expect(response.status).toBe(200);
    expect(queueReviewJobRetry).toHaveBeenCalledWith("review_1");
  });

  it("returns 400 when the review id is missing", async () => {
    const response = await POST(
      new Request("http://localhost/api/reviews/retry", {
        method: "POST",
        body: JSON.stringify({
          reviewJobId: "   ",
        }),
      }),
    );

    await expect(response.json()).resolves.toEqual({
      error: "缺少评审任务 ID。",
    });
    expect(response.status).toBe(400);
    expect(queueReviewJobRetry).not.toHaveBeenCalled();
  });

  it("returns 500 when queuing the retry fails unexpectedly", async () => {
    queueReviewJobRetry.mockRejectedValue(new Error("queue unavailable"));

    const response = await POST(
      new Request("http://localhost/api/reviews/retry", {
        method: "POST",
        body: JSON.stringify({
          reviewJobId: "review_1",
        }),
      }),
    );

    await expect(response.json()).resolves.toEqual({
      error: "queue unavailable",
    });
    expect(response.status).toBe(500);
  });
});
