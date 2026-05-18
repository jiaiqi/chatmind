# ChatMind 项目记忆

## 项目概述

ChatMind 是一款本地优先的 AI 微信聊天记录分析工具，通过智能身份识别、情绪趋势分析和关系健康度评估帮助用户理解关系状态。

## 技术栈

- Vue 3.5 + Composition API + `<script setup>` + TypeScript 6
- Vite 8 + pnpm
- Naive UI 2.44
- Pinia 3（7 个 Store）
- Vue Router 4（hash 模式）
- ECharts 6 + vue-echarts + echarts-wordcloud
- Dexie 4（IndexedDB，4 张表：messages/participants/sessions/events）
- html2canvas + jsPDF（报告导出）
- PapaParse（CSV 解析）

## 代码规范

- 使用 Composition API + `<script setup>`，禁止 Options API
- 中文注释，技术术语保留英文
- 不添加注释除非明确要求
- 所有动态内容渲染必须经过 `escapeHtml` 或 `safeHighlight` 处理（XSS 防护）
- 情绪相关常量统一使用 `src/constants/emotion.ts`
- ECharts 注册统一使用 `src/utils/echarts.ts` 的 `registerECharts()`
- 日期格式化统一使用 `src/utils/date.ts`
- HTML 转义统一使用 `src/utils/html.ts`

## 项目结构

```
src/
├── ai/                    # AI 客户端、Provider 配置、工具调用、数据脱敏
│   ├── client.ts          # AI HTTP 客户端（SSE 流式、重试机制、FC 支持）
│   ├── ollama.ts          # Ollama 本地模型检测
│   ├── providers.ts       # 10 个 Provider 预设（DeepSeek/Kimi/MiniMax/百炼/SiliconFlow/智谱/百度/腾讯/Ollama/自定义）
│   ├── sanitizer.ts       # 隐私脱敏（手机号/微信ID/身份证/银行卡/邮箱/地址）
│   └── tools/             # Function Calling
│       ├── definitions.ts # 4 个工具定义（query_messages/query_emotion_trend/query_statistics/search_keywords）
│       └── executor.ts    # 工具执行器（FC + 文本标记双模式）
├── analyzers/             # 15 个分析器
├── components/            # AppLayout/ChatImport/IdentitySelector/ModelConfig
├── constants/             # emotion.ts（情绪标签/颜色/Emoji 统一映射）
├── db/                    # schema.ts（Dexie v2，4 张表）
├── parsers/               # 6 个解析器（WeFlow JSON/CSV/API、ChatLab JSON/JSONL、通用 TXT）
├── router/                # index.ts（7 个路由，hash 模式）
├── stores/                # 7 个 Pinia Store
│   ├── ai.ts              # AI 对话（sendMessageWithFC / sendMessageWithTextMarker 双模式）
│   ├── analysis.ts        # 分析缓存 + TimeRangeFilter 时间范围过滤
│   ├── identity.ts        # 身份映射
│   ├── import.ts          # 导入状态机
│   ├── model-config.ts    # 多模型配置（localStorage 持久化）
│   ├── session.ts         # 会话/消息 CRUD
│   └── theme.ts           # Light/Dark/Auto 主题
├── types/                 # analysis.ts / identity.ts / message.ts
├── utils/                 # date/html/chart-theme/echarts/emotion-dict/backup/export/demo-data
└── views/                 # 7 个视图页面
```

## 关键架构决策

1. **AI 双模式调用**：支持 FC 的模型使用原生 `tools` 参数，不支持的用 `[TOOL_CALL: {...}]` 文本标记 fallback
2. **分析缓存**：`analysisStore` 缓存全量消息 `allMessages`，时间范围过滤只做内存计算
3. **XSS 防护**：所有 `v-html` 必须先 `escapeHtml`，搜索高亮用 `safeHighlight`
4. **数据库版本**：当前 Dexie v2，新增索引需升级 version 并写迁移
5. **路由模式**：使用 `createWebHashHistory` 兼容 Electron

## 常用命令

```bash
pnpm install          # 安装依赖
pnpm dev              # 开发服务器
pnpm build            # 生产构建
npx vue-tsc --noEmit  # 类型检查
```

## 当前开发进度

- ✅ 阶段一~四已完成（Bug 修复、架构升级、分析引擎增强、用户体验）
- ⏳ 阶段五：代码质量与性能优化（重复代码提取、组件拆分、路径别名等）
- ⏳ 阶段六：工程化与测试（ESLint、Vitest、构建优化、strict 模式）
- ⏳ 阶段七：功能增强（微信原生格式、中文分词、算法修正）
- ⏳ 阶段八：长期演进（Electron、i18n、群聊、流式导入）

详细计划见 PLAN.md

## 已知技术债务

- `formatDuration` 在 5 处重复定义，应统一到 `utils/date.ts`
- `getTimeKey` 在 3 处重复定义，应统一到 `utils/date.ts`
- `isNegative` / `NEGATIVE_EMOTIONS` 在 2 处重复，应统一到 `constants/emotion.ts`
- `mapType` 在 4 个解析器中重复，应提取到 `parsers/utils.ts`
- `AnalysisView.vue` 达 1254 行，需拆分为子组件
- `DashboardView.vue` 的 ECharts 注册方式与其他视图不一致
- `AiChatView.vue` 输入区背景色硬编码 `#fff`，暗色模式不适配
- `ReportExportView.vue` 重复计算分析数据，应使用 `analysisStore` 缓存
- API Key 明文存 localStorage，存在安全隐患
- 3 个视图的时间范围过滤 UI 重复，应抽取为组件

## 关键文件速查

| 需求 | 文件 |
|------|------|
| 添加新 AI Provider | `src/ai/providers.ts` |
| 修改 AI Prompt | `src/stores/ai.ts` (buildSystemPrompt) |
| 修改情绪词典 | `src/utils/emotion-dict.ts` |
| 修改情绪常量 | `src/constants/emotion.ts` |
| 添加新分析器 | `src/analyzers/` + `src/stores/analysis.ts` + `src/types/analysis.ts` |
| 添加新导入格式 | `src/parsers/` + `src/parsers/index.ts` |
| 修改数据库 Schema | `src/db/schema.ts`（需升级 version） |
| 修改暗色变量 | `src/App.vue` (:root / [data-theme="dark"]) |
| 修改 ECharts 主题 | `src/utils/chart-theme.ts` |
| 修改导出逻辑 | `src/utils/export.ts` |
| 修改备份逻辑 | `src/utils/backup.ts` |
| 修改 XSS 防护 | `src/utils/html.ts` |
