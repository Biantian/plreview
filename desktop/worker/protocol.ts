import { randomUUID } from "node:crypto";

export const DESKTOP_REQUESTS = {
  reviewBatchesCreate: "review-batches:create",
  reviewJobsList: "review-jobs:list",
  reviewJobsSearch: "review-jobs:search",
  rulesList: "rules:list",
  rulesSearch: "rules:search",
  filesPick: "files:pick",
  runtimeStatus: "desktop-runtime:status",
} as const;

export const DESKTOP_EVENTS = {
  runtimeUpdated: "desktop-runtime:updated",
} as const;

export type DesktopRequestChannel =
  (typeof DESKTOP_REQUESTS)[keyof typeof DESKTOP_REQUESTS];

export type WorkerEnvelope<T = unknown> = {
  id: string;
  channel: DesktopRequestChannel;
  payload?: T;
};

export type RuntimeStatusPayload = {
  shellReady: boolean;
  workerReady: boolean;
  startupMs: number | null;
  lastError: string | null;
};

export function createWorkerEnvelope<T>(
  channel: DesktopRequestChannel,
  payload?: T,
): WorkerEnvelope<T> {
  return {
    id: randomUUID(),
    channel,
    payload,
  };
}

export function isRuntimeStatusPayload(
  value: unknown,
): value is RuntimeStatusPayload {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.shellReady === "boolean" &&
    typeof candidate.workerReady === "boolean" &&
    (typeof candidate.startupMs === "number" || candidate.startupMs === null) &&
    (typeof candidate.lastError === "string" || candidate.lastError === null)
  );
}
