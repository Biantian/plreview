import type { ReviewStatus, Severity } from "@prisma/client";
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

export type DesktopReviewJobRow = {
  id: string;
  status: ReviewStatus;
  title: string;
  filename: string;
  fileType: string;
  batchName: string | null;
  modelName: string;
  annotationsCount: number;
  overallScore: number | null;
  createdAt: string;
  finishedAt: string | null;
};

export type ReviewSelectionRequest = {
  selectedIds?: string[];
  query?: string;
  allMatching: boolean;
};

export type DesktopBinaryPayload = {
  bytes: Uint8Array;
  filename: string;
  exportedCount?: number;
  skippedCount?: number;
};

export type RuleDashboardItem = {
  id: string;
  enabled: boolean;
  isDeleted?: boolean;
  name: string;
  category: string;
  severity: Severity;
  description: string;
  promptTemplate: string;
  updatedAtLabel: string;
};

export type RuleDashboardData = {
  enabledCount: number;
  categoryCount: number;
  latestUpdatedAtLabel: string;
  items: RuleDashboardItem[];
  totalCount: number;
};

export type RuleDashboardQuery = {
  includeDeleted?: boolean;
};

export type RuleSaveInput = {
  id?: string;
  name: string;
  category: string;
  description: string;
  promptTemplate: string;
  severity: Severity;
  enabled: boolean;
};

export type ModelDashboardProfile = {
  id: string;
  name: string;
  provider: string;
  vendorKey: string;
  mode: "live" | "demo";
  baseUrl: string;
  defaultModel: string;
  modelOptionsText: string;
  enabled: boolean;
  hasApiKey: boolean;
  apiKeyLast4: string | null;
};

export type ModelDashboardData = {
  metrics: {
    totalCount: number;
    enabledCount: number;
    liveCount: number;
    latestUpdatedAtLabel: string;
  };
  profiles: ModelDashboardProfile[];
};

export type ModelSaveInput = {
  id?: string;
  name: string;
  provider: string;
  vendorKey: string;
  mode: "live" | "demo";
  baseUrl: string;
  defaultModel: string;
  modelOptionsText: string;
  apiKey: string;
  enabled: boolean;
};

export type HomeDashboardData = {
  rulesCount: number;
  enabledRulesCount: number;
  documentsCount: number;
  reviewJobsCount: number;
  annotationsCount: number;
  recentReviews: Array<{
    id: string;
    title: string;
    status: ReviewStatus;
    modelName: string;
    createdAt: string;
  }>;
  llmProfiles: Array<{
    id: string;
    name: string;
    provider: string;
    defaultModel: string;
  }>;
};

export type ReviewLaunchRuleItem = {
  id: string;
  name: string;
  category: string;
  description: string;
  severity: Severity;
};

export type ReviewLaunchData = {
  llmProfiles: Array<{
    id: string;
    name: string;
    provider: string;
    defaultModel: string;
  }>;
  rules: ReviewLaunchRuleItem[];
  lastBatchRuleIds: string[];
};

export type ReviewDetailBlock = {
  blockIndex: number;
  blockType: "heading" | "paragraph" | "list_item";
  text: string;
  level: number | null;
  listKind: "unordered" | "ordered" | null;
};

export type ReviewDetailAnnotation = {
  id: string;
  blockIndex: number;
  issue: string;
  suggestion: string | null;
  severity: Severity;
  evidenceText: string | null;
  ruleName: string;
};

export type ReviewDetailData = {
  id: string;
  title: string;
  filename: string;
  providerSnapshot: string;
  modelNameSnapshot: string;
  createdAt: string;
  status: ReviewStatus;
  summary: string | null;
  errorMessage: string | null;
  overallScore: number | null;
  annotationsCount: number;
  hitBlockCount: number;
  highPriorityCount: number;
  reportMarkdown: string | null;
  blocks: ReviewDetailBlock[];
  annotations: ReviewDetailAnnotation[];
};

export interface DesktopApi {
  pickFiles: () => Promise<ImportedDocumentRecord[]>;
  getReviewLaunchData: () => Promise<ReviewLaunchData>;
  getHomeDashboard: () => Promise<HomeDashboardData>;
  getModelDashboard: () => Promise<ModelDashboardData>;
  getRuleDashboard: (query?: RuleDashboardQuery) => Promise<RuleDashboardData>;
  getReviewDetail: (reviewId: string) => Promise<ReviewDetailData>;
  listReviewJobs: () => Promise<DesktopReviewJobRow[]>;
  searchReviewJobs: (query: string) => Promise<DesktopReviewJobRow[]>;
  listRules: () => Promise<RuleDashboardItem[]>;
  searchRules: (query: string) => Promise<RuleDashboardItem[]>;
  createReviewBatch: (payload: ReviewBatchRequest) => Promise<unknown>;
  deleteReviewJobs: (payload: ReviewSelectionRequest) => Promise<{ deletedCount: number }>;
  retryReviewJob: (reviewJobId: string) => Promise<{ queued: true }>;
  exportReviewList: (payload: ReviewSelectionRequest) => Promise<DesktopBinaryPayload>;
  exportReviewReport: (payload: ReviewSelectionRequest) => Promise<DesktopBinaryPayload>;
  saveRule: (payload: RuleSaveInput) => Promise<RuleDashboardData>;
  toggleRuleEnabled: (id: string, enabled: boolean) => Promise<RuleDashboardData>;
  deleteRule: (id: string) => Promise<{ mode: "soft" | "hard" }>;
  saveModelProfile: (payload: ModelSaveInput) => Promise<ModelDashboardData>;
  toggleModelProfileEnabled: (id: string, enabled: boolean) => Promise<ModelDashboardData>;
  deleteModelProfile: (id: string) => Promise<ModelDashboardData>;
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
    getReviewLaunchData: () => invoke<ReviewLaunchData>(DESKTOP_REQUESTS.reviewLaunch),
    getHomeDashboard: () => invoke<HomeDashboardData>(DESKTOP_REQUESTS.homeDashboard),
    getModelDashboard: () => invoke<ModelDashboardData>(DESKTOP_REQUESTS.modelsDashboard),
    getRuleDashboard: (query) =>
      invoke<RuleDashboardData>(DESKTOP_REQUESTS.rulesDashboard, query),
    getReviewDetail: (reviewId: string) =>
      invoke<ReviewDetailData>(DESKTOP_REQUESTS.reviewDetail, { reviewId }),
    listReviewJobs: () => invoke<DesktopReviewJobRow[]>(DESKTOP_REQUESTS.reviewJobsList),
    searchReviewJobs: (query: string) =>
      invoke<DesktopReviewJobRow[]>(DESKTOP_REQUESTS.reviewJobsSearch, { query }),
    listRules: () => invoke<RuleDashboardItem[]>(DESKTOP_REQUESTS.rulesList),
    searchRules: (query: string) =>
      invoke<RuleDashboardItem[]>(DESKTOP_REQUESTS.rulesSearch, { query }),
    createReviewBatch: (payload) => invoke(DESKTOP_REQUESTS.reviewBatchesCreate, payload),
    deleteReviewJobs: (payload) =>
      invoke<{ deletedCount: number }>(DESKTOP_REQUESTS.reviewJobsDelete, payload),
    retryReviewJob: (reviewJobId: string) =>
      invoke<{ queued: true }>(DESKTOP_REQUESTS.reviewJobsRetry, { reviewJobId }),
    exportReviewList: (payload) =>
      invoke<DesktopBinaryPayload>(DESKTOP_REQUESTS.reviewJobsExportList, payload),
    exportReviewReport: (payload) =>
      invoke<DesktopBinaryPayload>(DESKTOP_REQUESTS.reviewJobsExportReport, payload),
    saveRule: (payload) => invoke<RuleDashboardData>(DESKTOP_REQUESTS.rulesSave, payload),
    toggleRuleEnabled: (id: string, enabled: boolean) =>
      invoke<RuleDashboardData>(DESKTOP_REQUESTS.rulesToggleEnabled, { id, enabled }),
    deleteRule: (id: string) =>
      invoke<{ mode: "soft" | "hard" }>(DESKTOP_REQUESTS.rulesDelete, { id }),
    saveModelProfile: (payload) =>
      invoke<ModelDashboardData>(DESKTOP_REQUESTS.modelsSave, payload),
    toggleModelProfileEnabled: (id: string, enabled: boolean) =>
      invoke<ModelDashboardData>(DESKTOP_REQUESTS.modelsToggleEnabled, { id, enabled }),
    deleteModelProfile: (id: string) =>
      invoke<ModelDashboardData>(DESKTOP_REQUESTS.modelsDelete, { id }),
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
