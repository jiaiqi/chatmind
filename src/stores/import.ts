import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { ParseResult, RawParticipant } from '../types/message'

export interface ImportState {
  files: File[]
  parseResults: ParseResult[]
  isParsing: boolean
  parseProgress: number
  currentStep: 'idle' | 'parsing' | 'confirming_identity' | 'importing' | 'done' | 'error'
  error: string | null
}

export const useImportStore = defineStore('import', () => {
  const files = ref<File[]>([])
  const parseResults = ref<ParseResult[]>([])
  const isParsing = ref(false)
  const parseProgress = ref(0)
  const currentStep = ref<ImportState['currentStep']>('idle')
  const error = ref<string | null>(null)

  const hasData = computed(() => parseResults.value.length > 0)
  const allParticipants = computed(() => {
    const map = new Map<string, RawParticipant>()
    for (const result of parseResults.value) {
      for (const p of result.participants) {
        if (!map.has(p.name)) {
          map.set(p.name, p)
        }
      }
    }
    return Array.from(map.values())
  })
  const allMessages = computed(() => {
    return parseResults.value.flatMap(r => r.messages)
  })

  function setFiles(newFiles: File[]) {
    files.value = newFiles
    currentStep.value = 'idle'
    error.value = null
  }

  function setParseResults(results: ParseResult[]) {
    parseResults.value = results
    currentStep.value = 'confirming_identity'
    isParsing.value = false
    parseProgress.value = 100
  }

  function setParsing(parsing: boolean) {
    isParsing.value = parsing
    currentStep.value = parsing ? 'parsing' : currentStep.value
  }

  function setProgress(progress: number) {
    parseProgress.value = progress
  }

  function setError(err: string) {
    error.value = err
    currentStep.value = 'error'
    isParsing.value = false
  }

  function reset() {
    files.value = []
    parseResults.value = []
    isParsing.value = false
    parseProgress.value = 0
    currentStep.value = 'idle'
    error.value = null
  }

  return {
    files,
    parseResults,
    isParsing,
    parseProgress,
    currentStep,
    error,
    hasData,
    allParticipants,
    allMessages,
    setFiles,
    setParseResults,
    setParsing,
    setProgress,
    setError,
    reset,
  }
})
