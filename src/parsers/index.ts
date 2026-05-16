import type { ParseResult } from '../types/message'
import { parseWeFlowJson } from './weflow-json'
import { parseWeFlowCsv } from './weflow-csv'
import { parseGenericTxt } from './generic-txt'

const parsers = [
  { name: 'WeFlow JSON', extensions: ['.json'], mimeTypes: ['application/json'], parse: parseWeFlowJson },
  { name: 'WeFlow CSV', extensions: ['.csv'], mimeTypes: ['text/csv', 'application/vnd.ms-excel'], parse: parseWeFlowCsv },
  { name: 'Generic TXT', extensions: ['.txt'], mimeTypes: ['text/plain'], parse: parseGenericTxt },
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
  const parser = getParserForFile(file)
  if (!parser) {
    throw new Error(`不支持的文件格式: ${file.name}。支持 JSON, CSV, TXT 格式。`)
  }

  const text = await file.text()
  const result = await parser.parse(text, file.name)
  return result
}
