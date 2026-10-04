import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { readResumeRecords } from './resume-records.mjs';

const runtime = {appRevision:'frozen',provider:'signed-in-codex',model:'gpt-6.1-sol',reasoningEffort:'high'};
const fixture = {sourceVersion:'fixture',rowCount:10000000};
const cell = {id:'a-cold-fixed',scenario:'calendar',variant:'a',cache:'cold',wording:'fixed',seed:17};
const failure = {...cell,runtime,fixture,appRevision:runtime.appRevision,runtimeValid:true,fixtureValid:true,model:runtime.model,reasoning:runtime.reasoningEffort,provider:runtime.provider,liveModelAuthorship:false,outcome:'fail',failure:'Warm setup failed before the first model request',runEnvironment:{id:'environment'}};
test('a pre-model failure is resumed unchanged and incompatible evidence is never overwritten', async () => {
  const output = await mkdtemp(join(tmpdir(),'omio-resume-evidence-'));
  const path = join(output,`${cell.id}.json`);
  try {
    const raw = JSON.stringify(failure);
    await writeFile(path,raw);
    assert.deepEqual(await readResumeRecords(output,[cell],runtime,fixture,'environment'),[failure]);
    assert.equal(await readFile(path,'utf8'),raw);
    for (const previous of [{...failure,excludedFromComparison:true},{...failure,appRevision:'other'},{...failure,outcome:'pass'}]) {
      const evidence = JSON.stringify(previous);
      await writeFile(path,evidence);
      await assert.rejects(readResumeRecords(output,[cell],runtime,fixture,'environment'),/preserve it/);
      assert.equal(await readFile(path,'utf8'),evidence);
    }
    await writeFile(path,'malformed retained evidence');
    await assert.rejects(readResumeRecords(output,[cell],runtime,fixture,'environment'),/malformed/);
    assert.equal(await readFile(path,'utf8'),'malformed retained evidence');
    await rm(path);
    assert.deepEqual(await readResumeRecords(output,[cell],runtime,fixture,'environment'),[]);
  } finally { await rm(output,{recursive:true}); }
});
