import { describe, expect, it } from 'vitest'
import { createDisplayContextStore } from '../../state/display-context'
import { withDisplayComponentIdentity } from './present-boundary'
import { validatePresentTree } from './tree'

describe('native present display identity', () => {
  it('namespaces repeated authored keys by host presentation instance', () => {
    const tree = validatePresentTree({
      $type: 'TravelSurface',
      $key: 'surface',
      artifactRef: 'artifact-1',
      children: [{ $type: 'FareCards', $key: 'fares', artifactRef: 'artifact-1', datasetRef: 'dataset-1', legIndex: 0 }],
    })
    const oldScene = withDisplayComponentIdentity(tree, 'root', undefined, 'present-old')
    const newScene = withDisplayComponentIdentity(tree, 'root', undefined, 'present-new')
    const oldChild = Array.isArray(oldScene.children) ? oldScene.children[0] : undefined
    const newChild = Array.isArray(newScene.children) ? newScene.children[0] : undefined

    expect(oldChild?.__displayComponent.componentRef).toEqual({ value: 'artifact-1:present-old:fares', keySource: 'authored-key' })
    expect(newChild?.__displayComponent.componentRef).toEqual({ value: 'artifact-1:present-new:fares', keySource: 'authored-key' })
    expect(oldChild?.__displayComponent.componentRef.value).not.toBe(newChild?.__displayComponent.componentRef.value)
  })

  it('keeps the newest presentation visible when the older owner is hidden or unmounted', () => {
    const store = createDisplayContextStore()
    const oldRef = 'artifact-1:present-old:fares'
    const newRef = 'artifact-1:present-new:fares'
    const oldCleanup = store.register({ componentRef: { value: oldRef, keySource: 'authored-key' }, componentType: 'FareCards', scope: { kind: 'artifact', artifactId: 'artifact-1' }, authored: {} })
    store.register({ componentRef: { value: newRef, keySource: 'authored-key' }, componentType: 'FareCards', scope: { kind: 'artifact', artifactId: 'artifact-1' }, authored: {} })
    store.setVisibility(oldRef, 'hidden-tab')
    store.setVisibility(newRef, 'visible')
    oldCleanup()

    const capture = store.capture({ captureId: 'capture-present', artifactIds: ['artifact-1'] })
    expect(capture.activeViews).toContain(newRef)
    expect(capture.activeViews).not.toContain(oldRef)
  })
})
