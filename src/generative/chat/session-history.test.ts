import { describe, expect, it } from 'vitest'
import type { UIMessage } from 'ai'
import {
  createSessionSummary,
  orderedSessions,
  readSessionHistory,
  renameSessionSummary,
  sessionTitle,
  updateSessionSummary,
  updateSessionDraft,
  writeSessionHistory,
  type SessionHistory,
} from './session-history'

const userMessage = (text: string): UIMessage => ({ id: crypto.randomUUID(), role: 'user', parts: [{ type: 'text', text }] })

describe('browser-local session history', () => {
  it('uses the complete first user prompt as the durable title', () => {
    const prompt = '  Prague to Rome\nwith a quiet overnight stop  '
    expect(sessionTitle([{ id: 'assistant', role: 'assistant', parts: [{ type: 'text', text: 'Hello' }] }, userMessage(prompt)])).toBe('Prague to Rome\nwith a quiet overnight stop')
  })

  it('round-trips active, collapsed, and handoff metadata without limiting the session list', () => {
    const storage = new Map<string, string>()
    const browserStorage: Storage = {
      get length() { return storage.size },
      clear: () => storage.clear(),
      getItem: key => storage.get(key) ?? null,
      key: index => [...storage.keys()][index] ?? null,
      removeItem: key => { storage.delete(key) },
      setItem: (key, value) => { storage.set(key, value) },
    }
    const sessions = Array.from({ length: 205 }, (_, index) => createSessionSummary({ title: `Trip ${index}`, handoffId: `handoff-${index}`, now: new Date(1_800_000_000_000 + index) }))
    const history: SessionHistory = { version: 1, activeSessionId: sessions[204]!.id, collapsed: true, sessions }
    writeSessionHistory(history, browserStorage)
    expect(readSessionHistory(browserStorage)).toEqual(history)
  })

  it('orders recent sessions without losing the original first prompt', () => {
    const older = createSessionSummary({ title: 'Old plan', now: new Date('2026-10-07T10:00:00Z') })
    const newer = createSessionSummary({ title: 'New plan', now: new Date('2026-10-07T11:00:00Z') })
    const history: SessionHistory = { version: 1, activeSessionId: older.id, collapsed: false, sessions: [older, newer] }
    const touched = updateSessionSummary(history, older.id, 'Old plan', new Date('2026-10-07T12:00:00Z'))
    expect(orderedSessions(touched.sessions).map(session => session.title)).toEqual(['Old plan', 'New plan'])
    expect(updateSessionDraft(touched, older.id, 'Unsent details').sessions.find(session => session.id === older.id)?.draft).toBe('Unsent details')
  })

  it('preserves a custom title when later message saves refresh the session summary', () => {
    const session = createSessionSummary({ title: 'Original audit prompt', now: new Date('2026-10-07T10:00:00Z') })
    const history: SessionHistory = { version: 1, activeSessionId: session.id, collapsed: false, sessions: [session] }
    const renamed = renameSessionSummary(history, session.id, '  #3  ', new Date('2026-10-07T11:00:00Z'))
    const flushed = updateSessionSummary(renamed, session.id, 'Original audit prompt', new Date('2026-10-07T12:00:00Z'))

    expect(flushed.sessions[0]).toMatchObject({ title: '#3', customTitle: true, updatedAt: '2026-10-07T12:00:00.000Z' })
  })
})
