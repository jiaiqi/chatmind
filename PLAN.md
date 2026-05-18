# ChatMind 优化与完善方案

> 基于 WeFlow、ChatLab 两个参考项目的架构思路，结合深度代码审查结果制定

---

## 阶段一：紧急 Bug 修复（P0） ✅ 已完成

### 1.1 ~~修复 ChatImport 中不存在的 vue-router 依赖~~ ✅ 确认非 Bug

- **结论**: 项目已有 `src/router/index.ts`，`useRouter` 和 `router.push` 使用正确

### 1.2 修复分析器中 Date.now() 时间基准错误 ✅ 已完成

- **修改文件**: `src/utils/date.ts`、`src/analyzers/danger-signals.ts`、`src/analyzers/relationship-score.ts`
- **实现**: 新增 `getLatestTimestamp()` 工具函数，三个分析器改用消息最后一条的时间戳作为基准

### 1.3 修复 word-frequency.ts 中文分词逻辑 ✅ 已完成

- **修改文件**: `src/analyzers/word-frequency.ts`
- **实现**: 改为滑动窗口 n-gram 方式（2/3/4-gram），`i` 正确跳到 `runEnd`

### 1.4 修复 AiClient.fetchWithRetry 错误类型判断 ✅ 已完成

- **修改文件**: `src/ai/client.ts`
- **实现**: 在 fetch 返回后检查 `response.status`，4xx 直接抛出不重试，5xx 重试

---

## 阶段二：架构升级（P1） ✅ 已完成

### 2.1 引入 Vue Router ✅ 已完成

- **新增文件**: `src/router/index.ts`
- **实现**: 使用 `createWebHashHistory` 定义 7 个路由，含异步路由守卫（首次加载会话），Vite 自动代码分割
- **更新文件**: `src/App.vue`（改用 `<router-view />`）、`src/components/AppLayout/AppLayout.vue`（菜单通过 `router.push` 导航）、`src/components/ChatImport/ChatImport.vue`（导入成功后跳转 `/dashboard`）、`src/main.ts`（注册 `app.use(router)`）

### 2.2 数据缓存与计算优化 ✅ 已完成

- **新增文件**: `src/stores/analysis.ts`
- **实现**: 创建 `useAnalysisStore`，缓存 messages/stats/emotionTrend/score/dangerSignals/stage
- **更新视图**: DashboardView、TimelineView、AnalysisView、ReportExportView 均改为使用 analysisStore

### 2.3 支持 ChatLab 标准格式 ✅ 已完成

- **新增文件**: `src/parsers/chatlab-json.ts`（含 JSON 和 JSONL 两种解析器）
- **修改文件**: `src/parsers/index.ts`（自动检测 ChatLab 格式并路由到对应解析器）
- **实现**: ChatLab 消息类型数字编码映射（0-99）、参与者提取、JSONL 流式解析

### 2.4 支持 WeFlow HTTP API 数据源 ✅ 已完成

- **新增文件**: `src/parsers/weflow-api.ts`
- **修改文件**: `src/components/ChatImport/ChatImport.vue`
- **实现**: API 连接检测、会话列表获取、消息拉取，UI 中增加可折叠的 WeFlow API 导入区域

### 2.5 MiniMax Token Plan 支持完善 ✅ 已完成

- **修改文件**: `src/ai/providers.ts`, `src/ai/client.ts`
- **实现**: 更新端点为 `https://api.minimaxi.com/v1`，新增 `MiniMax-M2.1` 和 `MiniMax-Text-01` 模型，移除冗余 `extraHeaders`

---

## 阶段三：分析引擎增强（P2） 🔄 进行中

### 3.1 情绪分析升级：规则优化 ✅ 已完成（短期）

- **修改文件**: `src/utils/emotion-dict.ts`
- **实现**:
  - 移除单字"好"从正面词表，改为"好的"、"好呀"等组合
  - 新增程度副词+负面词模式（"好烦"、"太累"、"真讨厌"等）
  - 新增敷衍模式识别（"嗯"、"哦"等单字回复 → indifferent）
  - 程度副词+负面词优先级高于通用词匹配

### 3.2 AI 工具调用升级：原生 Function Calling ⏳ 待实施

- **现状**: 使用 `[TOOL_CALL: {...}]` 文本标记，依赖模型严格遵循格式
- **方案**: 对支持 Function Calling 的模型使用原生 `tools` 参数，不支持的保留文本标记 fallback

### 3.3 新增分析维度 ⏳ 待实施

| 新分析器 | 功能 |
|---------|------|
| `topic-analyzer.ts` | 话题发起者统计、话题切换检测 |
| `engagement-rhythm.ts` | 互动节奏分析（谁先说早安/晚安） |
| `annual-report.ts` | 年度总结报告生成 |
| `group-dynamics.ts` | 群聊分析（发言排行、活跃度分布） |
| `media-analysis.ts` | 媒体内容统计（图片/语音/视频/红包/转账分布） |

### 3.4 回复延迟计算修正 ✅ 已完成

- **修改文件**: `src/analyzers/statistics.ts`
- **实现**: 改为记录每个轮次的 `firstTimestamp` 和 `lastTimestamp`，用"当前轮次第一条 - 上一轮次最后一条"计算延迟

---

## 阶段四：用户体验与工程化（P3） ⏳ 待实施

### 4.1 多会话管理与切换

- 侧边栏增加会话下拉列表，支持重命名和删除

### 4.2 数据备份与恢复

- 支持将整个 Dexie 数据库导出为 JSON 文件和从 JSON 文件恢复

### 4.3 消息搜索功能

- MessageListView 增加关键词搜索框

### 4.4 时间范围筛选

- DashboardView 和 AnalysisView 增加时间范围选择器

### 4.5 常量与样式统一

- 新建 `src/constants/emotion.ts` 统一情绪标签映射
- 新建 `src/utils/echarts.ts` 统一注册 ECharts 组件
- 所有硬编码颜色改为 CSS 变量引用

### 4.6 XSS 防护

- 新建 `src/utils/html.ts`，提供 `escapeHtml` 和 `safeHighlight` 函数
- AiChatView 和 AnalysisView 中的 `v-html` 内容先做 HTML 转义

### 4.7 报告导出增强

- 修复 `sanitizeEnabled` 开关（当前 UI 有开关但导出逻辑未调用脱敏）
- 增加词云、日历热力图、情绪分布图
- 增加 HTML 格式导出和原始数据 CSV 导出

### 4.8 Store `isLoading` 统一

- 现状：各视图各自维护本地 `isLoading`，未复用 `sessionStore.isLoading`
- 方案：视图加载数据时统一设置/读取 store 中的全局 loading 状态

### 4.9 清理未使用依赖

- 移除 `jszip`、`superjson`、`date-fns-tz`、`highlight.js`、`lodash`、`lodash-es` 及对应 `@types`

---

## 阶段五：长期演进（P4） ⏳ 待实施

### 5.1 Electron 桌面端封装

- 使用 `electron-vite` 脚手架，主进程负责文件系统访问和数据库管理

### 5.2 国际化（i18n）

- 使用 `vue-i18n`，提取所有硬编码中文文案到 locale 文件

### 5.3 群聊分析支持

- 扩展分析器支持多参与者，新增群聊视图

### 5.4 流式导入与增量更新

- 大文件使用 `File.stream()` + 逐行解析，导入过程使用 Web Worker

### 5.5 SQL 查询实验室

- 使用 `sql.js` 在浏览器中运行 SQL，提供 SQL 编辑器界面

---

## 实施路线图

```
阶段一（P0）── ✅ 已完成
  ├─ 1.1 修复 vue-router 依赖 → 确认非 Bug
  ├─ 1.2 修复 Date.now() 时间基准 ✅
  ├─ 1.3 修复中文分词逻辑 ✅
  └─ 1.4 修复 fetchWithRetry 错误判断 ✅

阶段二（P1）── ✅ 已完成
  ├─ 2.1 引入 Vue Router ✅
  ├─ 2.2 数据缓存与计算优化 ✅
  ├─ 2.3 支持 ChatLab 标准格式 ✅
  ├─ 2.4 支持 WeFlow HTTP API ✅
  └─ 2.5 MiniMax Token Plan 支持完善 ✅

阶段三（P2）── 🔄 进行中
  ├─ 3.1 情绪分析升级 ✅（短期规则优化已完成）
  ├─ 3.2 AI 工具调用升级 ⏳
  ├─ 3.3 新增分析维度 ⏳
  └─ 3.4 回复延迟计算修正 ✅

阶段四（P3）── ⏳ 待实施
  ├─ 4.1 多会话管理
  ├─ 4.2 数据备份与恢复
  ├─ 4.3 消息搜索
  ├─ 4.4 时间范围筛选
  ├─ 4.5 常量与样式统一
  ├─ 4.6 XSS 防护
  ├─ 4.7 报告导出增强（修复脱敏开关）
  ├─ 4.8 Store `isLoading` 统一
  └─ 4.9 清理未使用依赖

阶段五（P4）── ⏳ 待实施
  ├─ 5.1 Electron 桌面端
  ├─ 5.2 国际化
  ├─ 5.3 群聊分析
  ├─ 5.4 流式导入与增量更新
  └─ 5.5 SQL 查询实验室
```

## 关键依赖关系

- 2.3（ChatLab 格式支持）是 2.4（WeFlow API 接入）的前置条件 ✅
- 3.2（Function Calling）依赖 2.1（Vue Router）完成后的代码稳定期 ✅
- 5.1（Electron）是 5.4（流式导入 Worker）的前置条件
