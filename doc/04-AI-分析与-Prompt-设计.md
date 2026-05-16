# ChatMind - AI 分析与 Prompt 设计

> 版本: v0.2  
> 日期: 2026-05-16

---

## 一、AI 架构策略

### 1.1 分层处理模型

```
┌─────────────────────────────────────────────────────────┐
│  Layer 3: AI Agent (大模型，聚合分析)                     │
│  - 关系总结、趋势洞察、生成建议                            │
│  - 输入: 聚合统计数据 + 样本消息                           │
│  - 调用频率: 用户提问时 / 生成报告时                       │
│  - 成本: 中等（每次调用 ~1-5k tokens）                    │
├─────────────────────────────────────────────────────────┤
│  Layer 2: 批量情绪分析 (大模型，批量处理)                  │
│  - 对一段时间内的消息批量标注情绪                          │
│  - 输入: 50-100 条消息聚合                               │
│  - 调用频率: 导入后一次性 / 用户触发                       │
│  - 成本: 中等（批量调用，可缓存）                          │
├─────────────────────────────────────────────────────────┤
│  Layer 1: 规则引擎 (本地，零成本)                         │
│  - 情感词典、表情映射、标点分析                            │
│  - 输入: 单条消息                                        │
│  - 调用频率: 实时 / 导入时                                │
│  - 成本: 零                                              │
└─────────────────────────────────────────────────────────┘
```

### 1.2 模型选择建议

| 场景 | 推荐模型 | 原因 |
|------|----------|------|
| 规则层补充 | 本地 qwen2.5:7b | 处理简单分类，速度快 |
| 批量情绪分析 | DeepSeek-V3 / qwen2.5:14b | 中文理解好，成本低 |
| 关系洞察报告 | Claude 3.5 Sonnet | 分析深度最强，表达细腻 |
| 实时对话问答 | DeepSeek-V3 | 响应快，工具调用稳定 |

---

## 二、Prompt 构建方式

所有 Prompt 均内联构建于 `src/stores/ai.ts` 的 `buildSystemPrompt()` 函数中，而非拆分为独立文件。原因：
- Prompt 高度依赖运行时数据（统计摘要、情绪趋势、会话信息）
- 无需复用，一个系统 Prompt 覆盖全部 AI 对话场景

### 2.1 系统 Prompt 结构

```typescript
// src/stores/ai.ts - buildSystemPrompt()

function buildSystemPrompt(stats: string, emotionTrend: string): string {
  const toolsDescription = buildToolsPrompt();  // 动态注入工具定义

  return `你是一位专业的关系分析师，正在帮助用户分析他们的聊天记录。

## 分析原则
1. 客观中立：基于数据说话，不臆测
2. 温和表达：即使是负面发现，也要用建设性的方式表达
3. 具体引用：引用具体的数据支撑你的观点
4. 平衡视角：同时分析双方的互动模式

## 当前会话信息
- 时间范围：{{timeRange}}
- 消息总数：{{messageCount}}

## 统计数据摘要
{{stats}}

## 情绪趋势摘要
{{emotionTrend}}

${toolsDescription}

## 可溯源规范
当你引用聊天记录中的具体日期时，请使用 [MSG:YYYY-MM-DD] 格式标注，
例如："3月15日你们的交流出现了明显的负面情绪 [MSG:2024-03-15]"。

请用中文回答。`;
}
```

### 2.2 工具定义注入

```typescript
// src/ai/tools/definitions.ts - buildToolsPrompt()

export function buildToolsPrompt(): string {
  return `## 可用工具

你可以使用以下工具来获取数据。当你需要查询数据时，在回复中插入工具调用标记：

[TOOL_CALL: {"name": "工具名", "parameters": {参数对象}}]

可用工具列表：

1. query_messages
   描述：查询指定时间范围内的聊天记录
   参数：{ startDate: "YYYY-MM-DD", endDate: "YYYY-MM-DD", limit?: number }

2. query_emotion_trend
   描述：查询情绪趋势数据
   参数：{ period?: "7d" | "30d" | "90d" }

3. query_statistics
   描述：查询统计指标
   参数：{ metric?: string }

4. search_keywords
   描述：搜索关键词在聊天记录中的出现情况
   参数：{ keyword: string, limit?: number }

使用规则：
- 如需查询数据，先输出工具调用标记，系统会自动执行并返回结果
- 可以一次调用多个工具
- 收到工具结果后，基于真实数据生成最终回答`;
}
```

### 2.3 AI 回答可溯源设计

**核心机制**：系统 Prompt 引导 AI 使用 `[MSG:YYYY-MM-DD]` 格式标注引用的日期。

**前端解析**（`src/views/AiChatView.vue`）：
```typescript
function formatMessageContent(content: string): string {
  return content
    .replace(/\[MSG:(\d{4}-\d{2}-\d{2})\]/g,
      '<a class="msg-trace-link" href="#" data-date="$1">📎 查看 $1 记录</a>')
    .replace(/\n/g, '<br>');
}
```

用户点击链接后，通过 `useSessionStore` 加载该日期消息并弹出 Modal 展示时间轴。

### 2.4 文本标记式 Function Calling

**为何不用标准 OpenAI tools 参数？**
国产模型提供商对 `tools` 参数的支持参差不齐。采用纯文本 `[TOOL_CALL: {...}]` 标记，可兼容所有 OpenAI 兼容接口。

**执行流程**（`src/stores/ai.ts`）：
```
用户提问
  → 第一轮 AI 调用 → AI 回复（可能含 [TOOL_CALL: {...}]）
  → 前端检测工具调用 → 显示"正在查询相关数据..."
  → ToolExecutor 执行工具（自动脱敏）
  → 第二轮 AI 调用（携带工具结果）→ 生成最终回答
```

**关键代码**（`src/ai/tools/executor.ts`）：
```typescript
export function parseToolCalls(text: string): Array<{ name: string; parameters: any }> {
  const calls: Array<{ name: string; parameters: any }> = [];
  const regex = /\[TOOL_CALL:\s*(\{[\s\S]*?\})\]/g;
  let match;
  while ((match = regex.exec(text)) !== null) {
    try { calls.push(JSON.parse(match[1])); } catch {}
  }
  return calls;
}

export function stripToolCalls(text: string): string {
  return text.replace(/\[TOOL_CALL:[\s\S]*?\]\s*/g, '');
}
```

---

## 三、Function Calling 工具实现

### 3.1 工具清单

```typescript
// src/ai/tools/definitions.ts

export interface ToolDefinition {
  name: string
  description: string
  parameters: Record<string, any>
}

export const tools: ToolDefinition[] = [
  {
    name: 'query_messages',
    description: '查询指定时间范围内的聊天记录',
    parameters: {
      startDate: { type: 'string', description: '开始日期 YYYY-MM-DD' },
      endDate: { type: 'string', description: '结束日期 YYYY-MM-DD' },
      limit: { type: 'number', description: '返回条数上限', default: 30 },
    },
  },
  {
    name: 'query_emotion_trend',
    description: '查询情绪趋势数据',
    parameters: {
      period: { type: 'string', description: '时间范围 7d/30d/90d', default: '30d' },
    },
  },
  {
    name: 'query_statistics',
    description: '查询统计指标（消息量、回复延迟、活跃时段等）',
    parameters: {
      metric: { type: 'string', description: '指标名称' },
    },
  },
  {
    name: 'search_keywords',
    description: '搜索关键词在聊天记录中的出现情况',
    parameters: {
      keyword: { type: 'string', description: '关键词' },
      limit: { type: 'number', description: '返回条数上限', default: 20 },
    },
  },
];

export function buildToolsPrompt(): string {
  // 将工具定义转为 markdown 格式注入系统 Prompt
  // 详见 2.2 节
}
```

### 3.2 工具执行器

```typescript
// src/ai/tools/executor.ts

import { sanitizeText } from '../sanitizer';
import { db } from '../../db/schema';

export class ToolExecutor {
  private sessionId: string;

  constructor(sessionId: string) {
    this.sessionId = sessionId;
  }

  async execute(name: string, params: any): Promise<any> {
    switch (name) {
      case 'query_messages':
        return this.queryMessages(params);
      case 'query_emotion_trend':
        return this.queryEmotionTrend(params);
      case 'query_statistics':
        return this.queryStatistics(params);
      case 'search_keywords':
        return this.searchKeywords(params);
      default:
        throw new Error(`未知工具: ${name}`);
    }
  }

  private async queryMessages(params: any) {
    const msgs = await db.messages
      .where('[sessionId+timestamp]')
      .between(
        [this.sessionId, new Date(params.startDate).getTime()],
        [this.sessionId, new Date(params.endDate).getTime()],
      )
      .limit(params.limit || 30)
      .toArray();

    return msgs.map(m => ({
      date: new Date(m.timestamp).toISOString().split('T')[0],
      sender: m.isSelf ? '用户A' : '用户B',
      content: sanitizeText(m.content.substring(0, 200)),
      emotion: m.emotion,
    }));
  }

  // ... 其他工具实现
}

export function parseToolCalls(text: string): Array<{ name: string; parameters: any }> {
  const calls: Array<{ name: string; parameters: any }> = [];
  const regex = /\[TOOL_CALL:\s*(\{[\s\S]*?\})\]/g;
  let match;
  while ((match = regex.exec(text)) !== null) {
    try { calls.push(JSON.parse(match[1])); } catch {}
  }
  return calls;
}

export function stripToolCalls(text: string): string {
  return text.replace(/\[TOOL_CALL:[\s\S]*?\]\s*/g, '');
}

export function formatToolResults(results: any[]): string {
  return results.map((r, i) => `[TOOL_RESULT_${i}]: ${JSON.stringify(r)}`).join('\n');
}
```

---

## 四、缓存策略

### 4.1 缓存层级

```typescript
// src/ai/cache.ts

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;  // 毫秒
}

class AnalysisCache {
  private cache = new Map<string, CacheEntry<any>>();
  
  // 情绪分析结果缓存（按消息批次）
  async getEmotionBatch(messageHash: string): Promise<EmotionResult[] | null> {
    return this.get(`emotion:${messageHash}`);
  }
  
  // 统计指标缓存（按会话 + 时间范围）
  async getStatistics(sessionId: string, range: string): Promise<Statistics | null> {
    return this.get(`stats:${sessionId}:${range}`);
  }
  
  // AI 报告缓存（按会话 + 分析参数哈希）
  async getReport(sessionId: string, paramsHash: string): Promise<Report | null> {
    return this.get(`report:${sessionId}:${paramsHash}`);
  }
  
  private get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }
    return entry.data;
  }
}

// 缓存 TTL 策略
const CACHE_TTL = {
  emotionBatch: 24 * 60 * 60 * 1000,    // 情绪分析：24小时
  statistics: 60 * 60 * 1000,            // 统计指标：1小时
  aiReport: 7 * 24 * 60 * 60 * 1000,    // AI 报告：7天
};
```

---

## 五、错误处理与降级

### 5.1 AI 调用失败处理

```typescript
async function analyzeWithFallback(
  messages: Message[],
  aiClient: AiClient
): Promise<EmotionResult[]> {
  try {
    // 尝试 AI 分析
    return await aiBatchEmotion(messages, aiClient);
  } catch (error) {
    console.warn('AI analysis failed, falling back to rule-based:', error);
    
    // 降级到规则引擎
    return messages.map(msg => {
      const ruleResult = ruleBasedEmotion(msg.content);
      return ruleResult || {
        label: 'neutral',
        score: 0.5,
        method: 'fallback',
      };
    });
  }
}
```

### 5.2 模型不可用降级链

```
用户首选: 配置的云端模型（DeepSeek / Kimi / 通义千问等）
     ↓ 不可用 / 无 API Key / 网络错误
备选: Ollama 本地模型（自动检测 localhost:11434）
     ↓ 未安装 / 模型未下载
降级: 纯规则引擎（本地词典分析，零成本）
```

实际实现：用户可配置多个模型，在 `ModelConfigDialog` 中一键切换。

---

## 六、脱敏规范

### 6.1 脱敏规则

```typescript
// src/ai/sanitizer.ts

const SANITIZE_RULES = [
  // 手机号
  { pattern: /\b1[3-9]\d{9}\b/g, replacement: '[手机号]' },
  
  // 微信号
  { pattern: /wxid_[a-zA-Z0-9_-]+/gi, replacement: '[微信ID]' },
  
  // 身份证号
  { pattern: /\b\d{17}[\dXx]\b/g, replacement: '[身份证]' },
  
  // 银行卡号
  { pattern: /\b\d{16,19}\b/g, replacement: '[银行卡]' },
  
  // 邮箱
  { pattern: /[\w.-]+@[\w.-]+\.\w+/g, replacement: '[邮箱]' },
  
  // 具体地址（简单规则）
  { pattern: /.{2,4}省.{2,4}市.{2,4}[区县].{3,20}[路街道]/g, replacement: '[地址]' },
];

function sanitizeText(text: string): string {
  return SANITIZE_RULES.reduce(
    (result, rule) => result.replace(rule.pattern, rule.replacement),
    text
  );
}

function sanitizeMessages(messages: Message[]): SanitizedMessage[] {
  return messages.map(m => ({
    ...m,
    senderLabel: m.isSelf ? '用户A' : '用户B',
    content: sanitizeText(m.content),
  }));
}
```

### 6.2 脱敏开关

```typescript
interface AiPrivacySettings {
  // 完全本地（不调用任何云端 AI）
  mode: 'local-only' | 'sanitized-cloud' | 'full-cloud';
  
  // 脱敏开关
  sanitizeNames: boolean;      // 替换昵称为 用户A/用户B
  sanitizeNumbers: boolean;    // 替换数字类敏感信息
  sanitizeLocations: boolean;  // 替换地址信息
}
```
