# Launch Guidance And Rule Delete Design

Date: 2026-04-27  
Status: Approved in conversation, pending written spec review

## Goal

本轮收口 3 项优化：

1. 顶部增加隐藏可拖动边，且在全平台行为一致（macOS / Windows / Linux）。
2. 在“新建批次”页面中，点击“开始评审”但信息缺失时，不再仅用文案提示；改为“缺失项全量高亮 + 自动定位第一个缺失项 + 焦点落位”。
3. 规则库增加删除能力，并采用“有关联软删除、无关联硬删除”的统一策略，且删除必须二次确认。

用户已明确取消“红绿灯按钮放大”需求，不纳入本轮。

## Scope

### In Scope

- 桌面壳全局顶部拖拽交互调整（不改变业务页面信息架构）
- [components/intake-workbench.tsx](../../../components/intake-workbench.tsx) 的缺失项引导交互升级
- 规则删除的前后端链路补齐（UI、bridge、IPC、service、数据层）
- 规则库“显示已删除”低权重筛选入口（折叠/隐藏式）
- 相关单测补充与回归

### Out of Scope

- 红绿灯样式、尺寸、位置调整
- 新建批次页面整体重排或新增流程步骤
- 规则版本体系重构
- 规则删除后的跨应用重启恢复、审计历史页等扩展能力

## User Decisions Captured

1. 顶部拖拽边要全平台统一处理。
2. 新建批次缺失信息提示采用“高亮全部缺失项，并跳转到第一个”。
3. 规则删除策略为混合：  
   - 有关联：软删除  
   - 无关联：硬删除  
   删除时统一二次确认。
4. 规则库默认隐藏软删除项，并提供“显示已删除”开关。
5. “显示已删除”入口视觉上应尽量不起眼，建议折叠在次级入口中。

## Approaches Considered

### A. 仅前端提示增强 + 无数据模型变更

优点：

- 改动小

不足：

- 无法支持软删除语义
- 删除策略无法做到“有引用软删、无引用硬删”

### B. 交互 + 桥接 + 数据层统一收口（Recommended）

优点：

- 与现有桌面桥接架构一致
- 规则删除策略可在服务端统一判定
- 可用最小范围扩展实现稳定行为

代价：

- 涉及多层文件变更（UI、bridge、IPC、service、schema）

### C. 大规模重构规则模块

优点：

- 可一次性统一更多历史问题

不足：

- 超出当前任务边界
- 回归风险不必要增大

## Recommended Direction

采用方案 B：在不重做页面结构的前提下，按现有 Electron + bridge + Prisma 分层，补齐本轮所需最小闭环。

## Architecture

### 1) 顶部隐藏可拖动边

- 在全局布局增加独立顶部拖拽层（透明、低存在感）。
- 拖拽层只承担 `-webkit-app-region: drag`，不承载业务控件。
- 可交互元素维持 `-webkit-app-region: no-drag`，避免误拖拽。
- 该行为在 macOS / Windows / Linux 一致生效。

### 2) 新建批次缺失项引导

在 `IntakeWorkbench` 内新增“缺失项诊断 + 引导状态”：

- 点击“开始评审”时，先统一计算缺失项：`batch`、`profile`、`rules`、`documents`。
- 若存在缺失：
  - 一次性高亮所有缺失区块
  - 自动滚动到第一个缺失区块
  - 将焦点定位到该区块首个可交互控件
- 用户补齐后，对应高亮实时清除。

### 3) 规则删除统一链路

- 前端调用 `deleteRule(id)`，不在前端写删除策略分支。
- 后端统一判定是否有关联引用：
  - 有关联 => 软删除
  - 无关联 => 硬删除
- 返回删除模式用于前端反馈文案（“已软删除”或“已彻底删除”）。

## Data Model And API Changes

### Prisma

在 `Rule` 模型新增：

- `deletedAt DateTime?`

语义：

- `deletedAt = null`：可用规则
- `deletedAt != null`：软删除规则

`enabled` 保持“启用/停用”语义，不承担删除语义。

### Rule Query Defaults

- 默认规则查询仅返回 `deletedAt = null`。
- 规则库页面可通过 `includeDeleted` 获取软删除项。
- 新建批次页只读取 `enabled = true 且 deletedAt = null` 的规则。

### Desktop Bridge / IPC

新增 `rulesDelete` 通道并贯通：

- `desktop/worker/protocol.ts`
- `electron/channels.ts`
- `desktop/bridge/desktop-api.ts`
- `electron/preload.ts`
- `electron/preload.cjs`
- `electron/main.ts`
- `electron/desktop-data-bridge.ts`
- `lib/rules.ts`

### Delete Response Contract

`deleteRule(id)` 返回建议结构：

- `mode: "soft" | "hard"`
- `dashboard: RuleDashboardData`

## UI Behavior

### Rule Library Delete UX

1. 每行保留“删除”动作按钮。
2. 点击删除先弹出二次确认对话框（复用现有 `ConfirmDialog` 风格）。
3. 用户确认后执行删除，完成后展示结果反馈。

### “显示已删除”入口

- 不做主按钮。
- 放入规则表工具栏次级“更多筛选”折叠入口中。
- 默认收起，降低视觉干扰。
- 展开后提供小号开关“显示已删除”。

### Soft-Deleted Row State

- 仅在“显示已删除”开启时可见。
- 明确标注“已删除”状态。
- 软删除项不参与新建批次选择。

## Error Handling

1. 删除失败：保留当前列表，显示错误信息。
2. 并发删除导致目标不存在：反馈“规则已不存在”并刷新列表。
3. 缺失项定位目标临时不可用时：降级为滚动到区块并保留高亮，不阻塞填写。
4. 桌面桥接不可用时：沿用当前错误提示基线，避免静默失败。

## Testing Plan

补充/更新以下测试：

1. `IntakeWorkbench`
   - 点击提交后，缺失项全量高亮
   - 自动定位第一个缺失项
   - 焦点落到目标控件
   - 补齐后对应高亮移除
2. `RulesTable`
   - 删除按钮触发确认弹窗
   - 确认后调用 `deleteRule`
   - 根据 `mode` 展示正确反馈
   - “显示已删除”折叠筛选开关行为正确
3. `desktop-api / channels`
   - `rulesDelete` 在 typed channel map 中完整贯通
4. `lib/rules`
   - 有关联走软删除
   - 无关联走硬删除
   - 默认查询不返回软删除项

## Acceptance Criteria

1. 顶部隐藏拖拽边在三平台可稳定拖动窗口，且不影响页面交互。
2. 新建批次提交缺失时表现为“高亮全部缺失项 + 自动定位首个缺失项 + 焦点落位”。
3. 规则删除必须二次确认。
4. 有关联规则执行软删除；无关联规则执行硬删除。
5. 规则库默认隐藏软删除项，通过折叠筛选入口可切换显示。
6. 新建批次页不会出现软删除规则。

## Implementation Notes (For Planning Phase)

- 优先执行顺序：
  1. schema 与 `lib/rules` 删除策略
  2. bridge / IPC 通道
  3. 规则库删除交互与“显示已删除”入口
  4. 新建批次缺失项定位与动效
  5. 顶部拖拽边与全局样式收口
  6. 单测补齐与回归
