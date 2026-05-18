export interface ModelInfo {
  id: string
  name: string
  description?: string
  maxTokens?: number
}

export interface ProviderConfig {
  id: string
  name: string
  logo?: string
  baseUrl: string
  apiKeyUrl: string
  docsUrl: string
  models: ModelInfo[]
  isOpenAICompatible: boolean
  extraHeaders?: Record<string, string>
  needsTransform?: boolean
  supportsFunctionCalling?: boolean
}

export const DEFAULT_PROVIDERS: ProviderConfig[] = [
  {
    id: 'ollama',
    name: 'Ollama (本地)',
    baseUrl: 'http://localhost:11434/v1',
    apiKeyUrl: '',
    docsUrl: 'https://github.com/ollama/ollama/blob/main/docs/openai.md',
    isOpenAICompatible: true,
    models: [
      { id: 'qwen2.5:7b', name: '通义千问 7B', description: '本地轻量，中文友好' },
      { id: 'qwen2.5:14b', name: '通义千问 14B', description: '本地平衡型' },
      { id: 'deepseek-r1:7b', name: 'DeepSeek R1 7B', description: '本地推理模型' },
      { id: 'llama3.2', name: 'Llama 3.2', description: 'Meta 开源模型' },
    ],
  },
  {
    id: 'deepseek',
    name: 'DeepSeek',
    baseUrl: 'https://api.deepseek.com/v1',
    apiKeyUrl: 'https://platform.deepseek.com/api_keys',
    docsUrl: 'https://platform.deepseek.com/docs',
    isOpenAICompatible: true,
    supportsFunctionCalling: true,
    models: [
      { id: 'deepseek-chat', name: 'DeepSeek V3', description: '通用对话，性价比高' },
      { id: 'deepseek-reasoner', name: 'DeepSeek R1', description: '推理模型，深度思考' },
    ],
  },
  {
    id: 'kimi',
    name: 'Kimi (月之暗面)',
    baseUrl: 'https://api.moonshot.cn/v1',
    apiKeyUrl: 'https://platform.moonshot.cn/console/api-keys',
    docsUrl: 'https://platform.moonshot.cn/docs',
    isOpenAICompatible: true,
    supportsFunctionCalling: true,
    models: [
      { id: 'moonshot-v1-8k', name: 'Kimi 8K', description: '轻量级，适合简单对话' },
      { id: 'moonshot-v1-32k', name: 'Kimi 32K', description: '长文本，适合深度分析' },
      { id: 'moonshot-v1-128k', name: 'Kimi 128K', description: '超长文本，百万级记录' },
    ],
  },
  {
    id: 'minimax',
    name: 'MiniMax',
    baseUrl: 'https://api.minimaxi.com/v1',
    apiKeyUrl: 'https://platform.minimaxi.com/user-center/basic-information/interface-key',
    docsUrl: 'https://platform.minimaxi.com/docs/token-plan/intro',
    isOpenAICompatible: true,
    supportsFunctionCalling: true,
    models: [
      { id: 'MiniMax-M2.1', name: 'MiniMax-M2.1', description: 'Token Plan 主力模型，Agent 能力最强' },
      { id: 'MiniMax-Text-01', name: 'MiniMax-Text-01', description: '长文本模型，支持 400K 上下文' },
      { id: 'abab7-chat-preview', name: 'abab7 Preview', description: '最新预览版' },
      { id: 'abab6.5t-chat', name: 'abab6.5t', description: '超长上下文' },
      { id: 'abab6.5-chat', name: 'abab6.5', description: '标准模型' },
      { id: 'abab6.5s-chat', name: 'abab6.5s', description: '轻量快速' },
    ],
  },
  {
    id: 'bailian',
    name: '百炼 (阿里云)',
    baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    apiKeyUrl: 'https://bailian.console.aliyun.com/?apiKey=1#/api-key',
    docsUrl: 'https://help.aliyun.com/zh/model-studio/developer-reference/',
    isOpenAICompatible: true,
    supportsFunctionCalling: true,
    models: [
      { id: 'qwen-plus', name: '通义千问 Plus', description: '综合能力最强' },
      { id: 'qwen-max', name: '通义千问 Max', description: '深度推理' },
      { id: 'qwen-turbo', name: '通义千问 Turbo', description: '快速响应' },
      { id: 'qwen-coder-plus', name: '通义千问 Coder Plus', description: '代码能力' },
    ],
  },
  {
    id: 'siliconflow',
    name: 'SiliconFlow (硅基流动)',
    baseUrl: 'https://api.siliconflow.cn/v1',
    apiKeyUrl: 'https://cloud.siliconflow.cn/account/ak',
    docsUrl: 'https://docs.siliconflow.cn/',
    isOpenAICompatible: true,
    supportsFunctionCalling: true,
    models: [
      { id: 'deepseek-ai/DeepSeek-V3', name: 'DeepSeek V3', description: '通过SiliconFlow调用' },
      { id: 'deepseek-ai/DeepSeek-R1', name: 'DeepSeek R1', description: '通过SiliconFlow调用' },
      { id: 'Qwen/Qwen2.5-72B-Instruct', name: 'Qwen2.5 72B', description: '开源大模型' },
    ],
  },
  {
    id: 'zhipu',
    name: '智谱 AI (GLM)',
    baseUrl: 'https://open.bigmodel.cn/api/paas/v4',
    apiKeyUrl: 'https://open.bigmodel.cn/usercenter/apikeys',
    docsUrl: 'https://open.bigmodel.cn/dev/howuse/glm-4',
    isOpenAICompatible: true,
    supportsFunctionCalling: true,
    models: [
      { id: 'glm-4', name: 'GLM-4', description: '旗舰模型' },
      { id: 'glm-4-flash', name: 'GLM-4 Flash', description: '快速轻量' },
      { id: 'glm-4-air', name: 'GLM-4 Air', description: '性价比' },
      { id: 'glm-4-plus', name: 'GLM-4 Plus', description: '增强版' },
    ],
  },
  {
    id: 'baidu',
    name: '百度千帆',
    baseUrl: 'https://qianfan.baidubce.com/v2',
    apiKeyUrl: 'https://console.bce.baidu.com/qianfan/ais/console/applicationConsole/application',
    docsUrl: 'https://cloud.baidu.com/doc/WENXINWORKSHOP/index.html',
    isOpenAICompatible: true,
    supportsFunctionCalling: true,
    models: [
      { id: 'ernie-4.0-turbo-8k', name: '文心 4.0 Turbo', description: '最新旗舰' },
      { id: 'ernie-3.5-8k', name: '文心 3.5', description: '经典模型' },
      { id: 'ernie-speed-128k', name: '文心 Speed', description: '高速响应' },
    ],
  },
  {
    id: 'tencent',
    name: '腾讯云 (混元)',
    baseUrl: 'https://api.hunyuan.cloud.tencent.com/v1',
    apiKeyUrl: 'https://console.cloud.tencent.com/hunyuan/api-key',
    docsUrl: 'https://cloud.tencent.com/document/product/1729/111007',
    isOpenAICompatible: true,
    supportsFunctionCalling: true,
    models: [
      { id: 'hunyuan-turbo', name: '混元 Turbo', description: '旗舰模型' },
      { id: 'hunyuan-pro', name: '混元 Pro', description: '专业版' },
      { id: 'hunyuan-standard', name: '混元 Standard', description: '标准版' },
    ],
  },
  {
    id: 'custom',
    name: '自定义',
    baseUrl: '',
    apiKeyUrl: '',
    docsUrl: '',
    isOpenAICompatible: true,
    models: [
      { id: 'custom-model', name: '自定义模型', description: '手动输入模型ID' },
    ],
  },
]

export function getProviderById(id: string): ProviderConfig | undefined {
  return DEFAULT_PROVIDERS.find(p => p.id === id)
}

export function getAllProviders(): ProviderConfig[] {
  return DEFAULT_PROVIDERS
}

export function getAllModels(): { provider: ProviderConfig; model: ModelInfo }[] {
  const result: { provider: ProviderConfig; model: ModelInfo }[] = []
  for (const provider of DEFAULT_PROVIDERS) {
    for (const model of provider.models) {
      result.push({ provider, model })
    }
  }
  return result
}
