// Characterization tests: pin the CURRENT behavior of index.html before refactoring.
// Expectations change only on purpose, in the phase that changes the behavior.
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

// Phase 4: the default text is a notice, so it is listed as conditions instead of scored.
test('auditPolicy lists the default notice as conditions without a score', () => {
  const app = loadApp();
  app.call('auditPolicy');
  const out = app.$('auditOut').textContent;
  assert.match(out, /입력 종류: 체험단 공지/);
  assert.match(out, /\[공지 조건 5개\]/);
  assert.match(out, /키워드 반복 목표를 7회로/);
  assert.doesNotMatch(out, /Naver-fit 점수/);
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
  assert.match(app.$('auditOut').textContent, /키워드 반복: 7회 \/ 목표 7회/);
  // A fresh draft still has template slots to fill before publishing.
  assert.match(app.$('auditOut').textContent, /Naver-fit 점수: 90\/100/);
  assert.match(app.$('auditOut').textContent, /자리표시자/);
});

test('genBlog for a self-paid post has no disclosure or sponsorship slot', () => {
  const app = loadApp();
  app.$('blogSpon').value = '내돈내산';
  app.call('genBlog');
  const out = app.$('blogOut').textContent;
  assert.doesNotMatch(out, /※ 본 포스팅은/);
  assert.doesNotMatch(out, /\[협찬 문구 원문 상단 삽입\]/);
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

// Phase 3: auditFromBlog reads the last generated draft, not the blog tab's inputs.
test('auditFromBlog without a draft asks for one and leaves the audit untouched', () => {
  const app = loadApp();
  const before = app.$('auditText').value;
  app.call('auditFromBlog');
  assert.equal(app.$('auditText').value, before);
  assert.equal(app.$('toast').textContent, '먼저 초안을 만드세요');
});

test('auditFromBlog audits with the campaign the draft was built from', () => {
  const app = loadApp();
  app.call('genBlog');
  app.$('mainKw').value = '나중에 바꾼 키워드';
  app.$('auditSpon').value = '내돈내산';
  app.call('auditFromBlog');
  assert.equal(app.$('auditKw').value, '부산역 마사지 잘하는 곳');
  assert.equal(app.$('auditSpon').value, '체험단 제공 있음');
  assert.match(app.$('auditOut').textContent, /키워드 반복: 7회/);
});
