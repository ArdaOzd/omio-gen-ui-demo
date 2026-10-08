import { StrictMode } from 'react'
import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { createDisplayContextStore } from '../state/display-context'
import { DisplayContextProvider, DisplayNodeProvider, usePublishDisplay } from './display-context-provider'

function PublishingChild() {
  usePublishDisplay({
    inputs: { originId: 'london', destinationId: 'paris' },
    display: { payload: { kind: 'status', label: 'Ready' }, totalDisplayed: 1, includedCount: 1, complete: true, omittedCount: 0 },
  })
  return <div>Ready</div>
}

describe('display context provider lifecycle', () => {
  it('registers a native-rendered component before child publish effects run', () => {
    const store = createDisplayContextStore()
    expect(() => render(<StrictMode><DisplayContextProvider store={store}><DisplayNodeProvider identity={{ componentRef: { value: 'artifact-1:present-call:surface', keySource: 'authored-key' }, componentType: 'TravelSurface', scope: { kind: 'artifact', artifactId: 'artifact-1' }, authored: {} }}><PublishingChild /></DisplayNodeProvider></DisplayContextProvider></StrictMode>)).not.toThrow()
    expect(store.get('artifact-1:present-call:surface')).toMatchObject({ inputs: { originId: 'london', destinationId: 'paris' }, display: { payload: { kind: 'status', label: 'Ready' } } })
  })
})
