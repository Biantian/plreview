import type { RuntimeStatusPayload } from "@/desktop/worker/protocol";

export function createRuntimeStore(initial?: Partial<RuntimeStatusPayload>) {
  let state: RuntimeStatusPayload = {
    shellReady: true,
    workerReady: false,
    startupMs: null,
    lastError: null,
    ...initial,
  };

  return {
    getState() {
      return state;
    },
    update(next: Partial<RuntimeStatusPayload>) {
      state = {
        ...state,
        ...next,
      };

      return state;
    },
  };
}
