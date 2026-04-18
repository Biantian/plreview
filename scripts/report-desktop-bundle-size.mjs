import fs from "node:fs";
import path from "node:path";

const ARTIFACT_TARGETS = [
  {
    id: "nextStandalone",
    path: ".next/standalone",
  },
  {
    id: "nextStatic",
    path: ".next/static",
  },
  {
    id: "electronMainBootstrap",
    path: "electron/main.cjs",
  },
  {
    id: "electronPreloadBootstrap",
    path: "electron/preload.cjs",
  },
  {
    id: "workerBootstrap",
    path: "desktop/worker/background-entry.cjs",
  },
  {
    id: "taskBootstrap",
    path: "desktop/worker/task-entry.cjs",
  },
  {
    id: "release",
    path: "release",
  },
];

const report = {
  generatedAt: new Date().toISOString(),
  cwd: process.cwd(),
  artifacts: ARTIFACT_TARGETS.map((target) => {
    const absolutePath = path.resolve(target.path);

    if (!fs.existsSync(absolutePath)) {
      return {
        ...target,
        exists: false,
        type: "missing",
        bytes: 0,
        fileCount: 0,
      };
    }

    const stats = readStats(absolutePath);

    return {
      ...target,
      exists: true,
      type: stats.type,
      bytes: stats.bytes,
      fileCount: stats.fileCount,
      sizeMiB: Number((stats.bytes / 1024 / 1024).toFixed(3)),
    };
  }),
};

const totals = report.artifacts.reduce(
  (summary, artifact) => {
    if (artifact.exists) {
      summary.existingArtifacts += 1;
      summary.bytes += artifact.bytes;
      summary.fileCount += artifact.fileCount;
    }

    return summary;
  },
  {
    existingArtifacts: 0,
    bytes: 0,
    fileCount: 0,
  },
);

console.log(
  JSON.stringify(
    {
      ...report,
      totals: {
        ...totals,
        sizeMiB: Number((totals.bytes / 1024 / 1024).toFixed(3)),
      },
    },
    null,
    2,
  ),
);

function readStats(targetPath) {
  const stat = fs.statSync(targetPath);

  if (stat.isFile()) {
    return {
      type: "file",
      bytes: stat.size,
      fileCount: 1,
    };
  }

  return fs.readdirSync(targetPath).reduce(
    (summary, entry) => {
      const entryStats = readStats(path.join(targetPath, entry));

      summary.bytes += entryStats.bytes;
      summary.fileCount += entryStats.fileCount;

      return summary;
    },
    {
      type: "directory",
      bytes: 0,
      fileCount: 0,
    },
  );
}
