import type { DesktopChannel } from "@/electron/channels";
import {
  DESKTOP_EVENTS,
  DESKTOP_REQUESTS,
  type RuntimeStatusPayload,
} from "@/desktop/worker/protocol";

export type ImportedDocumentSummary = {
  title: string;
  blockCount: number;
  paragraphCount: number;
  sourceLabel: string;
};

export type ImportedDocumentRecord = {
  id: string;
  name: string;
  fileType: string;
  status: string;
  note: string;
  summary: ImportedDocumentSummary;
};

export type DesktopInvoke = <T = unknown>(
  channel: DesktopChannel,
  payload?: unknown,
) => Promise<T>;

export type DesktopSubscribe = (
  event: typeof DESKTOP_EVENTS.runtimeUpdated,
  listener: (payload: RuntimeStatusPayload) => void,
) => () => void;

export type ReviewBatchRequest = {
  batchName: string;
  llmProfileId: string;
  modelName: string;
  ruleIds: string[];
  documents: Array<{
    documentId: string;
  }>;
};

export interface DesktopApi {
  pickFiles: () => Promise<ImportedDocumentRecord[]>;
  listReviewJobs: () => Promise<unknown>;
  searchReviewJobs: (query: string) => Promise<unknown>;
  listRules: () => Promise<unknown>;
  searchRules: (query: string) => Promise<unknown>;
  createReviewBatch: (payload: ReviewBatchRequest) => Promise<unknown>;
  getRuntimeStatus: () => Promise<RuntimeStatusPayload>;
  subscribeRuntimeStatus: (
    listener: (payload: RuntimeStatusPayload) => void,
  ) => () => void;
}

export function createDesktopApi(
  invoke: DesktopInvoke,
  subscribe?: DesktopSubscribe,
): DesktopApi {
  return {
    pickFiles: () => invoke<ImportedDocumentRecord[]>(DESKTOP_REQUESTS.filesPick),
    listReviewJobs: () => invoke(DESKTOP_REQUESTS.reviewJobsList),
    searchReviewJobs: (query: string) =>
      invoke(DESKTOP_REQUESTS.reviewJobsSearch, { query }),
    listRules: () => invoke(DESKTOP_REQUESTS.rulesList),
    searchRules: (query: string) => invoke(DESKTOP_REQUESTS.rulesSearch, { query }),
    createReviewBatch: (payload) => invoke(DESKTOP_REQUESTS.reviewBatchesCreate, payload),
    getRuntimeStatus: () => invoke<RuntimeStatusPayload>(DESKTOP_REQUESTS.runtimeStatus),
    subscribeRuntimeStatus: (listener) =>
      subscribe
        ? subscribe(DESKTOP_EVENTS.runtimeUpdated, listener)
        : () => undefined,
  };
}

declare global {
  interface Window {
    plreview: DesktopApi;
  }
}
