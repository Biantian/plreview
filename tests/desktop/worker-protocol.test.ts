import { describe, expect, it } from "vitest";

import {
  DESKTOP_EVENTS,
  DESKTOP_REQUESTS,
  createWorkerEnvelope,
  isRuntimeStatusPayload,
} from "@/desktop/worker/protocol";

describe("desktop worker protocol", () => {
  it("creates stable request envelopes", () => {
    expect(
      createWorkerEnvelope("review-batches:create", {
        batchName: "四月策划案",
      }),
    ).toEqual({
      id: expect.any(String),
      channel: "review-batches:create",
      payload: { batchName: "四月策划案" },
    });
  });

  it("recognizes runtime status payloads", () => {
    expect(
      isRuntimeStatusPayload({
        shellReady: true,
        workerReady: false,
        startupMs: 120,
        lastError: null,
      }),
    ).toBe(true);
  });

  it("rejects runtime status payloads with missing fields", () => {
    expect(
      isRuntimeStatusPayload({
        shellReady: true,
        workerReady: false,
        startupMs: 120,
      }),
    ).toBe(false);
  });

  it("rejects runtime status payloads with wrong scalar types", () => {
    expect(
      isRuntimeStatusPayload({
        shellReady: "yes",
        workerReady: false,
        startupMs: "120",
        lastError: 404,
      }),
    ).toBe(false);
  });

  it("exposes runtime channels through the public constants", () => {
    expect(DESKTOP_REQUESTS.rulesDelete).toBe("rules:delete");
    expect(DESKTOP_REQUESTS.runtimeStatus).toBe("desktop-runtime:status");
    expect(DESKTOP_EVENTS.runtimeUpdated).toBe("desktop-runtime:updated");
  });
});
