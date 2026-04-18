import { performance } from "node:perf_hooks";

import { createRuntimeStore } from "@/desktop/worker/runtime-store";

export function createRuntimeMetricsService() {
  const bootStartedAt = performance.now();
  const runtimeStore = createRuntimeStore();

  return {
    markWorkerReady() {
      return runtimeStore.update({
        workerReady: true,
        startupMs: Math.round(performance.now() - bootStartedAt),
        lastError: null,
      });
    },
    markWorkerError(error: Error) {
      return runtimeStore.update({
        workerReady: false,
        lastError: error.message,
      });
    },
    getRuntimeStatus() {
      return runtimeStore.getState();
    },
  };
}
