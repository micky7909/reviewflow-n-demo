// Runs one regression case in a worker thread, so a case that loops forever
// can be terminated by the parent instead of hanging the test run.
import { parentPort, workerData } from 'node:worker_threads';
import assert from 'node:assert/strict';
import { loadApp } from './harness.mjs';

const checks = {
  'empty-keyword-hang'(app) {
    app.call('genBlog');
    assert.doesNotMatch(app.$('blogOut').textContent, /후보로 넣어볼 만했습니다/);
  },
  'huge-keyword-target'(app) {
    app.call('genBlog');
    assert.match(app.$('blogOut').textContent, /목표 12회/);
  },
  'placeholder-disclosure'(app) {
    app.call('auditPolicy');
    assert.match(app.$('auditOut').textContent, /대가성 표시가 약합니다/);
  },
  'notice-scored-as-draft'(app) {
    app.call('auditPolicy');
    assert.doesNotMatch(app.$('auditOut').textContent, /정보량이 부족합니다/);
  },
  'fixed-object-particle'(app) {
    app.call('genBlog');
    assert.doesNotMatch(app.$('blogOut').textContent, /곳를/);
  },
};

const { id, input } = workerData;
try {
  const app = loadApp();
  for (const [field, value] of Object.entries(input)) app.$(field).value = value;
  checks[id](app);
  parentPort.postMessage({ ok: true });
} catch (error) {
  parentPort.postMessage({ ok: false, message: error.message });
}
