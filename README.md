# PLReview

本项目是一个本地优先的策划案评审桌面应用，面向需要批量审阅文档、维护评审规则、管理模型配置并追踪评审结果的工作流。

当前主形态是 Electron + Next.js 桌面端。评审数据和文档解析结果保存在本地 SQLite 中，模型调用通过 OpenAI 兼容接口完成。

## 项目状态

- 当前版本：`0.3.0`
- 当前主入口：桌面应用开发模式 `npm run desktop:dev`
- 当前支持的模型接口：OpenAI 兼容格式
- 当前支持的导入文件：`docx`、`txt`、`md`、`xlsx`

## 文档导航

- [快速开始](#快速开始)
- [典型使用流程](#典型使用流程)
- [常用命令](#常用命令)
- [桌面构建与分发](./docs/deployment/desktop-build-and-distribution.md)
- [文档目录说明](./docs/README.md)

## 主要能力

- 从工作台直接发起新的评审批次
- 维护规则库，并按批次选择本次生效的规则
- 维护模型配置，区分演示模式与实时模式
- 导入本地文档并展示解析摘要
- 在评审任务页查看状态、筛选队列、重试失败项、导出清单
- 在详情页查看问题标注、原文定位和 Markdown 报告

## 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 配置环境变量

```bash
cp .env.example .env
```

默认开发环境会使用：

- `DATABASE_URL`
- `APP_ENCRYPTION_KEY`

如需初始化默认 OpenAI 兼容配置，可补充：

- `OPENAI_COMPATIBLE_API_KEY`
- `OPENAI_COMPATIBLE_BASE_URL`
- `OPENAI_COMPATIBLE_DEFAULT_MODEL`

示例见 [.env.example](/Users/jiangdongzhe/Dev/ai-project/plreview/.env.example)。

### 3. 初始化数据库

```bash
npm run db:generate
npm run db:push
npm run db:seed
```

### 4. 启动桌面开发环境

```bash
npm run desktop:dev
```

这个命令会同时启动：

- Next.js 开发服务
- Electron 桌面壳

这是当前最接近真实使用路径的开发入口。

### 5. 可选：只调试渲染层

```bash
npm run dev
```

浏览器地址默认是 [http://localhost:3000](http://localhost:3000)。
需要注意的是，大部分业务页依赖 `window.plreview` 桌面 bridge；直接在浏览器访问时会进入“桌面桥接不可用”的降级状态，因此这个命令更适合纯界面调试，不适合完整流程验证。

开发期 SQLite 默认位于 [prisma/dev.db](/Users/jiangdongzhe/Dev/ai-project/plreview/prisma/dev.db)。

## 典型使用流程

1. 在“模型配置”页确认本次使用演示模式还是实时模式。
2. 在“规则库”页整理并启用本次需要的规则。
3. 在“新建批次”页填写批次信息，导入本地文件并确认解析摘要。
4. 提交批次后，在“评审任务”页查看执行状态、失败项和导出操作。
5. 在“评审详情”页复核问题标注、原文证据和 Markdown 报告。

更多产品说明见 [app/docs/page.tsx](/Users/jiangdongzhe/Dev/ai-project/plreview/app/docs/page.tsx) 和 [docs/README.md](/Users/jiangdongzhe/Dev/ai-project/plreview/docs/README.md)。

## 常用命令

```bash
npm run desktop:dev
npm run desktop:build
npm run desktop:dist
npm run desktop:report-size
npm run desktop:verify:mac-release
npm run test:desktop:smoke
npm test
```

命令说明：

- `npm run desktop:dev`：启动桌面开发环境
- `npm run desktop:build`：构建渲染层与桌面运行时
- `npm run desktop:dist`：生成桌面分发产物
- `npm run desktop:report-size`：输出桌面产物体积报告
- `npm run desktop:verify:mac-release`：校验当前 `release/` 下的 macOS 产物
- `npm run test:desktop:smoke`：执行桌面核心链路烟测
- `npm test`：运行 Vitest 测试

## 桌面构建与分发

README 只保留入口说明，详细步骤见：

- [桌面构建与分发总览](./docs/deployment/desktop-build-and-distribution.md)
- [桌面烟测回归说明](./docs/qa/2026-04-21-desktop-smoke-regression.md)
- [Win11 烟测清单](./docs/qa/2026-04-14-win11-smoke-test-checklist.md)

## 项目文档

- [docs/README.md](/Users/jiangdongzhe/Dev/ai-project/plreview/docs/README.md)：`docs/` 目录结构与归档规则
- [docs/documentation-checklist.md](/Users/jiangdongzhe/Dev/ai-project/plreview/docs/documentation-checklist.md)：文档更新检查清单
- [docs/deployment/](/Users/jiangdongzhe/Dev/ai-project/plreview/docs/deployment)：桌面构建、打包与平台分发说明
- [docs/qa/](/Users/jiangdongzhe/Dev/ai-project/plreview/docs/qa)：回归清单、烟测说明、复盘记录
- [docs/plans/](/Users/jiangdongzhe/Dev/ai-project/plreview/docs/plans)：项目级规划与设计文档
- [docs/superpowers/specs/](/Users/jiangdongzhe/Dev/ai-project/plreview/docs/superpowers/specs)：方案设计文档
- [docs/superpowers/plans/](/Users/jiangdongzhe/Dev/ai-project/plreview/docs/superpowers/plans)：实现计划文档

## 文案约束

- 不把设计说明、布局说明、实现说明直接写进产品界面
- 这类信息只保留在代码注释、设计文档、实现文档或评审说明中
- 面向用户的界面文案只保留任务信息、状态信息、操作提示和业务内容
