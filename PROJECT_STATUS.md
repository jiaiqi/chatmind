# ChatMind - 项目状态报告

> 生成日期: 2026-05-16
> 当前版本: v0.1.0 MVP
> 构建状态: 通过

---

## 一、项目概述

**ChatMind** 是一款本地优先的 AI 微信聊天记录分析工具，帮助用户通过聊天记录分析双方的情绪、情感状态和关系质量。

### 核心定位
- **本地优先**: 所有聊天记录存储在浏览器 IndexedDB，不上传云端
- **身份识别**: 彻底解决"分不清哪个是我哪个是对方"的痛点
- **关系导向**: 不做通用聊天分析，专注分析人与人之间的关系状态
- **多模型支持**: 支持 8 家国产 AI 模型提供商，用户可自由切换

---

## 二、已完成功能

### 2.1 数据导入

| 功能 | 状态 | 说明 |
|------|------|------|
| 拖拽上传 | 完成 | 支持 JSON / CSV / TXT 文件 |
| WeFlow 格式 | 完成 | 原生支持 WeFlow 导出的 JSON/CSV |
| 通用 TXT | 完成 | 自动识别 3 种常见格式 |
| 示例数据 | 完成 | 内置模拟恋爱故事，零成本体验 |
| 解析进度 | 完成 | 实时显示解析百分比 |
| 错误提示 | 完成 | 格式不支持时给出明确提示 |

### 2.2 身份识别系统（核心卖点）

| 功能 | 状态 | 说明 |
|------|------|------|
| 强制确认弹窗 | 完成 | 导入后必须选择"我是谁" |
| 消息数量辅助 | 完成 | 显示每个身份的消息条数辅助判断 |
| 曾用名支持 | 完成 | 添加历史昵称，解决改名识别问题 |
| 系统消息推断 | 完成 | 从"你已添加XXX"自动推断 |
| 文件传输助手 | 完成 | 自动识别并排除 |

### 2.3 数据存储

| 功能 | 状态 | 说明 |
|------|------|------|
| IndexedDB | 完成 | Dexie.js 封装，支持百万级数据 |
| 会话管理 | 完成 | 多会话切换、删除 |
| 消息查询 | 完成 | 按时间范围、分页查询 |
| 统计查询 | 完成 | 消息计数、参与者信息 |

### 2.4 情绪分析

| 功能 | 状态 | 说明 |
|------|------|------|
| 情感词典 | 完成 | 7 种情绪标签：正面/负面/中性/愤怒/悲伤/亲昵/敷衍 |
| 表情映射 | 完成 | Emoji → 情绪自动映射 |
| 标点分析 | 完成 | 通过标点特征辅助判断 |
| 批量分析 | 完成 | 导入时自动为所有消息标注情绪 |
| 情绪趋势 | 完成 | 按天聚合，计算双方情绪变化 |

### 2.5 统计与分析

| 功能 | 状态 | 说明 |
|------|------|------|
| 消息量统计 | 完成 | 总数、我方、对方、比例 |
| 回复延迟 | 完成 | 平均回复时间、延迟分布 |
| 双方延迟对比 | 完成 | 分别计算我方/对方的平均回复时间 |
| 活跃时段 | 完成 | 24 小时分布柱状图 |
| 消息长度 | 完成 | 平均字数、最大字数趋势 |
| 词频分析 | 完成 | 中文分词，去停用词，Top 60 高频词 |
| 日历热力图 | 完成 | GitHub 风格贡献图 |
| 关系健康度 | 完成 | 0-100 分，五维评分（平衡/正向/及时/稳定/深度） |
| 危险信号检测 | 完成 | 倾诉不对等、沉默期、负面激增、敷衍增多、回复下降 |
| 关系阶段判定 | 完成 | 蜜月期/稳定期/倦怠期/危机期/修复期，规则引擎版 |

### 2.6 可视化图表

| 图表 | 状态 | 所在页面 |
|------|------|----------|
| 情绪趋势曲线 | 完成 | 仪表盘 |
| 活跃时段柱状图 | 完成 | 仪表盘 |
| 消息比例饼图 | 完成 | 仪表盘 |
| 情绪时间轴 | 完成 | 情绪时间轴 |
| 词云图 x2 | 完成 | 深度分析 |
| 聊天日历热力图 | 完成 | 深度分析 |
| 回复延迟分布图 | 完成 | 深度分析 |
| 消息长度趋势图 | 完成 | 深度分析 |
| 情绪分布对比图 | 完成 | 深度分析 |
| 关键词追踪 | 完成 | 深度分析（趋势图 + 上下文匹配） |

### 2.7 AI 分析师

| 功能 | 状态 | 说明 |
|------|------|------|
| 流式输出 | 完成 | 实时打字机效果 |
| 快捷问题 | 完成 | 5 个预设问题一键发送 |
| 数据驱动 Prompt | 完成 | 自动注入统计摘要和情绪趋势 |
| Function Calling | 完成 | 4 个工具动态查询，自动脱敏 |
| AI 回答可溯源 | 完成 | [MSG:日期] 标记点击跳转到当天记录 |
| 多模型配置 | 完成 | 支持添加/删除/切换多个模型 |
| 预设提供商 | 完成 | 8 家国产模型（详见 2.8） |
| 自定义端点 | 完成 | 支持任意 OpenAI 兼容 API |
| API Key 管理 | 完成 | 本地存储，多 Key 独立管理 |

### 2.8 支持的 AI 模型

| 提供商 | 代表模型 |
|--------|----------|
| DeepSeek | V3, R1 |
| Kimi (月之暗面) | 8K / 32K / 128K |
| MiniMax | abab6.5 / abab7 |
| 百炼 (阿里云) | 通义千问 Plus/Max/Turbo/Coder |
| SiliconFlow | DeepSeek V3/R1, Qwen2.5 |
| 智谱 AI (GLM) | GLM-4 / Flash / Air / Plus |
| 百度千帆 | 文心 4.0 Turbo / 3.5 / Speed |
| 腾讯云 (混元) | Turbo / Pro / Standard |
| 自定义 | 任意 OpenAI 兼容端点 |

### 2.9 界面与交互

| 功能 | 状态 | 说明 |
|------|------|------|
| 侧边栏导航 | 完成 | 可折叠，5 个主页面 + 导入 |
| 暗色模式 | 完成 | Light/Dark/Auto 三档切换 |
| 消息列表 | 完成 | 分页 50 条，支持筛选 |
| 时间轴下钻 | 完成 | 点击情绪曲线查看当天记录 |
| 情绪修正 | 完成 | 用户可手动修正单条消息情绪标签 |
| 模型配置面板 | 完成 | 弹窗式添加/删除/切换模型 |
| 会话管理 | 完成 | 切换、删除会话 |

### 2.10 暗色模式

| 功能 | 状态 | 说明 |
|------|------|------|
| Naive UI 暗色主题 | 完成 | 组件级暗色切换 |
| CSS 变量系统 | 完成 | --app-bg, --text-color 等 |
| 系统主题检测 | 完成 | 监听 prefers-color-scheme |
| 手动切换 | 完成 | 侧边栏月亮/太阳按钮 |
| 持久化 | 完成 | localStorage 保存偏好 |

---

## 三、技术栈

| 层级 | 技术 | 版本 |
|------|------|------|
| 前端框架 | Vue 3 + TypeScript | ^3.5.34 |
| 构建工具 | Vite | ^8.0.12 |
| UI 组件库 | Naive UI | ^2.44.1 |
| 状态管理 | Pinia | ^3.0.4 |
| 可视化 | ECharts + vue-echarts | ^6.0.0 / ^8.0.1 |
| 词云 | echarts-wordcloud | latest |
| 数据库 | IndexedDB + Dexie.js | ^4.4.2 |
| CSV 解析 | PapaParse | ^5.5.3 |
| 图标 | @vicons/ionicons5 | ^0.13.0 |

---

## 四、项目结构

```
src/
├── ai/                          # AI 相关
│   ├── client.ts               # AI 客户端（流式调用）
│   └── providers.ts            # 8 家模型预设配置
│
├── analyzers/                   # 分析引擎
│   ├── emotion.ts              # 情绪分析
│   ├── statistics.ts           # 基础统计
│   └── word-frequency.ts       # 词频/延迟/长度/日历分析
│
├── components/                  # 组件
│   ├── AppLayout/              # 侧边栏布局
│   │   └── AppLayout.vue
│   ├── ChatImport/             # 导入组件
│   │   └── ChatImport.vue
│   ├── IdentitySelector/       # 身份选择弹窗
│   │   └── IdentitySelector.vue
│   └── ModelConfig/            # 模型配置弹窗
│       └── ModelConfigDialog.vue
│
├── db/                          # 数据库
│   └── schema.ts               # IndexedDB 表结构
│
├── parsers/                     # 导入解析器
│   ├── index.ts                # 解析器注册
│   ├── weflow-json.ts          # WeFlow JSON
│   ├── weflow-csv.ts           # WeFlow CSV
│   └── generic-txt.ts          # 通用 TXT
│
├── stores/                      # Pinia Stores
│   ├── ai.ts                   # AI 对话状态
│   ├── identity.ts             # 身份识别状态
│   ├── import.ts               # 导入状态
│   ├── model-config.ts         # 多模型配置
│   ├── session.ts              # 会话/消息数据
│   └── theme.ts                # 主题状态
│
├── types/                       # TypeScript 类型
│   ├── analysis.ts
│   ├── identity.ts
│   └── message.ts
│
├── utils/                       # 工具函数
│   ├── date.ts                 # 日期格式化
│   ├── demo-data.ts            # 示例数据生成
│   └── emotion-dict.ts         # 情感词典
│
├── views/                       # 页面视图
│   ├── AiChatView.vue          # AI 分析师
│   ├── AnalysisView.vue        # 深度分析（5图表）
│   ├── DashboardView.vue       # 分析仪表盘（3图表）
│   ├── ImportView.vue          # 导入页
│   ├── MessageListView.vue     # 聊天记录列表
│   └── TimelineView.vue        # 情绪时间轴
│
├── App.vue                      # 根组件
└── main.ts                      # 入口
```

---

## 五、Git 提交历史

```
d62b6db  feat: advanced visualizations - wordcloud, calendar, delay, length, emotion
2f40841  feat: multi-model support - DeepSeek, Kimi, MiniMax, Bailian, etc.
5749498  feat: AI chat analyst with DeepSeek integration
a87102f  feat: demo data, sidebar nav, message list, timeline drill-down
dbe325a  fix: resolve TypeScript build errors
7f64614  feat: core data pipeline - types, DB, parsers, identity, analysis
aec10f8  init: Vite + Vue 3 + TypeScript project scaffold
```

---

## 六、已知问题与限制

| 问题 | 严重程度 | 说明 |
|------|----------|------|
| 无真实微信解密 | 低 | 依赖 WeFlow 导出，不直接读取微信数据库 |
| Ollama 本地 AI | 完成 | 自动检测本地 Ollama，无需 API Key |
| 群聊支持有限 | 低 | 当前主要针对一对一对话优化 |
| 单文件体积大 | 低 | 生产包 1.5MB，需代码分割优化 |
| 报告导出 | 完成 | 支持 PDF / 图片导出，含配置面板 |
| 单文件体积大 | 低 | 生产包 1.5MB，需代码分割优化 |
| 数据库无迁移机制 | 中 | 当前 schema 为 v1，未来升级需补迁移 |
| AI 无超时/重试 | **已修复** | 新增 AbortController（30秒超时）+ 自动重试（1次） |
| 无单元测试 | 中 | 缺少 parsers / analyzers 的自动化测试 |

---

## 七、后续建议（按优先级排序）

### Phase 1: 体验优化（推荐先做）

1. **ECharts 暗色主题适配**
   - 暗色模式下图表背景、文字颜色需同步切换
   - 可参考 ECharts 的 dark theme 配置

2. **报告导出**
   - PDF 导出：使用 html2canvas + jsPDF
   - 图片导出：关键图表一键保存
   - 支持选择时间范围导出

3. **更多示例数据**
   - 职场关系（同事/上下级）
   - 亲情关系（父母/子女）
   - 友情关系（闺蜜/兄弟）

### Phase 2: 功能增强

4. **本地 AI 支持（Ollama）**
   - 检测本地 Ollama 服务
   - 模型列表自动获取
   - 完全离线运行

5. **群聊分析**
   - 多人身份识别
   - 群体情绪趋势
   - "潜水王" / "话痨" 排行

6. **高级分析维度**
   - 话题聚类（用 TF-IDF / LDA）
   - 关系阶段自动判定（蜜月期→倦怠期→危机期）
   - 危险信号检测（冷暴力、情绪骤降等）

### Phase 3: 工程化

7. **Electron 桌面端**
   - 封装为桌面应用
   - 替换 IndexedDB 为 SQLite
   - 对接 WeFlow HTTP API 直连

8. **性能优化**
   - ECharts 懒加载/代码分割
   - 大数据量虚拟滚动
   - Web Worker 解析大文件

9. **测试覆盖**
   - 解析器单元测试
   - 分析器准确性测试
   - 端到端流程测试

### Phase 4: 商业化准备

10. **数据安全**
    - 导出加密（密码保护）
    - 自动清理过期数据
    - 隐私模式（完全禁止网络请求）

11. **用户体验**
    - 新手引导（Onboarding）
    - 操作提示/空状态优化
    - 响应式移动端适配

---

## 八、快速启动

```bash
# 进入项目目录
cd E:/demo/lsq/chatmind

# 安装依赖
npm install

# 开发预览
npm run dev

# 生产构建
npm run build

# 构建产物在 dist/ 目录
```

访问 `http://localhost:5173`，点击 **"使用示例数据体验"** 即可零配置试用全部功能。

---

## 九、关键文件速查

| 需求 | 对应文件 |
|------|----------|
| 添加新模型提供商 | `src/ai/providers.ts` |
| 修改情绪词典 | `src/utils/emotion-dict.ts` |
| 添加新图表 | `src/views/AnalysisView.vue` |
| 修改导入解析 | `src/parsers/` |
| 修改 AI Prompt | `src/stores/ai.ts` (buildSystemPrompt) |
| 修改暗色变量 | `src/App.vue` (:root / [data-theme="dark"]) |
| 修改示例数据 | `src/utils/demo-data.ts` |
