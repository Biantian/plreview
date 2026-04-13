import type { DesktopChannel } from "@/electron/channels";
import { CHANNELS } from "@/electron/channels";

export type DesktopInvoke = <T = unknown>(
  channel: DesktopChannel,
  payload?: unknown,
) => Promise<T>;

export type ReviewBatchRequest = {
  batchName: string;
  llmProfileId: string;
  modelName: string;
  ruleIds: string[];
  items: unknown[];
};

export interface DesktopApi {
  pickFiles: () => Promise<unknown>;
  listReviewJobs: () => Promise<unknown>;
  searchReviewJobs: (query: string) => Promise<unknown>;
  listRules: () => Promise<unknown>;
  searchRules: (query: string) => Promise<unknown>;
  createReviewBatch: (payload: ReviewBatchRequest) => Promise<unknown>;
}

export function createDesktopApi(invoke: DesktopInvoke): DesktopApi {
  return {
    pickFiles: () => invoke(CHANNELS.filesPick),
    listReviewJobs: () => invoke(CHANNELS.reviewJobsList),
    searchReviewJobs: (query: string) => invoke(CHANNELS.reviewJobsSearch, { query }),
    listRules: () => invoke(CHANNELS.rulesList),
    searchRules: (query: string) => invoke(CHANNELS.rulesSearch, { query }),
    createReviewBatch: (payload) => invoke(CHANNELS.reviewBatchesCreate, payload),
  };
}

declare global {
  interface Window {
    plreview: DesktopApi;
  }
}
