/** Restore only in a caller-owned isolated browser context, never a user's session. */
export async function restoreRecordedThread(page, { variant, record, expectedSourceVersion, reload = () => page.reload() }) {
  const result = await page.evaluate(async ({ variant, record, expectedSourceVersion }) => {
    const { createFareDataBridge } = await import('/src/generative/data/fare-data-bridge.ts')
    const { createThreadPersistence, parsePersistedThread } = await import('/src/generative/state/persistence.ts')
    const { assertNoBulkData } = await import('/src/generative/contracts/privacy.ts')
    if (variant !== 'a' && variant !== 'b') throw new Error('Unknown recorded variant')
    assertNoBulkData(record)
    const valid = parsePersistedThread(record)
    const bridge = createFareDataBridge()
    const loaded = []
    for (const descriptor of valid.descriptors) {
      const manifest = await bridge.load(descriptor.request, new AbortController().signal)
      if (manifest.datasetId !== descriptor.datasetId || manifest.source.sourceVersion !== descriptor.sourceVersion || (expectedSourceVersion && manifest.source.sourceVersion !== expectedSourceVersion)) throw new Error('Recorded artifact fixture identity changed')
      loaded.push({ datasetId: manifest.datasetId, sourceVersion: manifest.source.sourceVersion, rowCount: manifest.rowCount })
    }
    const key = `travel-${variant}`, persistence = createThreadPersistence()
    await persistence.load(key)
    await persistence.save(key, valid)
    return { artifacts: valid.artifacts.length, activeArtifactId: valid.activeArtifactId, loaded }
  }, { variant, record, expectedSourceVersion })
  await reload()
  return result
}
