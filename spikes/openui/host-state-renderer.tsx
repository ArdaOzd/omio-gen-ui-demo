import React, { useRef } from 'react'
import { Renderer, type RendererProps } from '@openuidev/react-lang'

type CompactValue = string | number | boolean | null
type CompactState = Record<string, CompactValue>
type HostStateRendererProps = Omit<RendererProps, 'initialState' | 'onStateUpdate'> & {
  allowedStateKeys: readonly string[]
  initialState?: Record<string, unknown>
  onStateUpdate?: (state: CompactState) => void
}

function projectState(raw: Record<string, unknown>, keys: readonly string[]): CompactState {
  const compact: CompactState = {}
  for (const key of keys) {
    const value = raw[key]
    if (typeof value === 'string' || typeof value === 'boolean' || value === null || typeof value === 'number' && Number.isFinite(value)) compact[key] = value
  }
  return compact
}

export function HostStateRenderer({ allowedStateKeys, initialState = {}, onStateUpdate, ...props }: HostStateRendererProps) {
  const latest = useRef(projectState(initialState, allowedStateKeys))
  return <Renderer {...props} initialState={latest.current} onStateUpdate={raw => {
    latest.current = projectState(raw, allowedStateKeys)
    onStateUpdate?.(latest.current)
  }} />
}
