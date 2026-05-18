# ChatMind

> 用 AI 读懂你们的关系

ChatMind 是一款本地优先的 AI 微信聊天记录分析工具。它通过智能身份识别、情绪趋势分析和关系健康度评估，帮助你客观理解一段关系的真实状态。

---

## 核心特性

- **本地优先，隐私至上**：所有聊天记录存储在浏览器 IndexedDB，不上传云端，数据完全由你掌控
- **智能身份识别**：导入后强制确认"我是谁"，支持曾用名时间线；消息列表中可随时校准单条或批量修正身份
- **规则引擎情绪分析**：7 种情绪标签（正面/负面/中性/愤怒/悲伤/亲昵/敷衍），支持 Emoji 映射和标点特征分析
- **情绪修正**：用户可手动修正单条消息的情绪标签，修正后自动刷新趋势图表
- **关系健康度评分**：0-100 分综合评估，从互动平衡、情绪正向、回复及时、互动稳定、聊天深度五个维度量化关系质量
- **危险信号检测**：自动识别倾诉不对等、连续沉默期、负面表达激增、敷衍回应增多、回复速度下降等 5 类预警信号
- **关系阶段判定**：基于统计数据自动判定关系所处阶段（蜜月期/稳定期/倦怠期/危机期/修复期）
- **多模型 AI 分析师**：支持 DeepSeek、Kimi、通义千问、智谱、MiniMax（含 Token Plan 主力模型 MiniMax-M2.1）、百度、腾讯等 8 家国产模型 + Ollama 本地模型，流式输出实时洞察
- **AI Function Calling**：AI 可动态调用工具查询聊天记录、情绪趋势、统计指标，结论基于真实数据而非静态摘要
- **AI 回答可溯源**：AI 引用具体日期时渲染为可点击链接，一键跳转到原始聊天记录
- **关键词追踪**：追踪任意关键词在聊天记录中的出现趋势，含上下文匹配和高亮显示
- **情绪互动模式**：分析情绪感染度、情绪修复时间、情绪对抗/安抚模式
- **聊天时段迁移**：对比前后期的活跃时段分布，检测"从深夜畅聊到白天敷衍"的关系冷却信号
- **并排对比视图**：并排对比双方的高频词、平均字数、回复延迟、正面情绪占比等核心指标
- **事件标记**：时间轴自动检测情绪低谷、沉默结束、聊天高峰、争吵事件，支持用户手动添加里程碑
- **报告导出**：支持将分析报告导出为 PDF / 图片 / HTML / CSV，含时间范围选择和隐私脱敏开关
- **丰富的可视化**：情绪趋势曲线、活跃时段分布、词云、聊天日历热力图、回复延迟分布、消息长度趋势、情绪分布对比等 10+ 图表
- **暗色模式**：完整的暗色主题适配，包括所有 ECharts 图表
- **多会话管理**：支持创建、切换、重命名、删除多个分析会话
- **数据备份与恢复**：一键导出/导入整个数据库为 JSON 文件
- **消息搜索**：关键词搜索聊天记录，XSS 安全高亮显示
- **时间范围筛选**：仪表盘和深度分析页面支持按时间范围（7天/30天/90天/自定义）筛选数据
- **XSS 防护**：所有动态内容渲染均经过 HTML 转义处理

---

## 快速开始

```bash
# 克隆项目
git clone <repo-url>
cd chatmind

# 安装依赖
pnpm install

# 开发预览
pnpm dev

# 构建
pnpm build
```

打开浏览器访问 `http://localhost:5173`，点击**"使用示例数据体验"**即可零配置试用全部功能。

---

## 使用流程

```
1. 导入聊天记录 → 2. 确认身份 → 3. 查看分析
```

**支持的导入格式**：
- WeFlow 导出的 JSON / CSV（推荐，信息最完整）
- ChatLab 标准格式（JSON / JSONL）
- WeFlow HTTP API 在线获取
- 微信自带备份的 TXT（自动识别 3 种常见格式）
- 内置示例数据（模拟恋爱故事，无需真实数据即可体验）

---

## 技术栈

| 层级 | 技术 |
|------|------|
| 前端框架 | Vue 3 + TypeScript 6 |
| 构建工具 | Vite 8 |
| 路由 | Vue Router 4（hash 模式） |
| UI 组件库 | Naive UI |
| 状态管理 | Pinia 3 |
| 可视化 | ECharts 6 + vue-echarts |
| 词云 | echarts-wordcloud |
| 数据库 | IndexedDB + Dexie.js |
| CSV 解析 | PapaParse |
| 报告导出 | html2canvas + jsPDF |

---

## 项目结构

```
src/
├── ai/                    # AI 客户端、脱敏工具、Function Calling
│   ├── client.ts          # AI HTTP 客户端（SSE 流式、重试机制）
│   ├── ollama.ts          # Ollama 本地模型检测
│   ├── providers.ts       # 10 个 Provider 预设配置
│   ├── sanitizer.ts       # 隐私脱敏工具
│   └── tools/             # AI 工具调用
│       ├── definitions.ts # 4 个工具定义
│       └── executor.ts    # 工具执行器（FC + 文本标记双模式）
├── analyzers/             # 分析引擎（15 个分析器）
│   ├── statistics.ts      # 基础统计
│   ├── emotion.ts         # 情绪趋势
│   ├── emotion-dynamics.ts# 情绪互动模式
│   ├── danger-signals.ts  # 危险信号检测
│   ├── relationship-score.ts  # 关系健康度评分
│   ├── relationship-stage.ts  # 关系阶段判定
│   ├── topic-analyzer.ts  # 话题切分
│   ├── engagement-rhythm.ts   # 互动节奏
│   ├── media-analysis.ts  # 媒体内容统计
│   ├── group-dynamics.ts  # 群聊动态
│   ├── keyword-track.ts   # 关键词追踪
│   ├── word-frequency.ts  # 词频统计
│   ├── time-shift.ts      # 聊天时段迁移
│   ├── event-markers.ts   # 事件自动检测
│   └── annual-report.ts   # 年度报告生成
├── components/            # 组件
│   ├── AppLayout/         # 侧边栏布局
│   ├── ChatImport/        # 导入组件
│   ├── IdentitySelector/  # 身份选择弹窗
│   └── ModelConfig/       # 模型配置弹窗
├── constants/             # 常量定义
│   └── emotion.ts         # 情绪标签/颜色/Emoji 统一映射
├── db/                    # 数据库
│   └── schema.ts          # IndexedDB 表结构（v2）
├── parsers/               # 导入解析器
│   ├── index.ts           # 解析器路由
│   ├── chatlab-json.ts    # ChatLab JSON/JSONL
│   ├── weflow-api.ts      # WeFlow HTTP API
│   ├── weflow-json.ts     # WeFlow JSON
│   ├── weflow-csv.ts      # WeFlow CSV
│   └── generic-txt.ts     # 通用 TXT
├── router/                # 路由
│   └── index.ts           # Vue Router 配置
├── stores/                # Pinia Stores（7 个）
│   ├── ai.ts              # AI 对话状态
│   ├── analysis.ts        # 分析结果缓存 + 时间范围过滤
│   ├── identity.ts        # 身份识别状态
│   ├── import.ts          # 导入状态
│   ├── model-config.ts    # 多模型配置
│   ├── session.ts         # 会话/消息数据
│   └── theme.ts           # 主题状态
├── types/                 # TypeScript 类型
│   ├── analysis.ts
│   ├── identity.ts
│   └── message.ts
├── utils/                 # 工具函数
│   ├── date.ts            # 日期格式化
│   ├── html.ts            # XSS 防护（escapeHtml/safeHighlight）
│   ├── chart-theme.ts     # ECharts 主题配置
│   ├── echarts.ts         # ECharts 组件注册
│   ├── emotion-dict.ts    # 情感词典
│   ├── backup.ts          # 数据备份导出/导入
│   ├── export.ts          # 报告导出（图片/PDF/HTML/CSV）
│   └── demo-data.ts       # 示例数据生成
├── views/                 # 页面视图
│   ├── ImportView.vue     # 导入页
│   ├── DashboardView.vue  # 分析仪表盘
│   ├── TimelineView.vue   # 情绪时间轴
│   ├── AnalysisView.vue   # 深度分析
│   ├── MessageListView.vue# 聊天记录列表
│   ├── AiChatView.vue     # AI 分析师
│   └── ReportExportView.vue # 报告导出
├── App.vue
└── main.ts
```

---

## 开发计划

详见 [PLAN.md](./PLAN.md)，当前进度：

- ✅ 阶段一：紧急 Bug 修复（P0）
- ✅ 阶段二：架构升级（P1）
- ✅ 阶段三：分析引擎增强（P2）
- ✅ 阶段四：用户体验与工程化（P3）
- ⏳ 阶段五：代码质量与性能优化（P4）
- ⏳ 阶段六：工程化与测试（P5）
- ⏳ 阶段七：功能增强（P6）
- ⏳ 阶段八：长期演进（P7）

---

## 隐私声明

ChatMind 坚持本地优先原则：
- 所有聊天记录保存在你的浏览器中，不上传任何服务器
- 调用云端 AI 时，仅发送统计数据和脱敏后的样本（可关闭）
- 支持 Ollama 本地模型，实现完全离线分析
- 报告导出支持隐私脱敏模式，自动替换敏感信息

---

## License

MIT
