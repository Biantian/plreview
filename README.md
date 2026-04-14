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

将 `OPENAI_COMPATIBLE_API_KEY` 替换为你的百炼 Key。

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

SQLite 数据会落在 [prisma/dev.db](/Users/jiangdongzhe/Dev/ai-project/plreview/prisma/dev.db)。

## 桌面应用调试

```bash
npm install
npm run db:push
npm run desktop:dev
```

桌面模式会启动 `Next.js` 渲染层和 `Electron` 壳层。默认仍使用本地 SQLite，只有大模型调用会走网络。

## 桌面应用打包

```bash
npm run desktop:build
npm run desktop:dist
```

打包配置位于 [electron-builder.yml](/Users/jiangdongzhe/Dev/ai-project/plreview/.worktrees/codex-local-first-desktop-delivery/electron-builder.yml)。产物默认输出到 `release/`。

### Win11 打包（当前环境推荐）

```bash
ELECTRON_MIRROR=https://npmmirror.com/mirrors/electron/ \
ELECTRON_BUILDER_BINARIES_MIRROR=https://npmmirror.com/mirrors/electron-builder-binaries/ \
npm run desktop:dist -- --win --x64 --dir
```

若需要正式安装包（`nsis`），建议在 Win11 主机上执行 `npm run desktop:dist -- --win --x64`，避免跨平台下载和签名工具链导致的不稳定。

Win11 手工烟测步骤见 [2026-04-14-win11-smoke-test-checklist.md](/Users/jiangdongzhe/Dev/ai-project/plreview/.worktrees/codex-local-first-desktop-delivery/docs/qa/2026-04-14-win11-smoke-test-checklist.md)。

## 模型接口

- `baseURL`: `https://dashscope.aliyuncs.com/compatible-mode/v1`
- 目前仅支持 OpenAI 兼容格式接口

## 说明

如果没有配置 `OPENAI_COMPATIBLE_API_KEY`，系统会自动进入演示模式，生成一份本地模拟评审结果，方便先验证 UI 和流程。
