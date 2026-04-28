import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawn, spawnSync } from "node:child_process";

const currentFilePath = fileURLToPath(import.meta.url);
const scriptsDir = path.dirname(currentFilePath);
const projectRoot = path.resolve(scriptsDir, "..");
const smokeRoot = fs.mkdtempSync(path.join(os.tmpdir(), "plreview-desktop-smoke-"));
const smokeUserDataPath = path.join(smokeRoot, "user-data");
const smokeFixturePath = path.join(smokeRoot, "smoke-import.md");
const failureScreenshotPath = path.join(smokeRoot, "failure.png");

const debugPort = Number.parseInt(
  process.env.PLREVIEW_DESKTOP_SMOKE_DEBUG_PORT ?? "9333",
  10,
);
const batchName =
  process.env.PLREVIEW_DESKTOP_SMOKE_BATCH_NAME ??
  `桌面烟测-${new Date().toISOString().slice(0, 19).replace(/[-:T]/g, "")}`;
const appBinaryPath =
  process.env.PLREVIEW_DESKTOP_SMOKE_APP_BINARY ??
  path.resolve(
    projectRoot,
    "release/mac-arm64/PLReview.app/Contents/MacOS/PLReview",
  );

let shouldCleanup = process.env.PLREVIEW_DESKTOP_SMOKE_KEEP_ARTIFACTS !== "1";

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function getNpmCommand() {
  return process.platform === "win32" ? "npm.cmd" : "npm";
}

function runCommand(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: projectRoot,
    env: process.env,
    stdio: "inherit",
    ...options,
  });

  if (result.status !== 0) {
    throw new Error(
      `Command failed: ${command} ${args.join(" ")} (exit ${result.status ?? "unknown"})`,
    );
  }
}

function writeSmokeFixture() {
  fs.writeFileSync(
    smokeFixturePath,
    [
      "# 打包烟测导入文档",
      "",
      "这是一个仅用于桌面打包烟测的临时样例文档。",
      "",
      "- 用于验证导入",
      "- 用于验证批次创建",
    ].join("\n"),
  );
}

function createSmokeEnv() {
  const env = {
    ...process.env,
    PLREVIEW_DESKTOP_USER_DATA_PATH: smokeUserDataPath,
    PLREVIEW_SMOKE_IMPORT_PATHS: JSON.stringify([smokeFixturePath]),
  };

  delete env.DATABASE_URL;
  delete env.APP_ENCRYPTION_KEY;

  return env;
}

async function sleep(ms) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function stopExistingAppBinary() {
  if (process.platform !== "darwin") {
    return;
  }

  const result = spawnSync("pkill", ["-f", appBinaryPath], {
    stdio: "ignore",
  });

  if (result.status === 0) {
    await sleep(1000);
  }
}

async function waitForPageTarget(timeoutMs = 20000) {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    try {
      const response = await fetch(`http://127.0.0.1:${debugPort}/json/list`);

      if (response.ok) {
        const targets = await response.json();
        const pageTarget = targets.find(
          (target) => target.type === "page" && typeof target.webSocketDebuggerUrl === "string",
        );

        if (pageTarget?.webSocketDebuggerUrl) {
          return pageTarget.webSocketDebuggerUrl;
        }
      }
    } catch {
      // app not ready yet
    }

    await sleep(250);
  }

  throw new Error(`Timed out waiting for Electron DevTools target on port ${debugPort}.`);
}

function createCdpClient(wsUrl) {
  return new Promise((resolve, reject) => {
    const socket = new WebSocket(wsUrl);
    const pending = new Map();
    let messageId = 0;

    socket.addEventListener("message", (event) => {
      const message = JSON.parse(event.data);

      if (!message.id || !pending.has(message.id)) {
        return;
      }

      const { resolve: done, reject: fail } = pending.get(message.id);
      pending.delete(message.id);

      if (message.error) {
        fail(new Error(message.error.message));
        return;
      }

      done(message.result);
    });

    socket.addEventListener("open", () => {
      resolve({
        close: async () => {
          socket.close();
          await sleep(100);
        },
        send(method, params = {}) {
          return new Promise((done, fail) => {
            messageId += 1;
            pending.set(messageId, { resolve: done, reject: fail });
            socket.send(JSON.stringify({ id: messageId, method, params }));
          });
        },
      });
    });

    socket.addEventListener("error", (event) => {
      reject(new Error(`Failed to connect to DevTools target: ${event.type}`));
    });
  });
}

async function evaluate(client, expression) {
  const result = await client.send("Runtime.evaluate", {
    expression,
    returnByValue: true,
  });

  return result.result.value;
}

async function waitForExpression(client, expression, timeoutMs, errorMessage) {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    if (await evaluate(client, expression)) {
      return;
    }

    await sleep(250);
  }

  throw new Error(errorMessage);
}

async function captureFailureScreenshot(client) {
  if (!client) {
    return;
  }

  const result = await client.send("Page.captureScreenshot", {
    format: "png",
    fromSurface: true,
  });

  fs.writeFileSync(failureScreenshotPath, result.data, "base64");
}

async function stopProcess(child) {
  if (!child || child.killed) {
    return;
  }

  child.kill("SIGTERM");

  const exited = await Promise.race([
    new Promise((resolve) => child.once("exit", () => resolve(true))),
    sleep(2000).then(() => false),
  ]);

  if (!exited) {
    child.kill("SIGKILL");
  }
}

async function main() {
  assert(
    process.platform === "darwin" || process.env.PLREVIEW_DESKTOP_SMOKE_APP_BINARY,
    "Desktop smoke script currently targets the macOS packaged app. Override PLREVIEW_DESKTOP_SMOKE_APP_BINARY to use another executable.",
  );

  if (process.env.PLREVIEW_DESKTOP_SMOKE_SKIP_DIST !== "1") {
    runCommand(getNpmCommand(), ["run", "desktop:dist"]);
  }

  assert(
    fs.existsSync(appBinaryPath),
    `Packaged app binary not found at ${appBinaryPath}. Run npm run desktop:dist first.`,
  );

  writeSmokeFixture();

  const smokeEnv = createSmokeEnv();
  await stopExistingAppBinary();

  const appProcess = spawn(appBinaryPath, [`--remote-debugging-port=${debugPort}`], {
    cwd: projectRoot,
    env: smokeEnv,
    stdio: "ignore",
  });

  let client = null;

  try {
    const pageTargetUrl = await waitForPageTarget();
    client = await createCdpClient(pageTargetUrl);

    await client.send("Page.enable");
    await client.send("Runtime.enable");
    await client.send("Page.navigate", { url: "plreview://app/reviews/new" });

    await waitForExpression(
      client,
      [
        "Boolean(document.querySelector('#batchName'))",
        "document.body.innerText.includes('选择规则')",
        "document.body.innerText.includes('选择本地文件')",
      ].join(" && "),
      15000,
      "New batch page did not finish loading.",
    );

    await evaluate(
      client,
      `(() => {
        const input = document.querySelector('#batchName');
        const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
        setter?.call(input, ${JSON.stringify(batchName)});
        input?.dispatchEvent(new Event('input', { bubbles: true }));
        input?.dispatchEvent(new Event('change', { bubbles: true }));
        return input?.value ?? null;
      })()`,
    );

    await evaluate(
      client,
      `(() => {
        const trigger = [...document.querySelectorAll('button')].find((item) =>
          (item.innerText || '').includes('选择规则'),
        );
        trigger?.click();
        return Boolean(trigger);
      })()`,
    );

    await waitForExpression(
      client,
      "document.querySelectorAll('.launch-rule-option input[type=\"checkbox\"]').length > 0",
      15000,
      "Rule drawer did not load selectable rules.",
    );

    await evaluate(
      client,
      `(() => {
        const checkbox = document.querySelector('.launch-rule-option input[type="checkbox"]');
        checkbox?.click();
        const confirm = [...document.querySelectorAll('button')].find((item) =>
          (item.innerText || '').includes('确认带回'),
        );
        confirm?.click();
        return Boolean(checkbox) && Boolean(confirm);
      })()`,
    );

    await waitForExpression(
      client,
      "document.querySelectorAll('.launch-rule-summary-card').length > 0",
      15000,
      "Selected rules did not return to the launch page.",
    );

    await evaluate(
      client,
      `(() => {
        const button = document.querySelector('button[aria-label="选择本地文件"]');
        button?.click();
        return Boolean(button);
      })()`,
    );

    await waitForExpression(
      client,
      `document.body.innerText.includes('已导入 1 条') && document.body.innerText.includes(${JSON.stringify(batchName)})`,
      15000,
      "Imported file did not appear in the launch workbench.",
    );

    await waitForExpression(
      client,
      `(() => {
        const button = [...document.querySelectorAll('button')].find((item) =>
          (item.innerText || '').includes('开始评审'),
        );
        return Boolean(button) && button.disabled === false;
      })()`,
      15000,
      "Launch button never became enabled.",
    );

    await evaluate(
      client,
      `(() => {
        const button = [...document.querySelectorAll('button')].find((item) =>
          (item.innerText || '').includes('开始评审'),
        );
        button?.click();
        return Boolean(button);
      })()`,
    );

    await waitForExpression(
      client,
      "location.href.endsWith('/reviews')",
      15000,
      "Smoke batch did not navigate to the reviews page.",
    );

    const reviewsPageText = await evaluate(client, "document.body.innerText");

    assert(
      reviewsPageText.includes(batchName),
      `Reviews page did not include the smoke batch name: ${batchName}`,
    );
    assert(
      reviewsPageText.toLowerCase().includes("smoke-import.md"),
      "Reviews page did not include the smoke-import.md review row.",
    );

    const summary = {
      batchName,
      result: "ok",
      artifactsRetained: !shouldCleanup,
    };

    if (!shouldCleanup) {
      summary.userData = smokeUserDataPath;
      summary.fixture = smokeFixturePath;
    }

    console.log(JSON.stringify(summary, null, 2));
  } catch (error) {
    shouldCleanup = false;

    try {
      await captureFailureScreenshot(client);
    } catch {
      // best effort
    }

    console.error(`Desktop smoke failed. Preserved artifacts at ${smokeRoot}`);
    throw error;
  } finally {
    if (client) {
      await client.close();
    }

    await stopProcess(appProcess);

    if (shouldCleanup) {
      fs.rmSync(smokeRoot, { recursive: true, force: true });
    }
  }
}

await main();
