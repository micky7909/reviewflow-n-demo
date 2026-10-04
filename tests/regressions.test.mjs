// Runs the regression dataset. Cases scheduled for a later refactoring phase are
// registered as `todo` so they stay visible in the report without failing CI.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { loadApp } from './harness.mjs';

const cases = JSON.parse(readFileSync(new URL('./fixtures/regressions.json', import.meta.url), 'utf8'));
const CURRENT_PHASE = 1;

const checks = {
  'empty-keyword-hang'(app) {
    app.call('genBlog');
    const out = app.$('blogOut').textContent;
    assert.doesNotMatch(out, /후보로 넣어볼 만했습니다/);
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

for (const c of cases) {
  const todo = c.phase > CURRENT_PHASE ? `scheduled for refactoring phase ${c.phase}` : false;
  test(`regression: ${c.id}`, { todo }, () => {
    const app = loadApp({ timeout: 2000 });
    for (const [id, value] of Object.entries(c.input)) app.$(id).value = value;
    checks[c.id](app);
  });
}
