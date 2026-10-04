import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { canResume } from './matrix.mjs';

export async function readResumeRecords(output, cells, runtime, fixture, environmentId) {
  const records = [];
  for (const cell of cells) {
    let raw;
    try { raw = await readFile(join(output, `${cell.id}.json`), 'utf8'); }
    catch (error) { if (error.code === 'ENOENT') continue; throw error; }
    let previous;
    try { previous = JSON.parse(raw); }
    catch { throw new Error(`Existing cell ${cell.id} is malformed; preserve it and use a new output directory.`); }
    if (!canResume(previous, cell, runtime, fixture, environmentId)) {
      throw new Error(`Existing cell ${cell.id} is incompatible or excluded; preserve it and use a new output directory.`);
    }
    records.push(previous);
  }
  return records;
}
