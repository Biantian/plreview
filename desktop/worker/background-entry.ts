const parentPort = (process as typeof process & {
  parentPort?: {
    postMessage(message: { type: string }): void;
  };
}).parentPort;

parentPort?.postMessage({
  type: "desktop-worker:started",
});
