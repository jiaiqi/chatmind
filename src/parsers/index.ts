import type { ParseResult } from '../types/message'
import { parseWeFlowJson } from './weflow-json'
import { parseWeFlowCsv } from './weflow-csv'
import { parseGenericTxt } from './generic-txt'
import { parseChatLabJson, parseChatLabJsonl } from './chatlab-json'

const parsers = [
  { name: 'WeFlow JSON', extensions: ['.json'], mimeTypes: ['application/json'], parse: parseWeFlowJson },
  { name: 'WeFlow CSV', extensions: ['.csv'], mimeTypes: ['text/csv', 'application/vnd.ms-excel'], parse: parseWeFlowCsv },
  { name: 'Generic TXT', extensions: ['.txt'], mimeTypes: ['text/plain'], parse: parseGenericTxt },
  { name: 'ChatLab JSONL', extensions: ['.jsonl'], mimeTypes: ['application/jsonl', 'application/x-ndjson'], parse: parseChatLabJsonl },
]

export function getParserForFile(file: File) {
  const ext = '.' + file.name.split('.').pop()?.toLowerCase()
  const mime = file.type

  for (const parser of parsers) {
    if (parser.extensions.includes(ext) || parser.mimeTypes.includes(mime)) {
      return parser
    }
  }
  return null
}

export async function parseFile(file: File): Promise<ParseResult> {
  const ext = '.' + file.name.split('.').pop()?.toLowerCase()

  if (ext === '.json') {
    const text = await file.text()
    return detectAndParseJson(text, file.name)
  }

  const parser = getParserForFile(file)
  if (!parser) {
    throw new Error(`不支持的文件格式: ${file.name}。支持 JSON, CSV, TXT, JSONL 格式。`)
  }

  const text = await file.text()
  const result = await parser.parse(text, file.name)
  return result
}

async function detectAndParseJson(text: string, fileName: string): Promise<ParseResult> {
  let data: any
  try {
    data = JSON.parse(text)
  } catch {
    throw new Error('JSON 解析失败，请检查文件格式')
  }

  if (data.format === 'chatlab' || data.source === 'chatlab' || data.formatVersion?.startsWith?.('0.0')) {
    return parseChatLabJson(text, fileName)
  }

  return parseWeFlowJson(text, fileName)
}
