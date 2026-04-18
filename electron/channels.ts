import { DESKTOP_REQUESTS } from "@/desktop/worker/protocol";

const desktopChannels = {
  reviewBatchesCreate: DESKTOP_REQUESTS.reviewBatchesCreate,
  reviewJobsList: DESKTOP_REQUESTS.reviewJobsList,
  reviewJobsSearch: DESKTOP_REQUESTS.reviewJobsSearch,
  rulesList: DESKTOP_REQUESTS.rulesList,
  rulesSearch: DESKTOP_REQUESTS.rulesSearch,
  filesPick: DESKTOP_REQUESTS.filesPick,
} as const;

Object.defineProperty(desktopChannels, "runtimeStatus", {
  value: DESKTOP_REQUESTS.runtimeStatus,
  enumerable: false,
  configurable: false,
  writable: false,
});

export const CHANNELS = desktopChannels as typeof desktopChannels & {
  runtimeStatus: typeof DESKTOP_REQUESTS.runtimeStatus;
};

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
  register(CHANNELS.reviewJobsList, handlers[CHANNELS.reviewJobsList] ?? notImplemented);
  register(CHANNELS.reviewJobsSearch, handlers[CHANNELS.reviewJobsSearch] ?? notImplemented);
  register(CHANNELS.rulesList, handlers[CHANNELS.rulesList] ?? notImplemented);
  register(CHANNELS.rulesSearch, handlers[CHANNELS.rulesSearch] ?? notImplemented);
  register(CHANNELS.filesPick, handlers[CHANNELS.filesPick] ?? notImplemented);
}
