import type { UIMessage } from 'ai'
import { assertNoBulkData } from '../contracts/privacy'
import { HISTORY_LIMITS } from './history-limits'

function splitText(text: string): { type: 'text'; text: string }[] {
  if (!text.length) return [{ type: 'text', text }]
  const parts: { type: 'text'; text: string }[] = []
  for (let start = 0; start < text.length; start += HISTORY_LIMITS.textCharacters) {
    parts.push({ type: 'text', text: text.slice(start, start + HISTORY_LIMITS.textCharacters) })
  }
  return parts
}

function currentMessage(message: UIMessage): UIMessage {
  return { ...message, parts: message.parts.flatMap<UIMessage['parts'][number]>(part => part.type === 'text' ? splitText(part.text).map(chunk => ({ ...part, text: chunk.text })) : [part]) }
}

function olderMessage(message: UIMessage): UIMessage {
  const text = message.parts.flatMap(part => {
    if (part.type === 'text') return [part.text]
    if (part.type === 'dynamic-tool' || part.type.startsWith('tool-')) {
      const name = part.type === 'dynamic-tool' ? part.toolName : part.type.slice(5)
      return [`Earlier tool ${name}: details omitted from network history; current artifact state is in the attached context.`]
    }
    return []
  }).join('\n')
  return { ...message, parts: splitText(text) }
}

function fits(messages: readonly UIMessage[]): boolean {
  return messages.length <= HISTORY_LIMITS.messages
    && messages.every(message => message.parts.length <= HISTORY_LIMITS.parts)
    && JSON.stringify(messages).length <= HISTORY_LIMITS.serializedCharacters
}

export function projectNetworkHistory(messages: readonly UIMessage[]): UIMessage[] {
  assertNoBulkData(messages)
  if (messages.some(message => message.role === 'system')) throw new Error('User-authored system messages are forbidden')
  if (messages.some(message => message.parts.some(part => part.type === 'file'))) throw new Error('Attachments are unsupported by this demo')
  let latestUser = -1
  for (let index = messages.length - 1; index >= 0; index--) {
    const message = messages[index]
    if (message?.role === 'user' && message.parts.some(part => part.type === 'text' && part.text.trim())) { latestUser = index; break }
  }
  if (latestUser < 0) throw new Error('Missing visible user turn')
  let projected = messages.slice(latestUser).map(currentMessage)
  if (!fits(projected)) throw new Error('The current turn exceeds the request budget. Send a shorter follow-up to continue; the full transcript remains saved locally.')
  let end = latestUser
  while (end > 0) {
    let start = end - 1
    while (start > 0 && messages[start]?.role !== 'user') start--
    const turn = messages.slice(start, end).map(olderMessage)
    const candidate = [...turn, ...projected]
    if (!fits(candidate)) break
    projected = candidate
    end = start
  }
  return projected
}
