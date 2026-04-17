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

桌面模式会启动 `Next.js` 渲染层和 `Electron` 壳层。默认仍使用本地 SQLite，只有大模型调用会走网络。

## 桌面应用打包

```bash
npm run desktop:build
npm run desktop:dist
```

打包配置位于 [electron-builder.yml](./electron-builder.yml)。产物默认输出到 `release/`。

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

1. 在“模型设置”中通过列表查看现有配置，按需打开抽屉新增或编辑模型
2. 在“规则管理”中确认本次评审真正需要启用的规则
3. 在“新建评审”中按单列流程依次填写批次信息、勾选规则并导入本地文件
4. 确认至少有 1 个可提交文件后，点击“开始批量评审”创建任务
5. 在“评审列表”中等待后台任务完成，并进入结果页做核对
6. 需要查操作说明时，打开“文档”页，按左侧目录和右侧文章目录快速跳转
