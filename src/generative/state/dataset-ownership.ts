import type { ArtifactId, DatasetId, FareDataBridge, UIStateStore } from '../contracts'

const deferredReleases = new WeakMap<FareDataBridge, Map<DatasetId, number>>()

export function releaseDatasetWhenUnowned(store: UIStateStore, bridge: FareDataBridge, artifactId: ArtifactId, datasetId: DatasetId): void {
  const ownedElsewhere = store.getIds?.().some(id => id !== artifactId && store.get(id).datasetRefs.includes(datasetId)) ?? false
  const deferred = deferredReleases.get(bridge) ?? new Map<DatasetId, number>()
  if (ownedElsewhere) {
    deferred.set(datasetId, (deferred.get(datasetId) ?? 0) + 1)
    deferredReleases.set(bridge, deferred)
    return
  }
  const count = 1 + (deferred.get(datasetId) ?? 0)
  deferred.delete(datasetId)
  for (let index = 0; index < count; index += 1) bridge.release(datasetId)
}
