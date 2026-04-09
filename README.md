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

## 模型接口

- `baseURL`: `https://dashscope.aliyuncs.com/compatible-mode/v1`
- 目前仅支持 OpenAI 兼容格式接口

## 说明

如果没有配置 `OPENAI_COMPATIBLE_API_KEY`，系统会自动进入演示模式，生成一份本地模拟评审结果，方便先验证 UI 和流程。
