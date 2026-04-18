const parentPort = (process as typeof process & {
  parentPort?: {
    postMessage(message: { type: string }): void;
    on(event: "message", listener: (message: unknown) => void): void;
  };
}).parentPort;

parentPort?.postMessage({
  type: "desktop-worker:started",
});

parentPort?.on("message", () => {
  // Reserved for future worker commands.
});

setInterval(() => {
  // Keep the utility process alive as a long-lived worker.
}, 60_000);
