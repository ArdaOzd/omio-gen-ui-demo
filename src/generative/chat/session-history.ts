import { z } from 'zod'
import type { UIMessage } from 'ai'

const STORAGE_KEY = 'omio-chat-session-history'

const SessionSummarySchema = z.strictObject({
  id: z.string().min(1).max(128),
  title: z.string().min(1),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  handoffId: z.string().min(1).max(128).optional(),
  draft: z.string().optional(),
})

const SessionHistorySchema = z.strictObject({
  version: z.literal(1),
  activeSessionId: z.string().min(1).max(128),
  collapsed: z.boolean(),
  sessions: z.array(SessionSummarySchema),
})

export type SessionSummary = z.infer<typeof SessionSummarySchema>
export type SessionHistory = z.infer<typeof SessionHistorySchema>

export function sessionTitle(messages: UIMessage[]): string {
  for (const message of messages) {
    if (message.role !== 'user') continue
    const text = message.parts
      .flatMap(part => part.type === 'text' ? [part.text] : [])
      .join(' ')
      .trim()
    if (text) return text
  }
  return 'New chat'
}

export function createSessionSummary(input: { title?: string; handoffId?: string; now?: Date } = {}): SessionSummary {
  const now = (input.now ?? new Date()).toISOString()
  return SessionSummarySchema.parse({
    id: `travel-${crypto.randomUUID()}`,
    title: input.title?.trim() || 'New chat',
    createdAt: now,
    updatedAt: now,
    handoffId: input.handoffId,
  })
}

export function readSessionHistory(storage: Storage = localStorage): SessionHistory | null {
  try {
    const raw: unknown = JSON.parse(storage.getItem(STORAGE_KEY) ?? 'null')
    const parsed = SessionHistorySchema.safeParse(raw)
    return parsed.success ? parsed.data : null
  } catch {
    return null
  }
}

export function writeSessionHistory(history: SessionHistory, storage: Storage = localStorage): void {
  storage.setItem(STORAGE_KEY, JSON.stringify(SessionHistorySchema.parse(history)))
}

export function updateSessionSummary(history: SessionHistory, id: string, title: string, now = new Date()): SessionHistory {
  return {
    ...history,
    sessions: history.sessions.map(session => session.id === id ? {
      ...session,
      title: title.trim() || session.title,
      updatedAt: now.toISOString(),
    } : session),
  }
}

export function updateSessionDraft(history: SessionHistory, id: string, draft: string): SessionHistory {
  return {
    ...history,
    sessions: history.sessions.map(session => session.id === id ? { ...session, draft } : session),
  }
}

export function orderedSessions(sessions: SessionSummary[]): SessionSummary[] {
  return [...sessions].sort((left, right) => right.updatedAt.localeCompare(left.updatedAt) || right.createdAt.localeCompare(left.createdAt))
}
