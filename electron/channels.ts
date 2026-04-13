export const CHANNELS = {
  reviewBatchesCreate: "review-batches:create",
  reviewJobsList: "review-jobs:list",
  reviewJobsSearch: "review-jobs:search",
  rulesList: "rules:list",
  rulesSearch: "rules:search",
  filesPick: "files:pick",
} as const satisfies Record<string, string>;

export type DesktopChannel = (typeof CHANNELS)[keyof typeof CHANNELS];

export type DesktopHandler = (_event: unknown, payload?: unknown) => Promise<unknown>;
export type DesktopHandlerRegistrar = (
  channel: DesktopChannel,
  handler: DesktopHandler,
) => void;

export function registerDesktopHandlers(register: DesktopHandlerRegistrar) {
  const notImplemented: DesktopHandler = async () => {
    throw new Error("Desktop handler not implemented yet.");
  };

  register(CHANNELS.reviewBatchesCreate, notImplemented);
  register(CHANNELS.reviewJobsList, notImplemented);
  register(CHANNELS.reviewJobsSearch, notImplemented);
  register(CHANNELS.rulesList, notImplemented);
  register(CHANNELS.rulesSearch, notImplemented);
  register(CHANNELS.filesPick, notImplemented);
}
