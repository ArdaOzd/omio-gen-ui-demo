import { HISTORY_LIMITS } from './chat/history-limits'

const STORAGE_KEY = 'omio-smart-planner-handoff'

export type SmartPlannerHandoff =
  | { id: string; kind: 'prompt'; prompt: string }
  | { id: string; kind: 'empty' }

export function storeSmartPlannerHandoff(prompt: string): SmartPlannerHandoff {
  if (!prompt.trim()) throw new Error('Tell the planner what kind of trip you want.')
  if (prompt.length > HISTORY_LIMITS.textCharacters) {
    throw new Error(`Keep your request under ${HISTORY_LIMITS.textCharacters.toLocaleString()} characters.`)
  }
  const handoff = { id: `planner-${crypto.randomUUID()}`, kind: 'prompt' as const, prompt }
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(handoff))
  return handoff
}

export function storeEmptyChatHandoff(): SmartPlannerHandoff {
  const handoff = { id: `planner-${crypto.randomUUID()}`, kind: 'empty' as const }
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(handoff))
  return handoff
}

export function readSmartPlannerHandoff(id: string | null): SmartPlannerHandoff | null {
  if (!id) return null
  try {
    const value: unknown = JSON.parse(sessionStorage.getItem(STORAGE_KEY) ?? 'null')
    if (
      !value ||
      typeof value !== 'object' ||
      !('id' in value) ||
      value.id !== id ||
      typeof value.id !== 'string'
    ) return null
    if ('kind' in value && value.kind === 'empty') return { id, kind: 'empty' }
    if (
      !('prompt' in value) ||
      typeof value.prompt !== 'string' ||
      !value.prompt.trim() ||
      value.prompt.length > HISTORY_LIMITS.textCharacters
    ) return null
    return { id, kind: 'prompt', prompt: value.prompt }
  } catch {
    return null
  }
}

export function completeSmartPlannerHandoff(id: string) {
  if (readSmartPlannerHandoff(id)?.id === id) sessionStorage.removeItem(STORAGE_KEY)
  const url = new URL(window.location.href)
  if (url.searchParams.get('handoff') === id) {
    url.searchParams.delete('handoff')
    window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`)
  }
}
