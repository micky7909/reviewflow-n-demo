// Runs the regression dataset. Cases scheduled for a later refactoring phase are
// registered as `todo` so they stay visible in the report without failing CI.
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import { Worker } from 'node:worker_threads';

const cases = JSON.parse(readFileSync(new URL('./fixtures/regressions.json', import.meta.url), 'utf8'));
const CURRENT_PHASE = 4;
const TIMEOUT_MS = 2000;

function runCase({ id, input }) {
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL('./regression-worker.mjs', import.meta.url), { workerData: { id, input } });
    const timer = setTimeout(() => {
      worker.terminate();
      reject(new Error(`timed out after ${TIMEOUT_MS}ms (likely an infinite loop)`));
    }, TIMEOUT_MS);
    worker.once('message', result => {
      clearTimeout(timer);
      worker.terminate();
      result.ok ? resolve() : reject(new Error(result.message));
    });
    worker.once('error', error => { clearTimeout(timer); reject(error); });
  });
}

for (const c of cases) {
  const todo = c.phase > CURRENT_PHASE ? `scheduled for refactoring phase ${c.phase}` : false;
  test(`regression: ${c.id}`, { todo }, () => runCase(c));
}
