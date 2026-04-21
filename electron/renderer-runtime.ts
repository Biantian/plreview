import path from "node:path";
import fs from "node:fs";

export const PACKAGED_RENDERER_SCHEME = "plreview";
export type RendererRuntimeMode = "development" | "packaged";

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
  mode: RendererRuntimeMode;
  resourcesPath?: string;
  resolvePackagedHtmlPath?: (options: {
    currentDir: string;
    resourcesPath?: string;
  }) => string | null;
};

export async function resolveRendererLoadTarget(
  options: ResolveRendererLoadTargetOptions,
): Promise<RendererLoadTarget> {
  if (options.mode === "development") {
    return {
      kind: "url",
      url: options.env.ELECTRON_RENDERER_URL || "http://localhost:3000",
    };
  }

  if (options.env.ELECTRON_RENDERER_HTML) {
    return {
      kind: "file",
      filePath: path.resolve(options.env.ELECTRON_RENDERER_HTML),
    };
  }

  const packagedHtmlPath = (options.resolvePackagedHtmlPath ?? resolvePackagedHtmlPath)(
    {
      currentDir: options.currentDir,
      resourcesPath: options.resourcesPath,
    },
  );

  if (packagedHtmlPath) {
    return {
      kind: "file",
      filePath: packagedHtmlPath,
    };
  }

  return {
    kind: "fallback",
  };
}

function resolvePackagedHtmlPath(options: {
  currentDir: string;
  resourcesPath?: string;
}) {
  const unpackedHtmlPath = path.join(options.currentDir, "../../out/index.html");
  const packagedResourcesPath =
    options.resourcesPath ??
    (typeof process.resourcesPath === "string" && process.resourcesPath.length > 0
      ? process.resourcesPath
      : undefined);
  const packagedHtmlPath = packagedResourcesPath
    ? path.join(packagedResourcesPath, "out/index.html")
    : null;

  if (packagedHtmlPath && fs.existsSync(packagedHtmlPath)) {
    return packagedHtmlPath;
  }

  if (fs.existsSync(unpackedHtmlPath)) {
    return unpackedHtmlPath;
  }

  return null;
}

export function resolvePackagedRendererAssetPath(
  rendererRoot: string,
  requestPathname: string,
) {
  const normalizedRoot = path.resolve(rendererRoot);
  const normalizedPathname = normalizeRequestPathname(requestPathname);

  for (const candidatePath of getRendererAssetCandidates(normalizedPathname)) {
    const resolvedPath = path.resolve(normalizedRoot, `.${candidatePath}`);

    if (!isWithinRendererRoot(normalizedRoot, resolvedPath)) {
      continue;
    }

    if (fs.existsSync(resolvedPath) && fs.statSync(resolvedPath).isFile()) {
      return resolvedPath;
    }
  }

  return null;
}

function normalizeRequestPathname(requestPathname: string) {
  if (!requestPathname || requestPathname === "/") {
    return "/";
  }

  const withLeadingSlash = requestPathname.startsWith("/")
    ? requestPathname
    : `/${requestPathname}`;

  return withLeadingSlash.replace(/\/+$/, "") || "/";
}

function getRendererAssetCandidates(requestPathname: string) {
  if (requestPathname === "/") {
    return ["/index.html"];
  }

  if (path.extname(requestPathname)) {
    return [requestPathname];
  }

  return [`${requestPathname}.html`, `${requestPathname}/index.html`];
}

function isWithinRendererRoot(rendererRoot: string, resolvedPath: string) {
  const relativePath = path.relative(rendererRoot, resolvedPath);

  return relativePath === "" || (!relativePath.startsWith("..") && !path.isAbsolute(relativePath));
}
