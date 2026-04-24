# Centered Overlay Draft Retention Design

Date: 2026-04-24
Branch: `main`

## Goal

调整“新增规则”和“新增模型”的表单浮层体验：打开后不再靠左或偏右侧抽屉，而是以更宽的居中弹窗呈现；用户未保存的新增输入不会因为输入框失焦、取消关闭、点击关闭按钮或按 `Esc` 而被清空。

本轮目标是修正用户对新增表单的空间预期和草稿控制感。用户明确选择居中方案，并要求草稿保留到用户主动清空、保存成功、关闭应用窗口或退出应用为止。

## Scope

### In Scope

- 将规则和模型编辑浮层的主展示形态调整为居中弹窗
- 让居中弹窗横向更宽，适配规则与模型的双列表单字段
- 继续保留浮层内部 `header`、可滚动 `body`、固定 `footer` 的三段结构
- 为“新增规则”和“新增模型”分别保留当前应用生命周期内的未保存草稿
- 在新增表单底部提供“清空”按钮，让用户主动重置草稿
- 保存成功后清空对应新增草稿
- 关闭弹窗、取消、点击遮罩或按 `Esc` 只关闭，不清空新增草稿
- 补充组件测试覆盖草稿保留、主动清空、保存后清理和居中形态

### Out of Scope

- 将草稿写入本地存储、数据库或文件
- 应用重启后恢复未保存草稿
- 为已有规则或已有模型编辑增加跨关闭保留草稿
- 新增未保存变更确认弹窗
- 改动规则或模型的业务字段、保存接口、后端校验
- 重做规则页或模型页的整体信息架构

## Problem Summary

当前 [components/adaptive-form-overlay.tsx](/Users/jiangdongzhe/Dev/ai-project/plreview/components/adaptive-form-overlay.tsx) 会在宽高充足时切到 `drawer` 模式，面板靠右侧停靠。对“新增规则”和“新增模型”这类用户主动创建内容的表单来说，靠边展开不符合当前用户习惯；用户偏好居中，并希望横向空间更宽。

同时，当前新增表单主要依赖非受控字段的 `defaultValue`。关闭新增弹窗会卸载表单，再次打开时字段回到默认值；这让用户感觉只是离开输入框或临时关闭，就丢失了刚输入的内容。用户希望输入由自己控制，除非点击“清空”、保存成功、关闭应用窗口或退出应用，否则不要清空。

## User Decisions Captured

- 浮层位置选择居中，不选择靠右抽屉
- 居中窗口可以横向更大
- 新增规则和新增模型的未保存输入需要在关闭后继续保留
- 草稿不需要跨应用重启保留
- 需要提供明确的“清空”按钮，由用户主动清空

## Approaches Considered

### Approach A: Centered Overlay With Parent-Owned Create Drafts

推荐方案。规则页和模型页继续复用同一个浮层壳体，但壳体主形态统一为居中弹窗并扩大宽度。新增表单的草稿由父组件持有，关闭浮层不会销毁草稿；表单字段变化实时回写父组件。用户点击“清空”或保存成功时才重置草稿。

优点：

- 符合用户选择的居中布局
- 关闭后再打开能恢复未保存输入
- 草稿只存在内存中，不会把 API Key 等敏感信息落盘
- 改动集中在规则/模型管理与表单组件，边界清楚

代价：

- 需要把新增表单从纯 `defaultValue` 过渡到受控草稿或等价的状态同步
- 需要给规则和模型分别定义默认草稿结构与清空逻辑

### Approach B: CSS-Only Centering

只修改浮层 CSS，让它居中且更宽，不改表单状态。

优点：

- 改动最小
- 可快速修正视觉位置

不足：

- 无法满足关闭后保留未保存输入的核心需求
- 用户仍需要担心临时关闭导致输入丢失

### Approach C: Persistent Draft Storage

把新增规则和新增模型草稿写入本地存储或桌面持久化层，应用重启后也恢复。

优点：

- 草稿恢复能力最强

不足：

- 明显超出本轮需求
- 模型表单包含 API Key，持久化未保存密钥会带来安全和清理责任
- 需要额外处理版本迁移、敏感字段加密或排除策略

## Recommended Direction

采用 Approach A。它满足用户选择的居中视觉和输入保留行为，同时避免把未保存草稿持久化到磁盘。实现上以当前应用生命周期为边界：页面组件存在期间保留草稿，关闭应用窗口或退出应用后自然释放。

## Architecture

### Overlay Shell

[components/adaptive-form-overlay.tsx](/Users/jiangdongzhe/Dev/ai-project/plreview/components/adaptive-form-overlay.tsx) 继续作为通用浮层壳体，负责：

- `<dialog>` 打开关闭
- 焦点进入与返回
- 背景滚动锁定
- 遮罩点击、`Esc`、关闭按钮
- 三段布局结构

本轮调整它的形态策略：规则和模型编辑不再在桌面宽窗下靠右停靠，而是稳定居中。可以保留内部 `data-overlay-mode` 标记用于测试和未来扩展，但当前规则/模型新增编辑应呈现为居中模式。

### Business Editors

[components/rule-editor-drawer.tsx](/Users/jiangdongzhe/Dev/ai-project/plreview/components/rule-editor-drawer.tsx) 和 [components/model-editor-drawer.tsx](/Users/jiangdongzhe/Dev/ai-project/plreview/components/model-editor-drawer.tsx) 继续负责字段、提交 payload 和错误展示。为支持草稿保留，它们需要接收新增草稿值和草稿变更回调，或接收等价的受控字段 API。

编辑已有记录时继续以传入的 `rule` 或 `profile` 作为当前编辑对象。新增草稿与已有记录编辑保持隔离。

### Parent State

[components/rules-table.tsx](/Users/jiangdongzhe/Dev/ai-project/plreview/components/rules-table.tsx) 持有新增规则草稿。

[components/model-manager.tsx](/Users/jiangdongzhe/Dev/ai-project/plreview/components/model-manager.tsx) 持有新增模型草稿。

父组件负责：

- 初始化默认新增草稿
- 打开新增表单时传入当前草稿
- 字段变化时更新草稿
- 点击“清空”时重置草稿
- 保存成功后重置草稿并关闭浮层
- 取消或关闭时只关闭浮层，不重置草稿

## Layout Rules

### Position

- 浮层面板居中展示
- 背景页面保留上下文但不可交互
- 不再把规则/模型新增表单靠左、靠右或作为页面普通内容展开

### Width

- 居中面板应比当前居中形态更宽，目标宽度适合双列表单
- 宽屏下建议接近 `760px` 到 `820px` 的视觉宽度
- 小窗口下使用 `min()` 或等价响应式约束，避免横向溢出

### Scrolling

- `header` 固定在上方
- `footer` 固定在下方
- 只有 `body` 负责表单纵向滚动
- 背景页面在浮层打开时锁定滚动

## Draft Behavior

### Create Rule Draft

新增规则草稿包含：

- `name`
- `category`
- `description`
- `promptTemplate`
- `severity`
- `enabled`

默认 `promptTemplate` 使用现有 `RULE_TEMPLATE`，默认 `severity` 使用 `medium`，默认 `enabled` 为 `true`。

### Create Model Draft

新增模型草稿包含：

- `name`
- `provider`
- `vendorKey`
- `mode`
- `baseUrl`
- `defaultModel`
- `modelOptionsText`
- `apiKey`
- `enabled`

默认 `vendorKey` 使用 `openai_compatible`，默认 `mode` 使用 `live`，默认 `enabled` 为 `true`。`apiKey` 只保存在内存状态中，不持久化。

### Close Without Clearing

以下操作只关闭弹窗，不清空新增草稿：

- 点击取消
- 点击右上关闭按钮
- 点击遮罩关闭
- 按 `Esc`

输入框失焦本身不应触发表单清空，也不应触发弹窗关闭。若用户关闭新增弹窗后去编辑已有规则或已有模型，新增草稿仍保留；再次回到新增入口时继续恢复最近未保存的新增输入。

再次点击“新增规则”或“新增模型”时，表单恢复最近未保存草稿。

### Explicit Clear

新增模式下，底部操作区提供“清空”按钮。点击后：

- 当前新增表单字段恢复默认草稿
- 弹窗保持打开
- 不触发保存
- 不影响已有规则或已有模型记录

### Save Success

保存成功后：

- 更新对应列表数据
- 关闭浮层
- 清空对应新增草稿
- 展示现有成功反馈

保存失败时：

- 保留当前草稿
- 保持浮层打开
- 展示现有错误反馈

## Editing Existing Records

编辑已有规则或模型不需要跨关闭保留未保存草稿。原因：

- 当前用户诉求指向“新增规则 / 新增模型”入口
- 已有记录编辑涉及服务端当前值，关闭后再次打开应重新反映当前记录
- 避免用户在不同记录之间切换时出现临时改动串值

切换编辑对象时，表单应显示新对象的当前值，不继承上一个对象的临时输入。

## Accessibility

- 继续使用 `<dialog>` 与 `role="dialog"`
- 保持 `aria-labelledby` 标题关联
- 关闭后焦点返回触发按钮或等价位置
- “清空”按钮使用明确可见文本
- 保存、取消、清空三个操作在 footer 中保持键盘可达

## Testing Strategy

### Component Tests

为规则和模型管理组件补充或调整测试：

- 点击“新增规则”打开居中浮层
- 点击“新增模型”打开居中浮层
- 新增规则输入后关闭，再次打开仍保留输入
- 新增模型输入后关闭，再次打开仍保留输入
- 点击“清空”会重置新增规则草稿
- 点击“清空”会重置新增模型草稿
- 保存新增规则成功后，再次打开新增表单显示默认草稿
- 保存新增模型成功后，再次打开新增表单显示默认草稿
- 保存失败时保留新增草稿
- 编辑已有规则 A 后切换到规则 B，不继承 A 的临时输入
- 编辑已有模型 A 后切换到模型 B，不继承 A 的临时输入

### Overlay Tests

调整 [tests/components/adaptive-form-overlay.test.tsx](/Users/jiangdongzhe/Dev/ai-project/plreview/tests/components/adaptive-form-overlay.test.tsx)：

- 更新形态判断或标记断言，反映规则/模型使用居中模式
- 保留焦点管理、关闭、遮罩点击、滚动锁定和焦点陷阱测试
- 不做像素级宽度断言，只验证稳定 class 或 mode 标记

## Risks

- 如果只改 CSS，不处理父组件草稿，关闭后输入仍会丢失
- 如果把 API Key 草稿写入持久化存储，会引入不必要的敏感信息风险
- 如果新增表单和编辑表单共用同一份草稿，可能导致编辑已有记录时串值
- 如果保存成功不清理草稿，用户再次新增时会看到旧数据，误以为已经保存或复制

## Success Criteria

- “新增规则”和“新增模型”打开后居中展示，且横向空间更宽
- 用户关闭新增弹窗后再次打开，未保存输入仍在
- 用户可以通过“清空”按钮主动重置新增表单
- 保存成功后新增草稿清空
- 保存失败后新增草稿保留
- 关闭应用窗口或退出应用后，未保存草稿自然消失
- 编辑已有记录时不会继承其它记录或新增草稿的临时输入
