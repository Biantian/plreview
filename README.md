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

需要回归桌面核心发起链路时，建议补跑：

```bash
npm run test:desktop:smoke
```

说明见 [2026-04-21-desktop-smoke-regression.md](./docs/qa/2026-04-21-desktop-smoke-regression.md)。

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
