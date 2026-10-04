import { chromium, expect } from '@playwright/test';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { instrument, chooseFare, selectedJourney, assertSelectedJourney } from './run-matrix.mjs';
import { timelineRevealActions } from './source-analysis.mjs';
import { restoreRecordedThread } from '../resume-artifacts/replay-artifact.mjs';

const base = process.env.OMIO_DEMO_URL ?? 'http://127.0.0.1:5194';
const output = process.env.OMIO_TIMELINE_OUTPUT ?? `/private/tmp/omio-timeline-proof-${Date.now()}`;
const runtime = await (await fetch(base + '/api/agent/health')).json();
const fixture = await (await fetch(base + '/api/health')).json();
const proof = JSON.parse(await readFile(process.env.OMIO_NATIVE_PROOF ?? 'verification/generative-ui/resume-artifacts/final-native-proof/results.json', 'utf8'));
const native = proof.results.find(item => item.variant === 'b' && item.index === 1 && item.passed && item.persisted);
if (!native) throw new Error('Missing exact retained B timeline source');
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const context = await browser.newContext();
const page = await context.newPage();
let blocked = 0;
const state = () => page.evaluate(async () => {
  const { createThreadPersistence } = await import('/src/generative/state/persistence.ts');
  const record = await createThreadPersistence().load('travel-b');
  return record.artifacts.find(item => item.state.artifactId === record.activeArtifactId).state;
});
const result = {
  classification: 'Zero-model native authored timeline action/selection proof; not a matrix sample',
  runtime, sourceVersion: fixture.source_version, humanRatings: null, passed: false,
};
await mkdir(output, { recursive: true });
await context.addInitScript(instrument);
await page.route('**/api/chat', async route => { blocked++; await route.abort(); });
try {
  await page.goto(base + '/b');
  await restoreRecordedThread(page, { variant: 'b', record: native.persisted, expectedSourceVersion: fixture.source_version });
  const view = page.locator('.travel-travelsurface').last();
  const timeline = view.locator('section:has(> .travel-timeline > li > p)').filter({ visible: true });
  const artifact = native.persisted.artifacts.find(item => item.state.artifactId === native.persisted.activeArtifactId);
  const titles = timelineRevealActions(artifact).flatMap(action => action.titles);
  expect(titles).toContain('Show journey timeline');
  result.authoredRevealTitles = titles;
  if (await timeline.count()) await view.getByRole('button', { name: 'Hide journey timeline', exact: true }).click();
  await expect(timeline).toHaveCount(0);
  // Read actual native host state as well as persistence; SDK-only hiding is insufficient.
  await page.getByText('Developer conversation diagnostics', { exact: true }).click();
  await page.getByRole('button', { name: 'Refresh diagnostics', exact: true }).click();
  await expect.poll(async () => {
    try { return JSON.parse(await page.getByRole('textbox', { name: 'Conversation diagnostics' }).inputValue()).artifactRecords.length; }
    catch { return 0; }
  }).toBeGreaterThan(0);
  result.hostAfterHide = JSON.parse(await page.getByRole('textbox', { name: 'Conversation diagnostics' }).inputValue()).artifactRecords.map(record => record.state);
  result.notices = await page.getByRole('status').allTextContents();
  result.persistedAfterHide = await state();
  await expect.poll(async () => (await state()).runtimeVariables['$showTimeline']).toBe(false);
  result.afterHide = await state();
  result.selection = await chooseFare(view);
  await expect.poll(async () => (await state()).selectedFareIds.length).toBeGreaterThan(0);
  result.afterSelection = await state();
  expect(result.afterSelection.runtimeVariables).toEqual(result.afterHide.runtimeVariables);
  await expect(timeline).toHaveCount(0);
  await view.getByRole('button', { name: 'Show journey timeline', exact: true }).click();
  await expect(timeline.first()).toBeVisible();
  await expect.poll(async () => (await state()).runtimeVariables['$showTimeline']).toBe(true);
  result.selectedFacts = await selectedJourney(page, { variant: 'b' }, fixture.source_version);
  await assertSelectedJourney(view, result.selectedFacts);
  result.actualAuthoredTimelineRevealed = true;
  result.passed = true;
} catch (error) {
  result.failure = String(error.stack ?? error);
} finally {
  result.blockedModelRequests = blocked;
  result.liveModelCalls = 0;
  if (blocked) result.passed = false;
  result.metrics = await page.evaluate(() => window.__studyMetrics).catch(() => null);
  await page.screenshot({ path: output + '/timeline.png', fullPage: true }).catch(() => {});
  await browser.close();
  await writeFile(output + '/results.json', JSON.stringify(result, null, 2));
  console.log(JSON.stringify({ passed: result.passed, blockedModelRequests: blocked, failure: result.failure?.split('\n')[0] ?? null }));
}
if (!result.passed) process.exitCode = 1;
