import { performance } from "node:perf_hooks";

import { createRuntimeStore } from "@/desktop/worker/runtime-store";

export function createRuntimeMetricsService() {
  let workerStartAttemptAt = performance.now();
  const runtimeStore = createRuntimeStore();

  return {
    markWorkerStarting() {
      workerStartAttemptAt = performance.now();

      return runtimeStore.update({
        workerReady: false,
        startupMs: null,
      });
    },
    markWorkerReady() {
      return runtimeStore.update({
        workerReady: true,
        startupMs: Math.round(performance.now() - workerStartAttemptAt),
        lastError: null,
      });
    },
    markWorkerError(error: Error) {
      return runtimeStore.update({
        workerReady: false,
        lastError: error.message,
      });
    },
    markWorkerStopped() {
      return runtimeStore.update({
        workerReady: false,
        startupMs: null,
        lastError: null,
      });
    },
    getRuntimeStatus() {
      return runtimeStore.getState();
    },
  };
}
