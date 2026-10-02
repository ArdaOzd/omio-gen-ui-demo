import React from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { z } from 'zod'
import { isASTNode } from '@openuidev/lang-core'
import { HostStateRenderer } from '../../spikes/openui/host-state-renderer'
import { Renderer, createLibrary, createParser, createStreamingParser, defineComponent, reactive, useStateField, useTriggerAction, type ActionPlan } from '@openuidev/react-lang'

const Mode = defineComponent({
  name: 'Mode',
  description: 'Locally edits one mode variable.',
  props: z.object({ name: z.string(), value: reactive(z.string()) }),
  component: ({ props }) => {
    const field = useStateField(props.name, props.value)
    return <select aria-label={props.name} value={field.value} onChange={event => field.setValue(event.target.value)}><option value="train">Train</option><option value="bus">Bus</option></select>
  },
})
const Summary = defineComponent({ name: 'Summary', description: 'Bounded query summary.', props: z.object({ text: z.string() }), component: ({ props }) => <output>{props.text}</output> })
function parseAction(value: unknown): ActionPlan {
  if (!value || typeof value !== 'object' || !('steps' in value) || !Array.isArray(value.steps)) throw new Error('Invalid fixture action')
  const steps: ActionPlan['steps'] = []
  for (const step of value.steps) {
    if (!step || typeof step !== 'object') throw new Error('Invalid fixture action step')
    if (step.type === 'set' && typeof step.target === 'string' && isASTNode(step.valueAST)) steps.push({ type: 'set', target: step.target, valueAST: step.valueAST })
    else if (step.type === 'run' && typeof step.statementId === 'string' && (step.refType === 'query' || step.refType === 'mutation')) steps.push({ type: 'run', statementId: step.statementId, refType: step.refType })
    else if (step.type === 'reset' && Array.isArray(step.targets) && step.targets.every((target: unknown) => typeof target === 'string')) steps.push({ type: 'reset', targets: step.targets })
    else throw new Error('Unsupported fixture action')
  }
  return { steps }
}
const Command = defineComponent({
  name: 'Command', description: 'Runs a language action.', props: z.object({ label: z.string(), action: z.unknown() }),
  component: ({ props }) => {
    const trigger = useTriggerAction()
    return <button onClick={() => trigger(props.label, undefined, parseAction(props.action))}>{props.label}</button>
  },
})
const Surface = defineComponent({ name: 'Surface', description: 'One artifact root.', props: z.object({ children: z.array(z.union([Mode.ref, Summary.ref, Command.ref])) }), component: ({ props, renderNode }) => <section>{renderNode(props.children)}</section> })
const library = createLibrary({ components: [Surface, Mode, Summary, Command], root: 'Surface' })
const source = `root = Surface([mode, summary, setBus, reset])
$mode = "train"
mode = Mode("mode", $mode)
query = Query("local_query", {mode: $mode}, {text: "loading"})
summary = Summary(query.text)
setBus = Command("Set bus", Action([@Set($mode, "bus")]))
reset = Command("Reset mode", Action([@Reset($mode)]))`

afterEach(cleanup)

describe('OpenUI published runtime compatibility', () => {
  it('parses v0.5 variable dependencies and ordered actions through its public parser', () => {
    const parsed = createParser(library.toJSONSchema(), library.root).parse(source)
    expect(parsed.meta.errors).toEqual([])
    expect(parsed.meta.unresolved).toEqual([])
    expect(parsed.stateDeclarations).toEqual({ $mode: 'train' })
    expect(parsed.queryStatements[0]?.deps).toEqual(['$mode'])
    expect(parsed.root?.typeName).toBe('Surface')
  })

  it('reports input edits, @Set, and @Reset, while keeping query rows out of raw state', async () => {
    const updates: Record<string, unknown>[] = []
    const localQuery = vi.fn(async ({ mode }: Record<string, unknown>) => ({ text: `${String(mode)} selected`, fareRows: [{ __fare_canary__: 'ROW_SENTINEL_NEVER_IN_CONTEXT' }] }))
    render(<Renderer library={library} response={source} onStateUpdate={state => updates.push(state)} toolProvider={{ local_query: localQuery }} publishObservability={false} />)
    await screen.findByText('train selected')
    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'mode' }), 'bus')
    await screen.findByText('bus selected')
    expect(updates.at(-1)?.$mode).toBe('bus')
    await userEvent.click(screen.getByRole('button', { name: 'Reset mode' }))
    await screen.findByText('train selected')
    expect(updates.at(-1)?.$mode).toBe('train')
    await userEvent.click(screen.getByRole('button', { name: 'Set bus' }))
    await screen.findByText('bus selected')
    expect(updates.at(-1)?.$mode).toBe('bus')
    expect(JSON.stringify(updates)).not.toContain('ROW_SENTINEL')
    expect(localQuery.mock.calls.slice(-3).map(([args]) => args.mode)).toEqual(['bus', 'train', 'bus'])
  })

  it('captures selected-fare mutation and a dependent toggle after ordered actions', async () => {
    const snapshots: Record<string, unknown>[] = []
    const commit = vi.fn(async () => ({ status: 'committed', artifactId: 'artifact-1', revision: 2 }))
    const selectionSource = `root = Surface([selection, commitButton])
$selected = ""
$show = false
commit = Mutation("patch_artifact_state", {selectedFareId: "fare-1"})
selection = Summary($show ? $selected : "unselected")
commitButton = Command("Select fare", Action([@Run(commit), @Set($selected, "fare-1"), @Set($show, true)]))`
    render(<HostStateRenderer allowedStateKeys={['$selected', '$show']} response={selectionSource} library={library} onStateUpdate={state => snapshots.push(state)} toolProvider={{ patch_artifact_state: commit }} publishObservability={false} />)
    expect(screen.getByText('unselected')).toBeTruthy()
    await userEvent.click(screen.getByRole('button', { name: 'Select fare' }))
    await screen.findByText('fare-1')
    expect(commit).toHaveBeenCalledTimes(1)
    expect(snapshots.at(-1)).toEqual({ $selected: 'fare-1', $show: true })
  })

  it('defers query execution during streaming and preserves an input edit when streaming settles', async () => {
    const updates: Record<string, unknown>[] = []
    const localQuery = vi.fn(async ({ mode }: Record<string, unknown>) => ({ text: `${String(mode)} selected` }))
    const { rerender } = render(<HostStateRenderer allowedStateKeys={['$mode']} response={source} library={library} isStreaming onStateUpdate={state => updates.push(state)} toolProvider={{ local_query: localQuery }} publishObservability={false} />)
    expect(localQuery).not.toHaveBeenCalled()
    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'mode' }), 'bus')
    expect(updates.at(-1)).toEqual({ $mode: 'bus' })
    rerender(<HostStateRenderer allowedStateKeys={['$mode']} response={source.replace('$mode = "train"', '$mode = "ferry"')} library={library} isStreaming={false} initialState={{ $mode: 'train' }} onStateUpdate={state => updates.push(state)} toolProvider={{ local_query: localQuery }} publishObservability={false} />)
    await screen.findByText('bus selected')
    expect(localQuery.mock.calls.every(([args]) => args.mode === 'bus')).toBe(true)
  })

  it('exposes streaming completeness and unknown-component errors to the host parser', () => {
    const parser = createStreamingParser(library.toJSONSchema(), library.root)
    const partial = parser.push('root = Surface([')
    expect(partial.meta.incomplete).toBe(true)
    const complete = parser.push('Summary("ready")])')
    expect(complete.meta.incomplete).toBe(false)
    expect(complete.meta.errors).toEqual([])
    expect(complete.root?.typeName).toBe('Surface')
    const invalid = parser.set('root = Surface([Unknown("unsafe")])')
    expect(invalid.meta.errors.some(error => error.code === 'unknown-component')).toBe(true)
  })

  it('hydrates current variable values and preserves them when new source defaults arrive', async () => {
    const updates: Record<string, unknown>[] = []
    const localQuery = vi.fn(async ({ mode }: Record<string, unknown>) => ({ text: `${String(mode)} selected` }))
    const { rerender } = render(<HostStateRenderer allowedStateKeys={['$mode']} library={library} response={source} initialState={{ $mode: 'train' }} onStateUpdate={state => updates.push(state)} toolProvider={{ local_query: localQuery }} publishObservability={false} />)
    await screen.findByText('train selected')
    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'mode' }), 'bus')
    await screen.findByText('bus selected')
    rerender(<HostStateRenderer allowedStateKeys={['$mode']} library={library} response={source.replace('$mode = "train"', '$mode = "ferry"')} initialState={{ $mode: 'train' }} onStateUpdate={state => updates.push(state)} toolProvider={{ local_query: localQuery }} publishObservability={false} />)
    await waitFor(() => {
      const input = screen.getByRole('combobox', { name: 'mode' })
      if (!(input instanceof HTMLSelectElement)) throw new Error('Mode selector missing')
      expect(input.value).toBe('bus')
    })
    expect(screen.getByText('bus selected')).toBeTruthy()
    expect(localQuery.mock.calls.at(-1)?.[0].mode).toBe('bus')
  })
})
