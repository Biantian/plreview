import path from "node:path";
import { fileURLToPath } from "node:url";
import { utilityProcess } from "electron";

import {
  createWorkerEnvelope,
  type DesktopRequestChannel,
} from "@/desktop/worker/protocol";

const currentDir = path.dirname(fileURLToPath(import.meta.url));

type WorkerManagerOptions = {
  onWorkerStarting?: () => void;
  onWorkerReady?: () => void;
  onWorkerStopped?: () => void;
  onWorkerError?: (error: Error) => void;
};

export function createWorkerManager(options: WorkerManagerOptions = {}) {
  let child: ReturnType<typeof utilityProcess.fork> | null = null;
  let pendingStart: Promise<ReturnType<typeof utilityProcess.fork>> | null = null;
  let activeWorkerGeneration = 0;
  let requestedStopGeneration: number | null = null;
  const pendingRequests = new Map<
    string,
    {
      resolve: (value: unknown) => void;
      reject: (error: Error) => void;
    }
  >();
  const bootstrapPath = path.join(currentDir, "../desktop/worker/background-entry.cjs");
  const workerPath = path.join(currentDir, "../desktop/worker/background-entry.ts");

  function clearCachedChild(worker: ReturnType<typeof utilityProcess.fork>) {
    if (child === worker) {
      child = null;
    }
  }

  function rejectPendingRequests(error: Error) {
    for (const request of pendingRequests.values()) {
      request.reject(error);
    }
    pendingRequests.clear();
  }

  function buildWorkerExitError(code: number) {
    return new Error(`Desktop worker exited (${code})`);
  }

  function buildWorkerFatalError(type: string, location: string) {
    return new Error(`Desktop worker ${type} at ${location}`);
  }

  function isActiveGeneration(generation: number) {
    return generation === activeWorkerGeneration;
  }

  return {
    async start() {
      if (child) {
        return pendingStart ?? child;
      }

      if (pendingStart) {
        return pendingStart;
      }

      const generation = activeWorkerGeneration + 1;
      activeWorkerGeneration = generation;
      requestedStopGeneration = null;
      options.onWorkerStarting?.();
      const worker = utilityProcess.fork(workerPath, [], {
        execArgv: ["-r", bootstrapPath],
      });
      child = worker;

      pendingStart = new Promise((resolve, reject) => {
        let ready = false;

        worker.once("message", (message: unknown) => {
          if (
            !isActiveGeneration(generation) ||
            child !== worker ||
            requestedStopGeneration === generation
          ) {
            return;
          }

          if (message && typeof message === "object" && (message as { type?: string }).type === "desktop-worker:started") {
            ready = true;
            pendingStart = null;
            options.onWorkerReady?.();
            resolve(worker);
          }
        });

        worker.once("exit", (code: number) => {
          const wasIntentionalStop = requestedStopGeneration === generation;
          if (wasIntentionalStop) {
            requestedStopGeneration = null;
          }

          if (!isActiveGeneration(generation)) {
            return;
          }

          const exitError = wasIntentionalStop
            ? new Error("Desktop worker stopped.")
            : buildWorkerExitError(code);
          clearCachedChild(worker);
          rejectPendingRequests(exitError);
          if (wasIntentionalStop) {
            options.onWorkerStopped?.();
          } else {
            options.onWorkerError?.(exitError);
          }
          if (!ready) {
            pendingStart = null;
            reject(
              wasIntentionalStop
                ? exitError
                : new Error(`Desktop worker exited before ready (${code})`),
            );
          }
        });

        worker.once("error", (type, location) => {
          if (
            !isActiveGeneration(generation) ||
            requestedStopGeneration === generation
          ) {
            return;
          }

          const error = buildWorkerFatalError(type, location);
          clearCachedChild(worker);
          rejectPendingRequests(error);
          options.onWorkerError?.(error);
          if (!ready) {
            pendingStart = null;
            reject(error);
          }
        });
      });

      return pendingStart;
    },
    getChild() {
      return child;
    },
    async invoke(channel: DesktopRequestChannel, payload?: unknown) {
      const worker = await this.start();
      const envelope = createWorkerEnvelope(channel, payload);

      return new Promise<unknown>((resolve, reject) => {
        const handleMessage = (message: unknown) => {
          if (!message || typeof message !== "object") {
            return;
          }

          const candidate = message as {
            type?: string;
            id?: string;
            payload?: unknown;
            error?: string;
          };

          if (candidate.id !== envelope.id) {
            return;
          }

          pendingRequests.delete(envelope.id);
          worker.off("message", handleMessage);

          if (candidate.type === "desktop-worker:error") {
            reject(new Error(candidate.error ?? "Desktop worker request failed."));
            return;
          }

          if (candidate.type === "desktop-worker:response") {
            resolve(candidate.payload);
          }
        };

        pendingRequests.set(envelope.id, {
          resolve,
          reject,
        });
        worker.on("message", handleMessage);
        worker.postMessage(envelope);
      });
    },
    stop() {
      requestedStopGeneration = activeWorkerGeneration;
      child?.kill();
      child = null;
      pendingStart = null;
      rejectPendingRequests(new Error("Desktop worker stopped."));
    },
  };
}
