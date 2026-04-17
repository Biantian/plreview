const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("plreview", {
  pickFiles: () => ipcRenderer.invoke("files:pick"),
  listReviewJobs: () => ipcRenderer.invoke("review-jobs:list"),
  searchReviewJobs: (query) => ipcRenderer.invoke("review-jobs:search", { query }),
  listRules: () => ipcRenderer.invoke("rules:list"),
  searchRules: (query) => ipcRenderer.invoke("rules:search", { query }),
  createReviewBatch: (payload) => ipcRenderer.invoke("review-batches:create", payload),
});
