import path from "node:path";
import fs from "node:fs";
import os from "node:os";

import { afterEach, describe, expect, it, vi } from "vitest";

import {
  launchPackagedRenderer,
  resolveRendererLoadTarget,
} from "@/electron/renderer-runtime";

describe("resolveRendererLoadTarget", () => {
  it("prefers the explicit renderer dev server URL when provided", async () => {
    const launchPackagedRenderer = vi.fn();

    await expect(
      resolveRendererLoadTarget({
        currentDir: "/tmp/plreview/electron",
        env: {
          ELECTRON_RENDERER_URL: "http://127.0.0.1:3000",
        },
        launchPackagedRenderer,
      }),
    ).resolves.toEqual({
      kind: "url",
      url: "http://127.0.0.1:3000",
    });

    expect(launchPackagedRenderer).not.toHaveBeenCalled();
  });

  it("loads an explicit packaged html file when configured", async () => {
    const launchPackagedRenderer = vi.fn();

    await expect(
      resolveRendererLoadTarget({
        currentDir: "/tmp/plreview/electron",
        env: {
          ELECTRON_RENDERER_HTML: "dist/index.html",
        },
        launchPackagedRenderer,
      }),
    ).resolves.toEqual({
      kind: "file",
      filePath: path.resolve("dist/index.html"),
    });

    expect(launchPackagedRenderer).not.toHaveBeenCalled();
  });

  it("starts the packaged standalone renderer when no explicit renderer target is configured", async () => {
    const stop = vi.fn();
    const launchPackagedRenderer = vi.fn().mockResolvedValue({
      url: "http://127.0.0.1:43123",
      stop,
    });

    await expect(
      resolveRendererLoadTarget({
        currentDir: "/tmp/plreview/.desktop-runtime/electron",
        env: {},
        launchPackagedRenderer,
      }),
    ).resolves.toEqual({
      kind: "url",
      url: "http://127.0.0.1:43123",
      stop,
    });
  });

  it("falls back to the shell page when no renderer target is available", async () => {
    const launchPackagedRenderer = vi.fn().mockResolvedValue(null);

    await expect(
      resolveRendererLoadTarget({
        currentDir: "/tmp/plreview/electron",
        env: {},
        launchPackagedRenderer,
      }),
    ).resolves.toEqual({
      kind: "fallback",
    });
  });
});

describe("launchPackagedRenderer", () => {
  const tempDirs: string[] = [];

  afterEach(() => {
    for (const tempDir of tempDirs) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it("starts the packaged renderer with an Electron utility process instead of respawning the app executable", async () => {
    const tempDir = fs.mkdtempSync(
      path.join(os.tmpdir(), "plreview-renderer-runtime-"),
    );
    tempDirs.push(tempDir);

    const serverPath = path.join(tempDir, "server.js");
    fs.writeFileSync(serverPath, "console.log('server');\n");

    const kill = vi.fn();
    const forkProcess = vi.fn().mockReturnValue({
      kill,
      stdout: null,
      stderr: null,
    });
    const waitForServer = vi.fn().mockResolvedValue(undefined);

    const launched = await launchPackagedRenderer(
      "/tmp/plreview/.desktop-runtime/electron",
      {
        NODE_ENV: "production",
      },
      {
        resolveServerPath: () => serverPath,
        forkProcess,
        waitForServer,
      },
    );

    expect(forkProcess).toHaveBeenCalledTimes(1);
    expect(forkProcess).toHaveBeenCalledWith(
      serverPath,
      [],
      expect.objectContaining({
        env: expect.objectContaining({
          HOSTNAME: "127.0.0.1",
          NODE_ENV: "production",
        }),
        serviceName: "PLReview Renderer Server",
        stdio: "ignore",
      }),
    );
    expect(waitForServer).toHaveBeenCalledWith(
      expect.stringMatching(/^http:\/\/127\.0\.0\.1:\d+$/u),
    );
    expect(launched?.url).toMatch(/^http:\/\/127\.0\.0\.1:\d+$/u);

    launched?.stop();
    expect(kill).toHaveBeenCalledTimes(1);
  });
});
