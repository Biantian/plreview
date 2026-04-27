import { afterEach, describe, expect, it, vi } from "vitest";

import {
  createDesktopApi,
  type DesktopInvoke,
} from "@/desktop/bridge/desktop-api";
import { DESKTOP_EVENTS } from "@/desktop/worker/protocol";
import { CHANNELS, registerDesktopHandlers } from "@/electron/channels";

describe("createDesktopApi", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.resetModules();
  });

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
      documents: [],
    });

    expect(invoke).toHaveBeenCalledWith(CHANNELS.reviewBatchesCreate, {
      batchName: "四月策划案",
      llmProfileId: "profile_1",
      modelName: "qwen-plus",
      ruleIds: ["rule_a"],
      documents: [],
    });
  });

  it("covers the full desktop bridge request surface", async () => {
    const invoke = vi.fn().mockResolvedValue({}) as DesktopInvoke;
    const api = createDesktopApi(invoke);
    const reviewBatchPayload = {
      batchName: "四月策划案",
      llmProfileId: "profile_1",
      modelName: "qwen-plus",
      ruleIds: ["rule_a"],
      documents: [{ documentId: "doc_1" }],
    };
    const reviewSelection = {
      allMatching: false,
      selectedIds: ["job_1"],
    };
    const rulePayload = {
      name: "标题完整性",
      category: "文案结构",
      description: "标题应与内容一致",
      promptTemplate: "检查标题和正文一致性",
      severity: "high" as const,
      enabled: true,
    };
    const modelPayload = {
      name: "Qwen Plus",
      provider: "openai-compatible",
      vendorKey: "qwen",
      mode: "live" as const,
      baseUrl: "https://dashscope.aliyuncs.com/compatible-mode/v1",
      defaultModel: "qwen-plus",
      modelOptionsText: "qwen-plus\nqwen-max",
      apiKey: "sk-demo",
      enabled: true,
    };

    await api.pickFiles();
    await api.getHomeDashboard();
    await api.getModelDashboard();
    await api.getRuleDashboard({ includeDeleted: true });
    await api.getReviewDetail("review_1");
    await api.listReviewJobs();
    await api.searchReviewJobs("待处理");
    await api.listRules();
    await api.searchRules("标题");
    await api.createReviewBatch(reviewBatchPayload);
    await api.deleteReviewJobs(reviewSelection);
    await api.retryReviewJob("job_1");
    await api.exportReviewList(reviewSelection);
    await api.exportReviewReport({
      allMatching: true,
      query: "已完成",
    });
    await api.saveRule(rulePayload);
    await api.toggleRuleEnabled("rule_1", false);
    await api.deleteRule("rule_2");
    await api.saveModelProfile(modelPayload);
    await api.toggleModelProfileEnabled("profile_1", false);
    await api.deleteModelProfile("profile_2");
    await api.getRuntimeStatus();

    expect(invoke.mock.calls).toEqual([
      [CHANNELS.filesPick],
      [CHANNELS.homeDashboard],
      [CHANNELS.modelsDashboard],
      [CHANNELS.rulesDashboard, { includeDeleted: true }],
      [CHANNELS.reviewDetail, { reviewId: "review_1" }],
      [CHANNELS.reviewJobsList],
      [CHANNELS.reviewJobsSearch, { query: "待处理" }],
      [CHANNELS.rulesList],
      [CHANNELS.rulesSearch, { query: "标题" }],
      [CHANNELS.reviewBatchesCreate, reviewBatchPayload],
      [CHANNELS.reviewJobsDelete, reviewSelection],
      [CHANNELS.reviewJobsRetry, { reviewJobId: "job_1" }],
      [CHANNELS.reviewJobsExportList, reviewSelection],
      [CHANNELS.reviewJobsExportReport, { allMatching: true, query: "已完成" }],
      [CHANNELS.rulesSave, rulePayload],
      [CHANNELS.rulesToggleEnabled, { id: "rule_1", enabled: false }],
      [CHANNELS.rulesDelete, { id: "rule_2" }],
      [CHANNELS.modelsSave, modelPayload],
      [CHANNELS.modelsToggleEnabled, { id: "profile_1", enabled: false }],
      [CHANNELS.modelsDelete, { id: "profile_2" }],
      [CHANNELS.runtimeStatus],
    ]);
  });

  it("routes runtime status through the typed channel map", async () => {
    const runtimeStatus = {
      shellReady: true,
      workerReady: true,
      startupMs: 42,
      lastError: null,
    };
    const invoke = vi.fn().mockResolvedValue(runtimeStatus) as DesktopInvoke;
    const api = createDesktopApi(invoke);

    await expect(api.getRuntimeStatus()).resolves.toEqual(runtimeStatus);

    expect(invoke).toHaveBeenCalledWith(CHANNELS.runtimeStatus);
  });

  it("subscribes to runtime updates through the preload bridge", () => {
    const subscribe = vi.fn().mockReturnValue(vi.fn());
    const api = createDesktopApi(vi.fn() as DesktopInvoke, subscribe);
    const listener = vi.fn();

    const unsubscribe = api.subscribeRuntimeStatus(listener);

    expect(subscribe).toHaveBeenCalledWith(DESKTOP_EVENTS.runtimeUpdated, listener);
    expect(unsubscribe).toEqual(expect.any(Function));
  });

  it("registers handlers for every declared desktop channel", () => {
    const register = vi.fn();

    registerDesktopHandlers(register);

    expect(register).toHaveBeenCalledTimes(Object.keys(CHANNELS).length);
    expect(register.mock.calls.map((call) => call[0]).sort()).toEqual(
      Object.values(CHANNELS).sort(),
    );
  });
});

describe("electron preload bridge", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.resetModules();
  });

  it("wires runtime subscription to ipcRenderer.on", async () => {
    const on = vi.fn();
    const off = vi.fn();
    const invoke = vi.fn();
    const exposeInMainWorld = vi.fn();
    let wrappedListener: ((event: unknown, payload: unknown) => void) | undefined;

    vi.doMock("electron", () => ({
      contextBridge: {
        exposeInMainWorld,
      },
      ipcRenderer: {
        invoke,
        on: vi.fn((event, listener) => {
          on(event, listener);
          wrappedListener = listener;
        }),
        off: vi.fn((event, listener) => {
          off(event, listener);
        }),
      },
    }));

    await import("@/electron/preload");

    expect(exposeInMainWorld).toHaveBeenCalledTimes(1);
    const [, api] = exposeInMainWorld.mock.calls[0] as [
      string,
      {
        subscribeRuntimeStatus: (
          listener: (payload: unknown) => void,
        ) => () => void;
      },
    ];

    const listener = vi.fn();
    const unsubscribe = api.subscribeRuntimeStatus(listener);

    expect(on).toHaveBeenCalledWith(
      DESKTOP_EVENTS.runtimeUpdated,
      expect.any(Function),
    );
    expect(wrappedListener).toEqual(expect.any(Function));

    wrappedListener?.({} as unknown, {
      shellReady: true,
      workerReady: false,
      startupMs: 12,
      lastError: null,
    });

    expect(listener).toHaveBeenCalledWith({
      shellReady: true,
      workerReady: false,
      startupMs: 12,
      lastError: null,
    });
    expect(typeof unsubscribe).toBe("function");

    unsubscribe();

    expect(off).toHaveBeenCalledWith(
      DESKTOP_EVENTS.runtimeUpdated,
      wrappedListener,
    );
  });
});
