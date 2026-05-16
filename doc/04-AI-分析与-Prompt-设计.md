# ChatMind - AI 分析与 Prompt 设计

> 版本: v0.1  
> 日期: 2026-05-15

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

## 二、Prompt 设计

### 2.1 批量情绪分析 Prompt

```typescript
// src/ai/prompts/emotion-analysis.ts

export const batchEmotionPrompt = `你是一位精通中文情感分析的专家。请分析以下聊天记录中每条消息的情绪倾向。

## 分析维度
每条消息的情绪标签必须是以下之一：
- positive: 正面、开心、满意、感激、兴奋
- negative: 负面、不满、抱怨、失望、焦虑
- neutral: 中性、客观陈述、日常问候
- angry: 愤怒、生气、责骂、威胁
- sad: 悲伤、难过、委屈、失落
- affectionate: 亲昵、关心、暧昧、示爱
- indifferent: 敷衍、冷淡、应付、简短回应

## 输出格式
返回 JSON 数组，每条记录包含：
{
  "index": number,        // 消息序号
  "label": string,        // 情绪标签
  "score": number,        // 置信度 0.0-1.0
  "keywords": string[]    // 触发该情绪的关键词（1-3个）
}

## 特殊规则
1. "嗯""哦""好的""知道了"等简短回应通常标记为 indifferent
2. "哈哈""嘿嘿"通常标记为 positive
3. 反问句（"你是不是有病？"）根据语境可能是 angry 或 negative
4. 带有 emoji 的消息，emoji 含义优先于文字
5. 如果一条消息同时包含正面和负面情绪，取主导情绪

## 聊天记录
{{messages}}

请只返回 JSON 数组，不要其他解释。`;

// messages 占位符填充：
// messages = chatMessages.map((m, i) => 
//   `${i}. [${m.isSelf ? '我' : '对方'}] ${m.content}`
// ).join('\n');
```

### 2.2 关系洞察报告 Prompt

```typescript
// src/ai/prompts/relationship-report.ts

export const relationshipReportPrompt = `你是一位专业的情感关系分析师。请根据以下聊天记录的统计数据，生成一份关系分析报告。

## 分析原则
1. 客观中立：基于数据说话，不臆测
2. 温和表达：即使是负面发现，也要用建设性的方式表达
3. 具体引用：引用具体的数据支撑你的观点
4. 平衡视角：同时分析双方的互动模式

## 输入数据

### 基础统计
{{statistics}}

### 情绪趋势摘要
{{emotionSummary}}

### 关键对话样本（情绪极值点）
{{keyMessages}}

## 输出格式（JSON）
{
  "overview": {
    "relationshipStage": string,    // 关系阶段: 蜜月期/稳定期/倦怠期/危机期/修复期
    "intimacyScore": number,        // 亲密度评分 0-100
    "balanceScore": number          // 互动平衡度 0-100
  },
  "insights": [
    {
      "type": "positive" | "concern" | "neutral",
      "title": string,              // 洞察标题
      "description": string,        // 详细说明
      "evidence": string            // 数据证据
    }
  ],
  "dangerSignals": [
    {
      "signal": string,             // 信号描述
      "severity": "low" | "medium" | "high",
      "suggestion": string          // 建议
    }
  ],
  "recommendations": [
    {
      "area": string,               // 改善领域
      "action": string,             // 具体行动建议
      "priority": number            // 优先级 1-5
    }
  ]
}

注意：
- 如果没有明显的危险信号，dangerSignals 可以为空数组
- insights 控制在 3-5 条
- 用中文输出`;
```

### 2.3 AI 对话问答 Prompt

```typescript
// src/ai/prompts/chat-qa.ts

export const chatQaSystemPrompt = `你是 ChatMind 的 AI 分析师，专门帮助用户分析他们的聊天记录。你具有以下能力：

1. 你可以查询聊天记录、统计数据、情绪趋势
2. 你基于客观数据给出分析，不凭空臆测
3. 你理解人际关系中的微妙之处
4. 你的回答应该：
   - 先给出直接答案
   - 然后用数据支撑
   - 最后给出建设性建议
   - 引用具体消息时，只引用脱敏后的内容

可用工具：
- query_messages: 查询指定时间范围的聊天记录
- query_emotion_trend: 查询情绪趋势
- query_statistics: 查询统计指标
- search_keywords: 搜索关键词

当前分析的会话：{{sessionName}}
时间范围：{{timeRange}}
消息总数：{{messageCount}}

请用中文回答用户的问题。`;
```

### 2.4 关系阶段判定 Prompt

```typescript
// src/ai/prompts/relationship-stage.ts

export const relationshipStagePrompt = `根据以下聊天统计数据，判断这段关系当前所处的阶段。

## 阶段定义
1. 蜜月期：高频互动、双方情绪积极、回复迅速、消息长度较长
2. 稳定期：规律互动、情绪平稳、有来有往、 comfortable
3. 倦怠期：互动减少、回复变慢、简短回应增多、情绪平淡
4. 危机期：负面情绪激增、争吵频繁、冷暴力（长时间不回）、出现威胁性词汇
5. 修复期：曾经危机但近期有改善迹象、主动沟通增多

## 输入数据
{{statistics}}

## 输出
{
  "stage": "蜜月期" | "稳定期" | "倦怠期" | "危机期" | "修复期",
  "confidence": number,           // 置信度 0-1
  "reasoning": string,            // 判断依据（2-3句话）
  "keyIndicators": [              // 关键指标
    { "indicator": string, "value": string, "impact": "positive" | "negative" }
  ]
}`;
```

---

## 三、Function Calling 工具详细设计

### 3.1 工具清单

```typescript
// src/ai/tools/definitions.ts

export const toolDefinitions = [
  {
    name: 'query_messages',
    description: '查询指定时间范围内的聊天记录，可筛选发送者、关键词',
    parameters: {
      type: 'object',
      properties: {
        startDate: {
          type: 'string',
          description: '开始日期，ISO 8601 格式，如 2024-01-01',
        },
        endDate: {
          type: 'string',
          description: '结束日期，ISO 8601 格式，如 2024-12-31',
        },
        sender: {
          type: 'string',
          enum: ['self', 'other', 'any'],
          default: 'any',
          description: '发送者筛选',
        },
        keyword: {
          type: 'string',
          description: '关键词筛选，支持模糊匹配',
        },
        emotion: {
          type: 'string',
          enum: ['positive', 'negative', 'neutral', 'angry', 'sad', 'affectionate', 'indifferent'],
          description: '情绪标签筛选',
        },
        limit: {
          type: 'number',
          default: 20,
          maximum: 100,
          description: '返回条数',
        },
        offset: {
          type: 'number',
          default: 0,
          description: '偏移量',
        },
      },
      required: ['startDate', 'endDate'],
    },
  },
  
  {
    name: 'query_emotion_trend',
    description: '查询某段时间内的情绪趋势数据，用于绘制情绪曲线',
    parameters: {
      type: 'object',
      properties: {
        startDate: { type: 'string', description: '开始日期' },
        endDate: { type: 'string', description: '结束日期' },
        granularity: {
          type: 'string',
          enum: ['day', 'week', 'month'],
          default: 'day',
          description: '时间粒度',
        },
        sender: {
          type: 'string',
          enum: ['self', 'other', 'both'],
          default: 'both',
        },
      },
      required: ['startDate', 'endDate'],
    },
  },
  
  {
    name: 'query_statistics',
    description: '查询统计指标，如消息量、回复延迟、活跃时段等',
    parameters: {
      type: 'object',
      properties: {
        metric: {
          type: 'string',
          enum: [
            'message_count',      // 消息数量
            'reply_delay',        // 回复延迟
            'active_hours',       // 活跃时段
            'word_freq',          // 词频统计
            'initiation_ratio',   // 主动发起比例
            'length_trend',       // 消息长度趋势
          ],
          description: '要查询的指标',
        },
        startDate: { type: 'string' },
        endDate: { type: 'string' },
      },
      required: ['metric', 'startDate', 'endDate'],
    },
  },
  
  {
    name: 'search_keywords',
    description: '搜索包含特定关键词的消息，分析其上下文',
    parameters: {
      type: 'object',
      properties: {
        keywords: {
          type: 'array',
          items: { type: 'string' },
          description: '关键词列表',
        },
        contextSize: {
          type: 'number',
          default: 3,
          description: '返回每条结果前后的消息数',
        },
      },
      required: ['keywords'],
    },
  },
  
  {
    name: 'compare_periods',
    description: '对比两个时间段的关系变化',
    parameters: {
      type: 'object',
      properties: {
        period1: {
          type: 'object',
          properties: {
            start: { type: 'string' },
            end: { type: 'string' },
            label: { type: 'string' },
          },
          required: ['start', 'end'],
        },
        period2: {
          type: 'object',
          properties: {
            start: { type: 'string' },
            end: { type: 'string' },
            label: { type: 'string' },
          },
          required: ['start', 'end'],
        },
        metrics: {
          type: 'array',
          items: { type: 'string' },
          default: ['message_count', 'emotion_positive_ratio', 'reply_delay'],
        },
      },
      required: ['period1', 'period2'],
    },
  },
];
```

### 3.2 工具执行示例

```typescript
// src/ai/tools/executor.ts

class ToolExecutor {
  constructor(private db: ChatMindDB, private sessionId: string) {}
  
  async execute(toolName: string, args: any): Promise<any> {
    switch (toolName) {
      case 'query_messages':
        return this.queryMessages(args);
      case 'query_emotion_trend':
        return this.queryEmotionTrend(args);
      case 'query_statistics':
        return this.queryStatistics(args);
      // ...
    }
  }
  
  private async queryMessages(args: any) {
    const { startDate, endDate, sender, keyword, emotion, limit = 20 } = args;
    
    let query = this.db.messages
      .where('timestamp')
      .between(
        new Date(startDate).getTime(),
        new Date(endDate).getTime()
      )
      .and(m => m.sessionId === this.sessionId);
    
    if (sender && sender !== 'any') {
      query = query.and(m => m.isSelf === (sender === 'self'));
    }
    
    if (emotion) {
      query = query.and(m => m.emotion === emotion);
    }
    
    const results = await query.limit(limit).toArray();
    
    // 脱敏处理
    return results.map(m => ({
      time: new Date(m.timestamp).toISOString(),
      sender: m.isSelf ? '用户A' : '用户B',
      content: m.content.substring(0, 200),  // 截断过长消息
      emotion: m.emotion,
    }));
  }
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
用户首选: Claude 3.5 Sonnet
     ↓ 不可用 / 无 API Key
备选 1: DeepSeek-V3
     ↓ 不可用
备选 2: Ollama (本地)
     ↓ 未安装 / 模型未下载
降级: 纯规则引擎（本地词典分析）
```

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
