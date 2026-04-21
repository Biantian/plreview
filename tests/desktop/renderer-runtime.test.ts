import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import {
  resolvePackagedRendererAssetPath,
  resolveRendererLoadTarget,
} from "@/electron/renderer-runtime";

function createEnv(overrides: Record<string, string> = {}): NodeJS.ProcessEnv {
  return {
    NODE_ENV: "test",
    ...overrides,
  };
}

describe("resolveRendererLoadTarget", () => {
  const tempDirs: string[] = [];

  afterEach(() => {
    for (const tempDir of tempDirs) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it("loads localhost:3000 by default in development mode", async () => {
    await expect(
      resolveRendererLoadTarget({
        currentDir: "/tmp/plreview/electron",
        env: createEnv(),
        mode: "development",
      }),
    ).resolves.toEqual({
      kind: "url",
      url: "http://localhost:3000",
    });
  });

  it("honors ELECTRON_RENDERER_URL override in development mode", async () => {
    await expect(
      resolveRendererLoadTarget({
        currentDir: "/tmp/plreview/electron",
        env: createEnv({
          ELECTRON_RENDERER_URL: "http://127.0.0.1:4123",
        }),
        mode: "development",
      }),
    ).resolves.toEqual({
      kind: "url",
      url: "http://127.0.0.1:4123",
    });
  });

  it("resolves packaged html from process resources in packaged mode", async () => {
    const resourcesRoot = fs.mkdtempSync(path.join(os.tmpdir(), "plreview-renderer-resources-"));
    tempDirs.push(resourcesRoot);
    fs.mkdirSync(path.join(resourcesRoot, "out"), { recursive: true });
    fs.writeFileSync(path.join(resourcesRoot, "out/index.html"), "packaged");

    await expect(
      resolveRendererLoadTarget({
        currentDir: "/tmp/plreview/.desktop-runtime/electron",
        env: createEnv(),
        mode: "packaged",
        resourcesPath: resourcesRoot,
      }),
    ).resolves.toEqual({
      kind: "file",
      filePath: path.join(resourcesRoot, "out/index.html"),
    });
  });

  it("resolves unpacked out/index.html in packaged mode when resources html is missing", async () => {
    const projectRoot = fs.mkdtempSync(path.join(os.tmpdir(), "plreview-renderer-project-"));
    tempDirs.push(projectRoot);
    const currentDir = path.join(projectRoot, ".desktop-runtime/electron");
    fs.mkdirSync(currentDir, { recursive: true });
    fs.mkdirSync(path.join(projectRoot, "out"), { recursive: true });
    fs.writeFileSync(path.join(projectRoot, "out/index.html"), "unpacked");

    await expect(
      resolveRendererLoadTarget({
        currentDir,
        env: createEnv(),
        mode: "packaged",
        resourcesPath: path.join(projectRoot, "missing-resources"),
      }),
    ).resolves.toEqual({
      kind: "file",
      filePath: path.join(projectRoot, "out/index.html"),
    });
  });

  it("ignores renderer url overrides and can honor html override in packaged mode", async () => {
    const htmlPath = path.resolve("out/index.html");

    await expect(
      resolveRendererLoadTarget({
        currentDir: "/tmp/plreview/.desktop-runtime/electron",
        env: createEnv({
          ELECTRON_RENDERER_URL: "http://localhost:3100",
          ELECTRON_RENDERER_HTML: "out/index.html",
        }),
        mode: "packaged",
      }),
    ).resolves.toEqual({
      kind: "file",
      filePath: htmlPath,
    });
  });

  it("falls back to the shell page when packaged html is unavailable", async () => {
    await expect(
      resolveRendererLoadTarget({
        currentDir: "/tmp/plreview/.desktop-runtime/electron",
        env: createEnv(),
        mode: "packaged",
        resourcesPath: "/tmp/plreview/missing-resources",
      }),
    ).resolves.toEqual({
      kind: "fallback",
    });
  });
});

describe("resolvePackagedRendererAssetPath", () => {
  const tempDirs: string[] = [];

  afterEach(() => {
    for (const tempDir of tempDirs) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it("maps app routes and static assets into the exported out directory", () => {
    const rendererRoot = fs.mkdtempSync(path.join(os.tmpdir(), "plreview-renderer-root-"));
    tempDirs.push(rendererRoot);

    fs.mkdirSync(path.join(rendererRoot, "_next/static/css"), { recursive: true });
    fs.writeFileSync(path.join(rendererRoot, "index.html"), "root");
    fs.writeFileSync(path.join(rendererRoot, "reviews.html"), "reviews");
    fs.mkdirSync(path.join(rendererRoot, "reviews"), { recursive: true });
    fs.writeFileSync(path.join(rendererRoot, "reviews/detail.html"), "detail");
    fs.writeFileSync(path.join(rendererRoot, "_next/static/css/app.css"), "css");

    expect(resolvePackagedRendererAssetPath(rendererRoot, "/")).toBe(
      path.join(rendererRoot, "index.html"),
    );
    expect(resolvePackagedRendererAssetPath(rendererRoot, "/reviews")).toBe(
      path.join(rendererRoot, "reviews.html"),
    );
    expect(resolvePackagedRendererAssetPath(rendererRoot, "/reviews/detail")).toBe(
      path.join(rendererRoot, "reviews/detail.html"),
    );
    expect(resolvePackagedRendererAssetPath(rendererRoot, "/_next/static/css/app.css")).toBe(
      path.join(rendererRoot, "_next/static/css/app.css"),
    );
  });

  it("rejects traversal outside the exported renderer root", () => {
    const rendererRoot = fs.mkdtempSync(path.join(os.tmpdir(), "plreview-renderer-root-"));
    tempDirs.push(rendererRoot);

    fs.writeFileSync(path.join(rendererRoot, "index.html"), "root");

    expect(resolvePackagedRendererAssetPath(rendererRoot, "/../../etc/passwd")).toBeNull();
  });
});
