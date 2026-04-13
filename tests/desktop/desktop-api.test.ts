import { describe, expect, it, vi } from "vitest";

import { createDesktopApi, type DesktopInvoke } from "@/desktop/bridge/desktop-api";
import { CHANNELS, registerDesktopHandlers } from "@/electron/channels";

describe("createDesktopApi", () => {
  it("routes batch creation through the typed channel map", async () => {
    const invoke = vi.fn().mockResolvedValue({
      batchId: "batch_1",
      createdCount: 2,
    }) as DesktopInvoke;
    const api = createDesktopApi(invoke);

    await api.createReviewBatch({
      batchName: "四月策划案",
      llmProfileId: "profile_1",
      modelName: "qwen-plus",
      ruleIds: ["rule_a"],
      items: [],
    });

    expect(invoke).toHaveBeenCalledWith(CHANNELS.reviewBatchesCreate, {
      batchName: "四月策划案",
      llmProfileId: "profile_1",
      modelName: "qwen-plus",
      ruleIds: ["rule_a"],
      items: [],
    });
  });

  it("registers handlers for every declared desktop channel", () => {
    const register = vi.fn();

    registerDesktopHandlers(register);

    expect(register).toHaveBeenCalledTimes(Object.keys(CHANNELS).length);
    expect(register).toHaveBeenCalledWith(
      CHANNELS.reviewBatchesCreate,
      expect.any(Function),
    );
    expect(register).toHaveBeenCalledWith(
      CHANNELS.reviewJobsList,
      expect.any(Function),
    );
    expect(register).toHaveBeenCalledWith(
      CHANNELS.reviewJobsSearch,
      expect.any(Function),
    );
    expect(register).toHaveBeenCalledWith(CHANNELS.rulesList, expect.any(Function));
    expect(register).toHaveBeenCalledWith(
      CHANNELS.rulesSearch,
      expect.any(Function),
    );
    expect(register).toHaveBeenCalledWith(CHANNELS.filesPick, expect.any(Function));
  });
});
