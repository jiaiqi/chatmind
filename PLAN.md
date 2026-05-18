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

## 阶段三：分析引擎增强（P2） ✅ 已完成

### 3.1 情绪分析升级：规则优化 ✅ 已完成

- **修改文件**: `src/utils/emotion-dict.ts`
- **实现**:
  - 移除单字"好"从正面词表，改为"好的"、"好呀"等组合
  - 新增程度副词+负面词模式（"好烦"、"太累"、"真讨厌"等）
  - 新增敷衍模式识别（"嗯"、"哦"等单字回复 → indifferent）
  - 程度副词+负面词优先级高于通用词匹配

### 3.2 AI 工具调用升级：原生 Function Calling ✅ 已完成

- **修改文件**: `src/ai/client.ts`、`src/ai/providers.ts`、`src/ai/tools/definitions.ts`、`src/ai/tools/executor.ts`、`src/stores/model-config.ts`、`src/stores/ai.ts`
- **实现**: 对支持 FC 的模型使用原生 `tools` 参数，不支持的保留文本标记 fallback

### 3.3 新增分析维度 ✅ 已完成

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

## 阶段四：用户体验与工程化（P3） ✅ 已完成

### 4.1 多会话管理与切换 ✅ 已完成

- 侧边栏增加会话下拉列表，支持重命名和删除

### 4.2 数据备份与恢复 ✅ 已完成

- 支持将整个 Dexie 数据库导出为 JSON 文件和从 JSON 文件恢复

### 4.3 消息搜索功能 ✅ 已完成

- MessageListView 增加关键词搜索框，支持防抖搜索、结果计数、XSS 安全高亮

### 4.4 时间范围筛选 ✅ 已完成

- DashboardView 和 AnalysisView 增加时间范围选择器（全部/7天/30天/90天/自定义）
- analysis store 增加 TimeRangeFilter 和 setTimeRange/applyTimeRange 方法

### 4.5 常量与样式统一 ✅ 已完成

- 新建 `src/constants/emotion.ts` 统一情绪标签映射
- 新建 `src/utils/echarts.ts` 统一注册 ECharts 组件
- 所有硬编码颜色改为 CSS 变量引用

### 4.6 XSS 防护 ✅ 已完成

- 新建 `src/utils/html.ts`，提供 `escapeHtml` 和 `safeHighlight` 函数
- AiChatView 和 AnalysisView 中的 `v-html` 内容先做 HTML 转义

### 4.7 报告导出增强 ✅ 已完成

- 修复 `sanitizeEnabled` 开关（脱敏逻辑已接入导出流程）
- 增加 HTML 格式导出（`exportToHTML`）
- 增加原始数据 CSV 导出（`exportToCSV`，支持脱敏模式）
- 新增 `sanitizeContent` 函数处理敏感信息

### 4.8 Store `isLoading` 统一 ✅ 已完成

- 移除 AnalysisView 和 ReportExportView 中的本地 `isLoading`，统一使用 `analysisStore.isLoading`

### 4.9 清理未使用依赖 ✅ 已完成

- 移除 `jszip`（未使用）
- 移除 `@types/papaparse`（papaparse 自带类型）

---

## 阶段五：代码质量与性能优化（P4） ⏳ 待实施

> 基于阶段一至四完成后的全面代码审查，消除技术债务，提升代码质量和运行时性能

### 5.1 重复代码提取与统一

- **问题**: `formatDuration` 在 5 处重复定义（`ai.ts`、`executor.ts`、`statistics.ts`、`emotion-dynamics.ts`、`danger-signals.ts`），`getTimeKey` 在 3 处重复（`emotion.ts`、`keyword-track.ts`、`engagement-rhythm.ts`），`isNegative` / `NEGATIVE_EMOTIONS` 在 2 处重复（`emotion-dynamics.ts`、`event-markers.ts`），`mapType` 在 4 个解析器中重复
- **方案**:
  - `formatDuration` → 移入 `utils/date.ts`
  - `getTimeKey` → 移入 `utils/date.ts`
  - `isNegative` / `NEGATIVE_EMOTIONS` → 统一到 `constants/emotion.ts`
  - `mapType` → 提取到 `parsers/utils.ts`
- **影响文件**: `src/utils/date.ts`、`src/constants/emotion.ts`、`src/parsers/utils.ts`（新建）及所有引用方

### 5.2 AnalysisView 大组件拆分

- **问题**: `AnalysisView.vue` 达 1254 行，包含 10+ 个图表/分析模块，维护困难
- **方案**: 拆分为独立子组件

| 子组件 | 来源模块 | 预估行数 |
|--------|---------|---------|
| `KeywordTracker.vue` | 关键词追踪 | ~120 |
| `WordCloudSection.vue` | 词云（我/对方双栏） | ~80 |
| `CalendarHeatmap.vue` | 日历热力图 | ~60 |
| `ReplyDelayChart.vue` | 回复延迟分布 | ~60 |
| `EmotionDynamicsSection.vue` | 情绪互动模式 | ~150 |
| `TopicAnalysisSection.vue` | 话题分析 | ~80 |
| `EngagementRhythmSection.vue` | 互动节奏 | ~80 |
| `MediaStatsSection.vue` | 媒体内容统计 | ~60 |
| `AnnualReportSection.vue` | 年度总结 | ~80 |
| `ComparisonSection.vue` | 双方对比 | ~120 |

- **影响文件**: `src/views/AnalysisView.vue`、`src/components/Analysis/`（新建目录）

### 5.3 TimeRangeFilter 组件抽取

- **问题**: `DashboardView`、`AnalysisView`、`ReportExportView` 三个视图都有相同的时间范围过滤 UI（NRadioGroup + NDatePicker），代码高度重复
- **方案**: 新建 `src/components/TimeRangeFilter/TimeRangeFilter.vue`，封装时间范围选择逻辑和 UI
- **接口**: `v-model:type`、`v-model:customRange`、`@change`
- **影响文件**: 3 个视图文件改为使用组件

### 5.4 路径别名配置

- **问题**: 所有 import 使用相对路径（如 `'../stores/session'`），深层嵌套时路径冗长
- **方案**:
  - `vite.config.ts` 添加 `resolve.alias: { '@': 'src' }`
  - `tsconfig.app.json` 添加 `paths: { "@/*": ["./src/*"] }`
- **影响文件**: `vite.config.ts`、`tsconfig.app.json`、所有 `.ts` / `.vue` 文件（渐进式迁移）

### 5.5 ECharts 注册方式统一

- **问题**: `DashboardView.vue` 手动 `use([...])` 注册，`AnalysisView.vue` 和 `TimelineView.vue` 使用 `registerECharts()`，方式不一致
- **方案**: 全部统一使用 `registerECharts()`，移除各视图内的手动注册代码
- **影响文件**: `DashboardView.vue`

### 5.6 暗色模式适配修复

- **问题**: `AiChatView.vue` 输入区背景色硬编码为 `#fff`，暗色模式下不自适应
- **方案**: 改为 `var(--card-bg)` CSS 变量
- **影响文件**: `AiChatView.vue`

### 5.7 Dexie 索引优化

- **问题**: `MessageListView` 中 `filterEmotion` 查询需要 `sessionId + emotion` 复合索引，当前索引不支持高效查询；`searchKeyword` 的模糊搜索需要全表扫描
- **方案**:
  - 新增数据库 version 3，添加 `[sessionId+emotion]` 复合索引
  - 大数据量场景下考虑 Dexie 的 `where('content').startsWith()` 或 Web Worker 后台搜索
- **影响文件**: `src/db/schema.ts`（version 3 迁移）

### 5.8 ReportExportView 重复计算消除

- **问题**: `ReportExportView.vue` 在组件内重新调用 `calculateStatistics`、`calculateEmotionTrend`、`calculateRelationshipScore`、`detectDangerSignals`，而这些数据在 `analysisStore` 中已缓存
- **方案**: 直接使用 `analysisStore` 中的缓存数据，仅在时间范围变化时重新过滤
- **影响文件**: `ReportExportView.vue`

### 5.9 停用词表去重与优化

- **问题**: `word-frequency.ts` 中 `STOP_WORDS` 包含重复项（如"觉得"出现 3 次，"这"出现 2 次）
- **方案**: 去重并扩充停用词表，提升词云质量
- **影响文件**: `src/analyzers/word-frequency.ts`

### 5.10 未使用类型清理

- **问题**: `types/message.ts` 中 `Message` 接口与 `DbMessage` 几乎完全相同但未被使用；`types/identity.ts` 中 `IdentityGraph` 未被使用
- **方案**: 移除 `Message` 接口和 `IdentityGraph` 接口，统一使用 `DbMessage`
- **影响文件**: `src/types/message.ts`、`src/types/identity.ts`

---

## 阶段六：工程化与测试（P5） ⏳ 待实施

> 建立代码规范、测试体系和构建优化，为长期维护奠定基础

### 6.1 ESLint + Prettier 代码规范

- **问题**: 项目缺少代码规范工具，代码风格不一致
- **方案**:
  - 安装 `eslint`、`@vue/eslint-config-typescript`、`eslint-plugin-vue`、`prettier`
  - 配置 `.eslintrc.cjs` 和 `.prettierrc`
  - 添加 `lint` 脚本到 `package.json`
- **影响文件**: 新建配置文件，`package.json`

### 6.2 Vitest 单元测试

- **问题**: 15 个分析器完全没有单元测试覆盖，逻辑正确性无法保证
- **方案**:
  - 安装 `vitest`、`@vue/test-utils`
  - 优先为分析器编写单元测试（`statistics`、`emotion`、`word-frequency`、`danger-signals`、`relationship-score`）
  - 为工具函数编写测试（`date.ts`、`html.ts`、`export.ts`、`backup.ts`）
  - 添加 `test` 脚本到 `package.json`
- **影响文件**: 新建 `src/__tests__/` 目录，`vitest.config.ts`

### 6.3 Vite 构建优化

- **问题**: 生产构建中多个 chunk 超过 500KB（`chart-theme` 674KB、`index` 667KB、`ReportExportView` 620KB），缺少 vendor 拆分
- **方案**:
  - 配置 `build.rollupOptions.output.manualChunks` 拆分 `naive-ui`、`echarts`、`jspdf` 为独立 chunk
  - 考虑 `ReportExportView` 中 `html2canvas` + `jspdf` 使用动态 `import()` 延迟加载
  - 配置 `build.chunkSizeWarningLimit` 或优化拆分策略
- **影响文件**: `vite.config.ts`

### 6.4 TypeScript strict 模式

- **问题**: 未开启 `strict: true`，仅开启了 `noUnusedLocals` 和 `noUnusedParameters`，类型安全性不足
- **方案**:
  - `tsconfig.app.json` 添加 `"strict": true`
  - 修复所有 strict 模式下的类型错误
- **影响文件**: `tsconfig.app.json`、所有 `.ts` 文件

### 6.5 API Key 安全存储

- **问题**: `model-config.ts` 中 API Key 明文存入 `localStorage`，存在安全隐患
- **方案**:
  - 使用 `crypto.subtle` 对 API Key 进行 AES-GCM 加密后存储
  - 加密密钥基于设备指纹派生（`crypto.subtle.deriveKey`）
  - 添加安全提示说明
- **影响文件**: `src/stores/model-config.ts`、新建 `src/utils/crypto.ts`

### 6.6 备份版本迁移机制

- **问题**: `backup.ts` 的 `importBackup` 只检查 `version` 字段存在，没有版本迁移逻辑，未来 schema 变更将导致旧备份无法恢复
- **方案**:
  - 定义 `BACKUP_MIGRATIONS` 映射表，每版本一个迁移函数
  - `importBackup` 中按版本号逐步执行迁移
  - 当前版本号为 2（对应 DB version 2）
- **影响文件**: `src/utils/backup.ts`

---

## 阶段七：功能增强（P6） ⏳ 待实施

> 核心功能增强，提升产品竞争力

### 7.1 微信原生导出格式支持

- **问题**: 不支持微信 PC 端/手机端直接导出的 `.txt` 格式（如 `2024年3月15日 10:23\n张三\n在吗\n----------`），这是最常见的用户需求
- **方案**:
  - 新建 `src/parsers/wechat-txt.ts`
  - 支持微信 PC 端导出格式（日期+昵称+内容+分隔线）
  - 支持微信手机端导出格式（日期+时间+昵称+内容）
  - 在 `parsers/index.ts` 中添加自动检测路由
- **影响文件**: 新建 `src/parsers/wechat-txt.ts`，修改 `src/parsers/index.ts`

### 7.2 中文分词优化

- **问题**: 当前使用 2/3/4-gram 暴力切分，会产生大量无意义组合（如"今天天"），词云质量差
- **方案**:
  - 引入轻量级中文分词库（如 `segmentit`，纯 JS 无需 WASM）
  - 或使用前缀词典 + DAG 最大概率分词算法
  - 保留 n-gram 作为 fallback
- **影响文件**: `src/analyzers/word-frequency.ts`

### 7.3 情绪动态恢复时间算法修正

- **问题**: `emotion-dynamics.ts` 使用 `messages.find()` 在整个消息流中查找任意后续正面消息作为恢复标记，而非紧随其后的
- **方案**: 限制搜索范围为负面事件结束后的 50 条消息内，超时未恢复标记为"未修复"
- **影响文件**: `src/analyzers/emotion-dynamics.ts`

### 7.4 Ollama 动态地址适配

- **问题**: `ollama.ts` 中 `OLLAMA_BASE_URL` 硬编码为 `http://localhost:11434`，用户自定义 Ollama 地址后检测不会跟随变化
- **方案**: `ollama.ts` 的检测地址从 `model-config store` 中读取，与 `providers.ts` 保持一致
- **影响文件**: `src/ai/ollama.ts`

### 7.5 generic-txt 日期解析修正

- **问题**: `generic-txt.ts` 对于只有时间没有日期的格式 C，使用"今天的日期"作为基准，导致不同天的消息被错误归到同一天
- **方案**: 根据前后消息的时间戳推断日期，如果当前消息时间比上一条早，则日期 +1
- **影响文件**: `src/parsers/generic-txt.ts`

### 7.6 composable 提取：useAnalysisData

- **问题**: 每个视图都有 `watch(sessionStore.currentSessionId, loadData)` + `onMounted(loadData)` 的重复模式
- **方案**: 新建 `src/composables/useAnalysisData.ts`，封装数据加载逻辑
- **影响文件**: 新建 `src/composables/useAnalysisData.ts`，修改所有视图

---

## 阶段八：长期演进（P7） ⏳ 待实施

> 平台级扩展和高级功能

### 8.1 Electron 桌面端封装

- 使用 `electron-vite` 脚手架，主进程负责文件系统访问和数据库管理
- 支持 Windows / macOS / Linux 三端打包
- 主进程提供原生文件对话框、系统托盘、自动更新

### 8.2 国际化（i18n）

- 使用 `vue-i18n`，提取所有硬编码中文文案到 `src/locales/` 目录
- 支持中文（zh-CN）、英文（en-US）两种语言
- 日期/数字格式随语言切换

### 8.3 群聊分析增强

- 扩展分析器支持多参与者（当前 `group-dynamics.ts` 已有基础框架）
- 新增群聊专属视图：参与者关系网络图、话题主导者分析、子群检测
- 支持群聊消息的多人身份识别

### 8.4 流式导入与增量更新

- 大文件使用 `File.stream()` + 逐行解析，导入过程使用 Web Worker
- 支持增量导入：同一会话追加新消息而非覆盖
- 导入进度条和取消功能

### 8.5 SQL 查询实验室

- 使用 `sql.js` 在浏览器中运行 SQL，提供 SQL 编辑器界面
- 预置常用查询模板（消息统计、情绪分布、回复延迟等）
- 查询结果支持导出为 CSV

### 8.6 AI 情绪分析增强

- 使用 AI 模型替代规则引擎进行情绪分析（可选）
- 支持批量异步分析，分析结果缓存到 IndexedDB
- 规则引擎结果作为 fallback，AI 结果优先级更高

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

阶段三（P2）── ✅ 已完成
  ├─ 3.1 情绪分析升级 ✅
  ├─ 3.2 AI 工具调用升级 ✅
  ├─ 3.3 新增分析维度 ✅
  └─ 3.4 回复延迟计算修正 ✅

阶段四（P3）── ✅ 已完成
  ├─ 4.1 多会话管理 ✅
  ├─ 4.2 数据备份与恢复 ✅
  ├─ 4.3 消息搜索 ✅
  ├─ 4.4 时间范围筛选 ✅
  ├─ 4.5 常量与样式统一 ✅
  ├─ 4.6 XSS 防护 ✅
  ├─ 4.7 报告导出增强 ✅
  ├─ 4.8 Store isLoading 统一 ✅
  └─ 4.9 清理未使用依赖 ✅

阶段五（P4）── ⏳ 待实施 · 代码质量与性能优化
  ├─ 5.1 重复代码提取与统一
  ├─ 5.2 AnalysisView 大组件拆分
  ├─ 5.3 TimeRangeFilter 组件抽取
  ├─ 5.4 路径别名配置
  ├─ 5.5 ECharts 注册方式统一
  ├─ 5.6 暗色模式适配修复
  ├─ 5.7 Dexie 索引优化
  ├─ 5.8 ReportExportView 重复计算消除
  ├─ 5.9 停用词表去重与优化
  └─ 5.10 未使用类型清理

阶段六（P5）── ⏳ 待实施 · 工程化与测试
  ├─ 6.1 ESLint + Prettier 代码规范
  ├─ 6.2 Vitest 单元测试
  ├─ 6.3 Vite 构建优化
  ├─ 6.4 TypeScript strict 模式
  ├─ 6.5 API Key 安全存储
  └─ 6.6 备份版本迁移机制

阶段七（P6）── ⏳ 待实施 · 功能增强
  ├─ 7.1 微信原生导出格式支持
  ├─ 7.2 中文分词优化
  ├─ 7.3 情绪动态恢复时间算法修正
  ├─ 7.4 Ollama 动态地址适配
  ├─ 7.5 generic-txt 日期解析修正
  └─ 7.6 composable 提取：useAnalysisData

阶段八（P7）── ⏳ 待实施 · 长期演进
  ├─ 8.1 Electron 桌面端封装
  ├─ 8.2 国际化（i18n）
  ├─ 8.3 群聊分析增强
  ├─ 8.4 流式导入与增量更新
  ├─ 8.5 SQL 查询实验室
  └─ 8.6 AI 情绪分析增强
```

## 关键依赖关系

- 2.3（ChatLab 格式支持）是 2.4（WeFlow API 接入）的前置条件 ✅
- 3.2（Function Calling）依赖 2.1（Vue Router）完成后的代码稳定期 ✅
- 5.2（组件拆分）是 6.2（单元测试）的前置条件，拆分后更易测试
- 5.4（路径别名）应在 5.1-5.3 之前完成，避免大规模重构后路径失效
- 6.1（ESLint）应在 6.4（strict 模式）之前完成，避免大量 lint 错误
- 6.4（strict 模式）应在 7.x（功能增强）之前完成，避免新增代码引入类型问题
- 8.1（Electron）是 8.4（流式导入 Worker）的前置条件
- 8.6（AI 情绪分析）依赖 3.2（Function Calling）的稳定实现 ✅

## 实施优先级建议

| 优先级 | 阶段 | 理由 |
|--------|------|------|
| **立即** | 阶段五（P4） | 消除技术债务，提升代码可维护性，为后续开发铺路 |
| **短期** | 阶段六（P5） | 建立测试和规范体系，保证代码质量 |
| **中期** | 阶段七（P6） | 功能增强，提升产品竞争力 |
| **长期** | 阶段八（P7） | 平台级扩展，需要更多资源和时间 |
