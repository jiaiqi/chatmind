export interface ToolDefinition {
  name: string
  description: string
  parameters: Record<string, any>
}

export const toolDefinitions: ToolDefinition[] = [
  {
    name: 'query_messages',
    description: '查询指定时间范围内的聊天记录，可筛选发送者、关键词',
    parameters: {
      startDate: { type: 'string', description: '开始日期，ISO 8601 格式，如 2024-01-01' },
      endDate: { type: 'string', description: '结束日期，ISO 8601 格式，如 2024-12-31' },
      sender: { type: 'string', enum: ['self', 'other', 'any'], default: 'any', description: '发送者筛选' },
      keyword: { type: 'string', description: '关键词筛选，支持模糊匹配' },
      limit: { type: 'number', default: 20, maximum: 100, description: '返回条数' },
    },
  },
  {
    name: 'query_emotion_trend',
    description: '查询某段时间内的情绪趋势数据',
    parameters: {
      startDate: { type: 'string', description: '开始日期' },
      endDate: { type: 'string', description: '结束日期' },
      granularity: { type: 'string', enum: ['day', 'week', 'month'], default: 'day', description: '时间粒度' },
    },
  },
  {
    name: 'query_statistics',
    description: '查询统计指标，如消息量、回复延迟、活跃时段等',
    parameters: {
      metric: {
        type: 'string',
        enum: ['message_count', 'reply_delay', 'active_hours', 'word_freq', 'initiation_ratio', 'length_trend'],
        description: '要查询的指标',
      },
      startDate: { type: 'string', description: '开始日期' },
      endDate: { type: 'string', description: '结束日期' },
    },
  },
  {
    name: 'search_keywords',
    description: '搜索包含特定关键词的消息，分析其上下文',
    parameters: {
      keywords: { type: 'array', items: { type: 'string' }, description: '关键词列表' },
      limit: { type: 'number', default: 20, description: '返回条数' },
    },
  },
]

export function buildToolsPrompt(): string {
  const lines = [
    '## 可用工具',
    '当你需要查询具体数据来支撑分析时，可以使用以下工具。在回复中插入工具调用（可一次调用多个）：',
    '',
    '```',
    '[TOOL_CALL: {"tool": "工具名", "args": {参数对象}}]',
    '```',
    '',
    '例如：',
    '[TOOL_CALL: {"tool": "query_messages", "args": {"startDate": "2024-01-01", "endDate": "2024-01-31", "limit": 10}}]',
    '',
  ]

  for (const tool of toolDefinitions) {
    lines.push(`### ${tool.name}`)
    lines.push(tool.description)
    lines.push('参数：')
    for (const [key, desc] of Object.entries(tool.parameters)) {
      const info = desc as any
      const required = info.required !== false ? '必填' : '可选'
      lines.push(`  - ${key}: ${info.description} (${info.type}, ${required}${info.default !== undefined ? `, 默认: ${info.default}` : ''})`)
    }
    lines.push('')
  }

  lines.push('注意：')
  lines.push('1. 只在你确实需要查询数据时才使用工具')
  lines.push('2. 工具调用结果会以 [TOOL_RESULT: ...] 的形式返回给你')
  lines.push('3. 基于工具返回的数据给出分析结论')
  lines.push('4. 不要编造数据，只使用工具返回的真实数据')

  return lines.join('\n')
}
