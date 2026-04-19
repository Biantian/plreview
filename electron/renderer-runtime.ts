import fs from "node:fs";
import net from "node:net";
import { createRequire } from "node:module";
import path from "node:path";
import type { ForkOptions, UtilityProcess } from "electron";

type LaunchResult = {
  url: string;
  stop: () => void;
};

type UtilityProcessLike = Pick<UtilityProcess, "kill" | "stdout" | "stderr">;

type LaunchPackagedRendererDependencies = {
  forkProcess?: (
    modulePath: string,
    args: string[],
    options: ForkOptions,
  ) => UtilityProcessLike;
  resolveServerPath?: (currentDir: string) => string | null;
  waitForServer?: (url: string) => Promise<void>;
};

export type RendererLoadTarget =
  | {
      kind: "url";
      url: string;
      stop?: () => void;
    }
  | {
      kind: "file";
      filePath: string;
    }
  | {
      kind: "fallback";
    };

type ResolveRendererLoadTargetOptions = {
  currentDir: string;
  env: NodeJS.ProcessEnv;
  launchPackagedRenderer?: (
    currentDir: string,
    env: NodeJS.ProcessEnv,
  ) => Promise<LaunchResult | null>;
};

export async function resolveRendererLoadTarget(
  options: ResolveRendererLoadTargetOptions,
): Promise<RendererLoadTarget> {
  if (options.env.ELECTRON_RENDERER_URL) {
    return {
      kind: "url",
      url: options.env.ELECTRON_RENDERER_URL,
    };
  }

  if (options.env.ELECTRON_RENDERER_HTML) {
    return {
      kind: "file",
      filePath: path.resolve(options.env.ELECTRON_RENDERER_HTML),
    };
  }

  const packagedRenderer =
    await (options.launchPackagedRenderer ?? launchPackagedRenderer)(
      options.currentDir,
      options.env,
    );

  if (packagedRenderer) {
    return {
      kind: "url",
      url: packagedRenderer.url,
      stop: packagedRenderer.stop,
    };
  }

  return {
    kind: "fallback",
  };
}

export async function launchPackagedRenderer(
  currentDir: string,
  env: NodeJS.ProcessEnv,
  dependencies: LaunchPackagedRendererDependencies = {},
): Promise<LaunchResult | null> {
  const serverPath = (dependencies.resolveServerPath ?? resolvePackagedServerPath)(
    currentDir,
  );

  if (!serverPath || !fs.existsSync(serverPath)) {
    return null;
  }

  const port = await findAvailablePort();
  const child = (dependencies.forkProcess ?? forkRendererProcess)(serverPath, [], {
    env: {
      ...env,
      HOSTNAME: "127.0.0.1",
      PORT: String(port),
    },
    serviceName: "PLReview Renderer Server",
    stdio: "ignore",
  });

  await (dependencies.waitForServer ?? waitForServer)(`http://127.0.0.1:${port}`);

  return {
    url: `http://127.0.0.1:${port}`,
    stop: () => stopChild(child),
  };
}

function resolvePackagedServerPath(currentDir: string) {
  const unpackedResourcesPath = path.join(
    currentDir,
    "../../.next/standalone/server.js",
  );
  const packagedResourcesPath = path.join(
    process.resourcesPath,
    "app.asar.unpacked/.next/standalone/server.js",
  );

  if (fs.existsSync(packagedResourcesPath)) {
    return packagedResourcesPath;
  }

  if (fs.existsSync(unpackedResourcesPath)) {
    return unpackedResourcesPath;
  }

  return null;
}

function forkRendererProcess(
  modulePath: string,
  args: string[],
  options: ForkOptions,
) {
  const electron = getElectronModule();

  return electron.utilityProcess.fork(modulePath, args, options);
}

function getElectronModule(): {
  utilityProcess: {
    fork: (
      modulePath: string,
      args?: string[],
      options?: ForkOptions,
    ) => UtilityProcessLike;
  };
} {
  return createRequire(__filename)("electron");
}

async function findAvailablePort() {
  return new Promise<number>((resolve, reject) => {
    const server = net.createServer();
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();

      server.close(() => {
        if (!address || typeof address === "string") {
          reject(new Error("Failed to resolve an available renderer port."));
          return;
        }

        resolve(address.port);
      });
    });
  });
}

async function waitForServer(url: string) {
  const startedAt = Date.now();

  while (Date.now() - startedAt < 15_000) {
    try {
      const response = await fetch(url);

      if (response.ok || response.status === 404) {
        return;
      }
    } catch {
      // Retry until timeout.
    }

    await new Promise((resolve) => setTimeout(resolve, 250));
  }

  throw new Error(`Packaged renderer did not become ready: ${url}`);
}

function stopChild(child: UtilityProcessLike) {
  child.kill();
}
