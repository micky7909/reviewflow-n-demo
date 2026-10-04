// Characterization tests: pin the CURRENT behavior of index.html before refactoring.
// Some expectations here encode known bugs on purpose (marked "KNOWN BUG"); they are
// changed deliberately in refactoring phase 4, not silently along the way.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { loadApp } from './harness.mjs';
import { countKeyword } from '../src/domain/keyword.js';

function snapshot(name, actual) {
  const file = new URL(`./__snapshots__/${name}.txt`, import.meta.url);
  if (process.env.UPDATE_SNAPSHOTS || !existsSync(file)) writeFileSync(file, actual);
  assert.equal(actual, readFileSync(file, 'utf8'), `snapshot ${name} changed (UPDATE_SNAPSHOTS=1 to accept)`);
}

test('countKeyword counts literal occurrences, escaping regex characters', () => {
  assert.equal(countKeyword('a.b a.b axb', 'a.b'), 2);
  assert.equal(countKeyword('부산역 마사지, 부산역 마사지', '부산역 마사지'), 2);
  assert.equal(countKeyword('text', ''), 0);
});

test('auditPolicy on the default notice scores 75', () => {
  const app = loadApp();
  app.call('auditPolicy');
  const out = app.$('auditOut').textContent;
  // KNOWN BUG: the 67-char notice is scored as if it were a draft (-15 length penalty).
  assert.match(out, /Naver-fit 점수: 75\/100/);
  assert.match(out, /키워드 반복: 0회/);
  snapshot('audit-default', out);
});

test('auditPolicy penalizes missing disclosure for sponsored posts', () => {
  const app = loadApp();
  app.$('auditText').value = '그냥 다녀온 후기입니다. 사진 첨부.';
  app.call('auditPolicy');
  assert.match(app.$('auditOut').textContent, /Naver-fit 점수: 60\/100/);
  assert.match(app.$('auditOut').textContent, /대가성 표시가 약합니다/);
});

test('auditPolicy skips disclosure check for 내돈내산', () => {
  const app = loadApp();
  app.$('auditText').value = '그냥 다녀온 후기입니다. 사진 첨부.';
  app.$('auditSpon').value = '내돈내산';
  app.call('auditPolicy');
  assert.doesNotMatch(app.$('auditOut').textContent, /대가성 표시가 약합니다/);
});

test('genBlog output with default inputs is stable', () => {
  const app = loadApp();
  app.call('genBlog');
  const out = app.$('blogOut').textContent;
  assert.match(out, /본문 키워드 7회 \/ 목표 7회/);
  snapshot('blog-default', out);
});

test('auditFromBlog copies the draft and keyword into the audit tab', () => {
  const app = loadApp();
  app.call('genBlog');
  app.call('auditFromBlog');
  assert.equal(app.$('auditText').value, app.$('blogOut').textContent);
  assert.equal(app.$('auditKw').value, app.$('mainKw').value);
  assert.match(app.$('auditOut').textContent, /키워드 반복: 7회/);
});

test('genReels builds A/B/C variants from comma-separated shots', () => {
  const app = loadApp();
  app.call('genReels');
  const ids = app.state.variants.map(v => v.id).join('');
  assert.equal(ids, 'ABC');
  assert.deepEqual([...app.state.variants[0].scenes], ['외관', '호텔 입구', '관리실', '마사지 장면', '마무리 후기']);
  snapshot('reels-cards', app.$('reelCards').innerHTML);
});

test('chooseReel + applyCustom renders the edited script', () => {
  const app = loadApp();
  app.call('genReels');
  app.call('chooseReel', 1);
  app.$('editHook').value = '수정된 훅';
  app.call('applyCustom');
  assert.equal(app.state.selected.id, 'B');
  assert.match(app.$('reelScript').textContent, /첫 2초 훅:\n수정된 훅/);
});

test('joinWaitlist stores one record in localStorage', () => {
  const app = loadApp();
  app.call('joinWaitlist');
  const saved = JSON.parse(app.storage.get('drposting_waitlist'));
  assert.equal(saved.name, '데이엔');
  assert.equal(saved.use, '체험단 블로그 작성');
});
