import { DESKTOP_REQUESTS } from "@/desktop/worker/protocol";

export const CHANNELS = {
  homeDashboard: DESKTOP_REQUESTS.homeDashboard,
  modelsDashboard: DESKTOP_REQUESTS.modelsDashboard,
  rulesDashboard: DESKTOP_REQUESTS.rulesDashboard,
  reviewDetail: DESKTOP_REQUESTS.reviewDetail,
  reviewBatchesCreate: DESKTOP_REQUESTS.reviewBatchesCreate,
  reviewJobsList: DESKTOP_REQUESTS.reviewJobsList,
  reviewJobsSearch: DESKTOP_REQUESTS.reviewJobsSearch,
  reviewJobsDelete: DESKTOP_REQUESTS.reviewJobsDelete,
  reviewJobsRetry: DESKTOP_REQUESTS.reviewJobsRetry,
  reviewJobsExportList: DESKTOP_REQUESTS.reviewJobsExportList,
  reviewJobsExportReport: DESKTOP_REQUESTS.reviewJobsExportReport,
  rulesList: DESKTOP_REQUESTS.rulesList,
  rulesSearch: DESKTOP_REQUESTS.rulesSearch,
  rulesSave: DESKTOP_REQUESTS.rulesSave,
  rulesToggleEnabled: DESKTOP_REQUESTS.rulesToggleEnabled,
  rulesDelete: DESKTOP_REQUESTS.rulesDelete,
  modelsSave: DESKTOP_REQUESTS.modelsSave,
  modelsToggleEnabled: DESKTOP_REQUESTS.modelsToggleEnabled,
  modelsDelete: DESKTOP_REQUESTS.modelsDelete,
  filesPick: DESKTOP_REQUESTS.filesPick,
  runtimeStatus: DESKTOP_REQUESTS.runtimeStatus,
} as const;

export type DesktopChannel = (typeof CHANNELS)[keyof typeof CHANNELS];

export type DesktopHandler = (_event: unknown, payload?: unknown) => Promise<unknown>;
export type DesktopHandlerRegistrar = (
  channel: DesktopChannel,
  handler: DesktopHandler,
) => void;

export function registerDesktopHandlers(
  register: DesktopHandlerRegistrar,
  handlers: Partial<Record<DesktopChannel, DesktopHandler>> = {},
) {
  const notImplemented: DesktopHandler = async () => {
    throw new Error("Desktop handler not implemented yet.");
  };

  register(CHANNELS.reviewBatchesCreate, handlers[CHANNELS.reviewBatchesCreate] ?? notImplemented);
  register(CHANNELS.homeDashboard, handlers[CHANNELS.homeDashboard] ?? notImplemented);
  register(CHANNELS.modelsDashboard, handlers[CHANNELS.modelsDashboard] ?? notImplemented);
  register(CHANNELS.rulesDashboard, handlers[CHANNELS.rulesDashboard] ?? notImplemented);
  register(CHANNELS.reviewDetail, handlers[CHANNELS.reviewDetail] ?? notImplemented);
  register(CHANNELS.reviewJobsList, handlers[CHANNELS.reviewJobsList] ?? notImplemented);
  register(CHANNELS.reviewJobsSearch, handlers[CHANNELS.reviewJobsSearch] ?? notImplemented);
  register(CHANNELS.reviewJobsDelete, handlers[CHANNELS.reviewJobsDelete] ?? notImplemented);
  register(CHANNELS.reviewJobsRetry, handlers[CHANNELS.reviewJobsRetry] ?? notImplemented);
  register(CHANNELS.reviewJobsExportList, handlers[CHANNELS.reviewJobsExportList] ?? notImplemented);
  register(
    CHANNELS.reviewJobsExportReport,
    handlers[CHANNELS.reviewJobsExportReport] ?? notImplemented,
  );
  register(CHANNELS.rulesList, handlers[CHANNELS.rulesList] ?? notImplemented);
  register(CHANNELS.rulesSearch, handlers[CHANNELS.rulesSearch] ?? notImplemented);
  register(CHANNELS.rulesSave, handlers[CHANNELS.rulesSave] ?? notImplemented);
  register(
    CHANNELS.rulesToggleEnabled,
    handlers[CHANNELS.rulesToggleEnabled] ?? notImplemented,
  );
  register(CHANNELS.rulesDelete, handlers[CHANNELS.rulesDelete] ?? notImplemented);
  register(CHANNELS.modelsSave, handlers[CHANNELS.modelsSave] ?? notImplemented);
  register(
    CHANNELS.modelsToggleEnabled,
    handlers[CHANNELS.modelsToggleEnabled] ?? notImplemented,
  );
  register(CHANNELS.modelsDelete, handlers[CHANNELS.modelsDelete] ?? notImplemented);
  register(CHANNELS.filesPick, handlers[CHANNELS.filesPick] ?? notImplemented);
  register(CHANNELS.runtimeStatus, handlers[CHANNELS.runtimeStatus] ?? notImplemented);
}
