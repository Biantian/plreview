const { contextBridge, ipcRenderer } = require("electron");

const DESKTOP_REQUESTS = {
  homeDashboard: "home-dashboard:get",
  modelsDashboard: "models-dashboard:get",
  rulesDashboard: "rules-dashboard:get",
  reviewDetail: "review-detail:get",
  reviewBatchesCreate: "review-batches:create",
  reviewJobsList: "review-jobs:list",
  reviewJobsSearch: "review-jobs:search",
  reviewJobsDelete: "review-jobs:delete",
  reviewJobsRetry: "review-jobs:retry",
  reviewJobsExportList: "review-jobs:export-list",
  reviewJobsExportReport: "review-jobs:export-report",
  rulesList: "rules:list",
  rulesSearch: "rules:search",
  rulesSave: "rules:save",
  rulesToggleEnabled: "rules:toggle-enabled",
  modelsSave: "models:save",
  modelsToggleEnabled: "models:toggle-enabled",
  modelsDelete: "models:delete",
  filesPick: "files:pick",
  runtimeStatus: "desktop-runtime:status",
};

const DESKTOP_EVENTS = {
  runtimeUpdated: "desktop-runtime:updated",
};

const invoke = (channel, payload) => ipcRenderer.invoke(channel, payload);
const subscribe = (event, listener) => {
  const wrapped = (_event, payload) => {
    listener(payload);
  };

  ipcRenderer.on(event, wrapped);

  return () => {
    ipcRenderer.off(event, wrapped);
  };
};

contextBridge.exposeInMainWorld("plreview", {
  pickFiles: () => invoke(DESKTOP_REQUESTS.filesPick),
  getHomeDashboard: () => invoke(DESKTOP_REQUESTS.homeDashboard),
  getModelDashboard: () => invoke(DESKTOP_REQUESTS.modelsDashboard),
  getRuleDashboard: () => invoke(DESKTOP_REQUESTS.rulesDashboard),
  getReviewDetail: (reviewId) => invoke(DESKTOP_REQUESTS.reviewDetail, { reviewId }),
  listReviewJobs: () => invoke(DESKTOP_REQUESTS.reviewJobsList),
  searchReviewJobs: (query) => invoke(DESKTOP_REQUESTS.reviewJobsSearch, { query }),
  listRules: () => invoke(DESKTOP_REQUESTS.rulesList),
  searchRules: (query) => invoke(DESKTOP_REQUESTS.rulesSearch, { query }),
  createReviewBatch: (payload) => invoke(DESKTOP_REQUESTS.reviewBatchesCreate, payload),
  deleteReviewJobs: (payload) => invoke(DESKTOP_REQUESTS.reviewJobsDelete, payload),
  retryReviewJob: (reviewJobId) =>
    invoke(DESKTOP_REQUESTS.reviewJobsRetry, { reviewJobId }),
  exportReviewList: (payload) => invoke(DESKTOP_REQUESTS.reviewJobsExportList, payload),
  exportReviewReport: (payload) => invoke(DESKTOP_REQUESTS.reviewJobsExportReport, payload),
  saveRule: (payload) => invoke(DESKTOP_REQUESTS.rulesSave, payload),
  toggleRuleEnabled: (id, enabled) =>
    invoke(DESKTOP_REQUESTS.rulesToggleEnabled, { id, enabled }),
  saveModelProfile: (payload) => invoke(DESKTOP_REQUESTS.modelsSave, payload),
  toggleModelProfileEnabled: (id, enabled) =>
    invoke(DESKTOP_REQUESTS.modelsToggleEnabled, { id, enabled }),
  deleteModelProfile: (id) => invoke(DESKTOP_REQUESTS.modelsDelete, { id }),
  getRuntimeStatus: () => invoke(DESKTOP_REQUESTS.runtimeStatus),
  subscribeRuntimeStatus: (listener) =>
    subscribe(DESKTOP_EVENTS.runtimeUpdated, listener),
});
