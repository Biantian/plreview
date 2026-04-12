# 策划案评审系统 MVP

本项目是一个可在本机启动的策划案评审系统 MVP，支持：

- 上传 `docx`、`txt`、`md`
- 网页维护评审规则
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

SQLite 数据会落在 [prisma/dev.db](/Users/jiangdongzhe/Dev/ai-project/plreview/prisma/dev.db)。

## 模型接口

- `baseURL`: `https://dashscope.aliyuncs.com/compatible-mode/v1`
- 目前仅支持 OpenAI 兼容格式接口

## 使用流程

1. 在顶部“模型设置”中创建一个实时或演示配置
2. 在“规则管理”中确认启用规则
3. 在“新建评审”中选择模型配置与模型名称
4. 在“评审列表”中等待后台任务完成
5. 在“帮助”页查看完整说明
