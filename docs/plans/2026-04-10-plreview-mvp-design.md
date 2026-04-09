# 策划案评审系统 MVP 设计

## 1. 背景与目标

本项目目标是构建一个可在本机启动的策划案评审系统。用户通过网页上传策划案，系统基于用户维护的评审规则调用大模型，对策划案进行结构化评审，输出报告，并在原文段落位置展示标注结果。

MVP 的核心目标是先跑通以下闭环：

- 上传 `docx`、`txt`、`md` 文件
- 将文档解析为段落数组
- 在网页内维护自定义评审规则
- 通过百炼 OpenAI 兼容接口发起评审
- 生成可浏览的评审报告
- 在原文中按段落高亮评审命中结果
- 持久化保存文档、规则、评审任务与标注结果

## 2. 非目标

以下内容不纳入 MVP 范围：

- `pdf` 文件支持
- 句子级精确定位
- 多用户、登录、权限管理
- 团队共享规则库
- 异步任务队列
- 多供应商复杂路由
- 原文在线编辑与增量重评

## 3. 技术方案

### 3.1 总体架构

MVP 采用单体 Web 应用方案：

- 前端与后端：`Next.js` + `TypeScript`
- 数据库：`SQLite`
- ORM：`Prisma`
- UI：基于 App Router 的服务端与客户端混合渲染
- 模型接入：OpenAI 兼容协议

选择单体应用的原因：

- 本机启动简单
- 开发速度快
- 前后端共享类型方便
- 足够支撑 MVP，后续可按模块拆分

### 3.2 模型接入

首个模型供应商固定为百炼平台，采用 OpenAI 兼容接口：

- `baseURL`: `https://dashscope.aliyuncs.com/compatible-mode/v1`
- 鉴权：环境变量存储 API Key
- 上层能力只依赖 OpenAI 兼容调用接口，不直接耦合厂商 SDK

系统中引入 `llm_profiles` 模型配置表，作为可扩展的模型连接配置来源。MVP 默认仅预置一条百炼配置。

## 4. 页面设计

### 4.1 首页 `/`

展示内容：

- 新建评审入口
- 最近评审记录
- 规则管理入口
- 当前模型配置概览

### 4.2 新建评审页 `/reviews/new`

核心功能：

- 上传 `docx`、`txt`、`md` 文件
- 展示文件解析结果摘要
- 选择或确认启用规则
- 指定本次评审标题
- 发起评审

### 4.3 规则管理页 `/rules`

支持：

- 新增规则
- 编辑规则
- 启用或停用规则
- 按分类查看

规则字段：

- 规则名称
- 分类
- 说明
- 评审提示词模板
- 默认严重级别
- 启用状态

### 4.4 评审详情页 `/reviews/[id]`

页面采用双栏布局：

- 左侧展示原文段落
- 右侧展示评审结果和问题列表

交互要求：

- 点击问题可滚动到对应段落
- 命中段落带有高亮与问题说明
- 支持查看总体摘要与详细问题

## 5. 数据模型

### 5.1 `documents`

存储文档元信息：

- `id`
- `title`
- `filename`
- `file_type`
- `raw_text`
- `paragraph_count`
- `created_at`

### 5.2 `document_paragraphs`

存储结构化段落：

- `id`
- `document_id`
- `paragraph_index`
- `text`
- `char_start`
- `char_end`

### 5.3 `rules`

存储当前可编辑规则定义：

- `id`
- `name`
- `category`
- `description`
- `prompt_template`
- `severity`
- `enabled`
- `created_at`
- `updated_at`

### 5.4 `rule_versions`

存储评审时冻结的规则快照：

- `id`
- `rule_id`
- `version`
- `name_snapshot`
- `description_snapshot`
- `prompt_template_snapshot`
- `severity_snapshot`
- `created_at`

### 5.5 `llm_profiles`

存储模型连接配置：

- `id`
- `name`
- `provider`
- `api_style`
- `base_url`
- `default_model`
- `enabled`
- `created_at`
- `updated_at`

### 5.6 `review_jobs`

存储一次评审任务：

- `id`
- `document_id`
- `llm_profile_id`
- `provider_snapshot`
- `model_name_snapshot`
- `status`
- `summary`
- `overall_score`
- `report_markdown`
- `error_message`
- `created_at`
- `finished_at`

### 5.7 `annotations`

存储段落级评审标注：

- `id`
- `review_job_id`
- `rule_id`
- `rule_version_id`
- `paragraph_index`
- `issue`
- `suggestion`
- `severity`
- `evidence_text`

## 6. 评审数据流

### 6.1 文件导入

1. 用户上传文档
2. 后端解析为纯文本与段落数组
3. 写入 `documents` 与 `document_paragraphs`

### 6.2 发起评审

1. 用户选择启用规则
2. 系统复制规则快照到 `rule_versions`
3. 根据文档段落与规则组装评审请求
4. 调用百炼 OpenAI 兼容接口

### 6.3 结果处理

1. 模型返回结构化 JSON
2. 服务端校验字段与段落索引
3. 写入 `review_jobs` 与 `annotations`
4. 生成报告摘要和报告正文

### 6.4 前端展示

1. 左侧按段落展示原文
2. 根据 `paragraph_index` 高亮命中段落
3. 右侧按规则或严重级别聚合问题

## 7. 规则设计原则

MVP 的规则本质上是“可配置提示词规则”，不引入复杂 DSL。

每条规则至少包含：

- 审查目标
- 判断标准
- 命中时的输出格式要求
- 建议生成要求

为提升稳定性，网页新增规则时提供默认模板骨架，用户在骨架上调整内容，而不是完全自由输入。

## 8. 错误处理

MVP 重点处理以下错误：

- 文件解析失败
- 规则未配置完整
- 模型调用失败
- 模型返回 JSON 非法或段落索引错误

策略：

- 服务端统一校验
- 前端展示可理解错误信息
- 评审任务允许“部分成功”
- 非法 annotation 不影响整体页面渲染

## 9. 测试策略

### 9.1 单元测试

覆盖：

- 文档解析与段落切分
- 规则快照生成
- 模型返回 JSON 校验
- 标注与段落映射

### 9.2 集成测试

覆盖：

- 文件上传与文档入库
- 发起评审与任务生成
- 模型结果落库与结果读取

### 9.3 手工验收

至少验证：

- 正常文档评审链路
- 模型返回异常结构时的兜底
- 规则修改后历史任务仍绑定旧快照

## 10. 实施顺序

建议实现顺序如下：

1. 初始化 Next.js、Prisma、SQLite
2. 完成数据模型与本地数据库
3. 完成规则管理页
4. 完成文件上传与解析
5. 完成评审任务创建与结果入库
6. 完成评审详情页与段落高亮
7. 补充基础测试与演示数据

## 11. 环境变量

MVP 预计需要以下环境变量：

- `DATABASE_URL`
- `OPENAI_COMPATIBLE_API_KEY`
- `OPENAI_COMPATIBLE_BASE_URL`
- `OPENAI_COMPATIBLE_DEFAULT_MODEL`

## 12. 里程碑验收标准

当满足以下条件时，视为 MVP 可用：

- 能本机启动网页
- 能上传并解析 `docx`、`txt`、`md`
- 能新增和编辑规则
- 能调用百炼兼容接口完成一次评审
- 能查看报告与段落标注结果
- 能查看历史评审记录
