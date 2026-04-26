# 策划案评审系统

本项目正在从 Web MVP 迭代为本地优先桌面应用，当前已经支持：

- 上传 `docx`、`txt`、`md`
- 导入 `xlsx` 作为完整策划案评审输入
- 批量发起同规则评审工作台
- 表格化的评审任务中心与规则中心
- 使用百炼 OpenAI 兼容接口进行评审
- 生成报告并在原文段落位置展示标注结果

## 本地启动

1. 安装依赖

```bash
npm install
```

2. 配置环境变量

```bash
cp .env.example .env
```

设置：

- `DATABASE_URL`
- `APP_ENCRYPTION_KEY`

如需初始化默认百炼配置，可额外设置：

- `OPENAI_COMPATIBLE_BASE_URL`
- `OPENAI_COMPATIBLE_DEFAULT_MODEL`

3. 初始化数据库

```bash
npm run db:generate
npm run db:push
npm run db:seed
```

4. 启动开发环境

```bash
npm run dev
```

默认地址为 [http://localhost:3000](http://localhost:3000)。

SQLite 数据会落在 [prisma/dev.db](./prisma/dev.db)。

## 桌面应用调试

```bash
npm install
npm run db:push
npm run desktop:dev
```

桌面开发模式会启动 `Electron` 壳层，并继续连接本地 `http://localhost:3000` 的 Next.js 开发服务。
默认仍使用本地 SQLite，只有大模型调用会走网络。
开发态的源代码 `preload` 引导现在刻意保持为可直接被 Electron sandbox 执行的自包含 CJS 文件；如果后续调整 `electron/preload.cjs`，不要重新引入 `tsx` 或额外的本地模块加载。

## 桌面应用打包

```bash
npm run desktop:build
npm run desktop:dist
```

打包配置位于 [electron-builder.yml](./electron-builder.yml)。产物默认输出到 `release/`。
生产环境不再在 Electron 内部启动独立的 Next.js Node 服务器，而是直接加载静态导出的 `out/` 目录。
打包产物会额外内置一份预置好的 SQLite 模板库；首次启动时，桌面应用会把它复制到 Electron `userData` 目录，并在同目录生成持久化的 `APP_ENCRYPTION_KEY`，不再依赖源码树里的 `.env` / `prisma/dev.db`。
`npm run desktop:dist` 现在会在打包完成后自动输出一份机器可读的桌面产物体积报告。
通过 `npm run desktop:dist -- ...` 追加的参数会继续原样转发给 `electron-builder`，例如 `--win --x64 --dir`。
`npm run desktop:dist` 更适合本地自测；如果要把 macOS DMG 发给别人安装，请使用下面的正式发布链路。

如需单独查看当前本地产物清单与体积，可执行：

```bash
npm run desktop:report-size
```

该命令会输出 JSON，汇总当前工作区内与桌面打包直接相关的本地产物，例如：

- `out/`
- `electron/main.cjs`
- `electron/preload.cjs`
- `desktop/worker/background-entry.cjs`
- `desktop/worker/task-entry.cjs`
- `release/`

调整桌面打包输入后，建议先运行：

```bash
npm test -- --run tests/desktop/desktop-packaging.test.ts tests/desktop/desktop-size-report.test.ts
npm run desktop:report-size
```

当前桌面架构的打包链路是：

- `next.config.ts` 使用 `output: "export"` 生成静态 `out/`
- 开发环境由 Electron 加载 `http://localhost:3000`
- 生产环境由 Electron 直接加载 `out/index.html`
- 页面数据通过 `electron/preload` 暴露的桌面 bridge 进入渲染层，而不是依赖 Next.js API Routes
- 开发态的 `desktop:main` 也必须能直接注入 `window.plreview`，不能出现“窗口打开了但桥接不可用”的半失效状态

需要回归桌面核心发起链路时，建议补跑：

```bash
npm run test:desktop:smoke
```

说明见 [2026-04-21-desktop-smoke-regression.md](./docs/qa/2026-04-21-desktop-smoke-regression.md)。

### macOS 朋友试用

如果这次只是把应用发给少量朋友试用，可以先不做正式签名和公证，但需要明确这不是正式分发方案。

推荐流程：

1. 你本机打包：`npm run desktop:dist -- --mac dmg --arm64`
2. 把 `dmg` 或 `.app` 发给朋友
3. 对方拖到 `Applications`
4. 对方执行：

```bash
xattr -dr com.apple.quarantine /Applications/PLReview.app
```

5. 再打开应用；如果系统仍拦截，再尝试右键“打开”

这个方案适合小范围试用。只要经过微信、聊天工具、网盘或浏览器下载，macOS 往往会补上 quarantine 标记；未正式签名/公证的应用就容易被提示“已损坏，无法打开”。

### macOS 正式发布

先准备好签名证书。正式对外分发的 mac 版本需要：

- `Developer ID Application` 证书
- `electron-builder` 可用的签名来源
  - 本机钥匙串里已导入证书，或
  - `CSC_LINK` + `CSC_KEY_PASSWORD`
- 任选一种 notarization 凭据方案
  - `APPLE_KEYCHAIN_PROFILE`
  - `APPLE_API_KEY` + `APPLE_API_KEY_ID` + `APPLE_API_ISSUER`
  - `APPLE_ID` + `APPLE_APP_SPECIFIC_PASSWORD` + `APPLE_TEAM_ID`

正式打包命令：

```bash
npm run desktop:release:mac
```

该命令会：

- 触发正式 mac 打包
- 开启 `PLREVIEW_MAC_NOTARIZE=1`
- 在 `afterSign` 阶段提交 Apple notarization
- 打包完成后自动执行本地验签与 stapler 校验

如果只想单独复验当前 `release/` 目录中的 mac 产物，可执行：

```bash
npm run desktop:verify:mac-release
```

对应的关键校验命令是：

```bash
codesign --verify --deep --strict --verbose=2 release/mac-arm64/PLReview.app
spctl -a -vv release/mac-arm64/PLReview.app
xcrun stapler validate release/PLReview-0.1.0-arm64.dmg
```

如果别人从聊天工具或网盘下载后出现“已损坏，无法打开”，优先检查签名、公证和 stapler 是否成功，不要先假设是传输工具本身损坏了文件。
如果当前只是少量熟人试用，也可以先按上面的“macOS 朋友试用”流程移除 quarantine 标记。

### Win11 打包（当前环境推荐）

```bash
ELECTRON_MIRROR=https://npmmirror.com/mirrors/electron/ \
ELECTRON_BUILDER_BINARIES_MIRROR=https://npmmirror.com/mirrors/electron-builder-binaries/ \
npm run desktop:dist -- --win --x64 --dir
```

若需要正式安装包（`nsis`），建议在 Win11 主机上执行 `npm run desktop:dist -- --win --x64`，避免跨平台下载和签名工具链导致的不稳定。

Win11 手工烟测步骤见 [2026-04-14-win11-smoke-test-checklist.md](./docs/qa/2026-04-14-win11-smoke-test-checklist.md)。

## 模型接口

- `baseURL`: `https://dashscope.aliyuncs.com/compatible-mode/v1`
- 目前仅支持 OpenAI 兼容格式接口

## 界面文案规范

- 不要把设计说明、布局说明、实现说明直接写进产品界面。
- 这类说明只允许出现在代码注释、设计文档、实现文档或评审说明中。
- 面向用户的界面文案只保留任务信息、状态信息、操作提示和业务内容。

## 使用流程

1. 先在“模型配置”里确认可用模型与密钥状态
2. 再到“规则库”里只保留本次批次真正需要的规则
3. 进入“新建批次”填写批次名称、勾选规则并导入本地文件
4. 确认至少有 1 个文件可提交后，点击“开始评审”创建批次
5. 在“评审任务”中查看后台执行状态，并进入详情页核对结果
6. 需要查操作说明时，打开“帮助文档”查看流程和结果阅读指引
