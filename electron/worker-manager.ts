import path from "node:path";
import { utilityProcess } from "electron";

import { resolveForkTarget } from "@/desktop/runtime-targets";
import {
  createWorkerEnvelope,
  type DesktopRequestChannel,
} from "@/desktop/worker/protocol";

const currentDir = __dirname;
const backgroundWorkerTarget = resolveForkTarget(
  __filename,
  "../desktop/worker/background-entry.ts",
  "../desktop/worker/background-entry.cjs",
  "../desktop/worker/background-entry.cjs",
);

type WorkerManagerOptions = {
  onWorkerStarting?: () => void;
  onWorkerReady?: () => void;
  onWorkerStopped?: () => void;
  onWorkerError?: (error: Error) => void;
};

export function createWorkerManager(options: WorkerManagerOptions = {}) {
  let child: ReturnType<typeof utilityProcess.fork> | null = null;
  let pendingStart: Promise<ReturnType<typeof utilityProcess.fork>> | null = null;
  let pendingStartState:
    | {
        generation: number;
        reject: (error: Error) => void;
      }
    | null = null;
  let activeWorkerGeneration = 0;
  let requestedStopGeneration: number | null = null;
  const pendingRequests = new Map<
    string,
    {
      resolve: (value: unknown) => void;
      reject: (error: Error) => void;
    }
  >();
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

  function clearPendingStartForGeneration(generation: number) {
    if (pendingStartState?.generation === generation) {
      pendingStartState = null;
      pendingStart = null;
    }
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
      const worker = utilityProcess.fork(
        backgroundWorkerTarget.entryPath,
        [],
        backgroundWorkerTarget.execArgv.length > 0
          ? {
              execArgv: backgroundWorkerTarget.execArgv,
            }
          : {},
      );
      child = worker;

      pendingStart = new Promise((resolve, reject) => {
        let ready = false;
        pendingStartState = {
          generation,
          reject,
        };

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
            clearPendingStartForGeneration(generation);
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
            clearPendingStartForGeneration(generation);
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
            clearPendingStartForGeneration(generation);
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
      if (pendingStartState?.generation === activeWorkerGeneration) {
        const stopError = new Error("Desktop worker stopped.");
        const { reject } = pendingStartState;

        clearPendingStartForGeneration(activeWorkerGeneration);
        reject(stopError);
      }
      child?.kill();
      child = null;
      rejectPendingRequests(new Error("Desktop worker stopped."));
    },
  };
}
