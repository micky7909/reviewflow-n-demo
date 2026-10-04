// Unit tests for the domain modules. They import pure functions directly: no DOM, no harness.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkAudit, scoreAudit, renderAuditReport } from '../src/domain/audit.js';
import { normalizeBlogInput, ensureKeyword } from '../src/domain/blog.js';
import { parseShots, applyReelEdits } from '../src/domain/reels.js';

const longDraft = '사진과 리뷰를 포함한 협찬 후기입니다. '.repeat(30);

test('checkAudit returns findings in rule order with penalties', () => {
  const { keywordCount, findings } = checkAudit({ text: 'AI 짧은 글', keyword: '글', sponsorship: '체험단 제공 있음' });
  assert.equal(keywordCount, 1);
  assert.deepEqual(findings.map(f => f.penalty), [25, 10, 15, 10]);
});

test('checkAudit finds nothing for a long disclosed draft with evidence', () => {
  assert.deepEqual(checkAudit({ text: longDraft, keyword: '부산역', sponsorship: '체험단 제공 있음' }).findings, []);
});

test('checkAudit flags more than 9 keyword repeats', () => {
  const { keywordCount, findings } = checkAudit({ text: longDraft, keyword: '협찬', sponsorship: '내돈내산' });
  assert.equal(keywordCount, 30);
  assert.deepEqual(findings.map(f => f.penalty), [12]);
});

test('scoreAudit subtracts penalties from 100 and floors at 0', () => {
  assert.equal(scoreAudit([]), 100);
  assert.equal(scoreAudit([{ penalty: 25 }, { penalty: 10 }]), 65);
  assert.equal(scoreAudit(Array(5).fill({ penalty: 25 })), 0);
});

test('renderAuditReport shows a low-risk note when there are no findings', () => {
  const report = renderAuditReport({ score: 100, keywordCount: 3, findings: [] });
  assert.match(report, /Naver-fit 점수: 100\/100/);
  assert.match(report, /1\. 큰 리스크는 낮습니다/);
});

test('normalizeBlogInput trims, defaults the brand and clamps the target', () => {
  const base = { brand: '  ', keyword: ' 키워드 ', memo: ' 메모 ' };
  assert.deepEqual(normalizeBlogInput({ ...base, target: '7' }), { brand: '업체명', keyword: '키워드', target: 7, memo: '메모' });
  assert.equal(normalizeBlogInput({ ...base, target: '100000' }).target, 12);
  assert.equal(normalizeBlogInput({ ...base, target: '-3' }).target, 1);
  assert.equal(normalizeBlogInput({ ...base, target: '' }).target, 7);
});

test('ensureKeyword leaves text alone without a keyword or target', () => {
  assert.equal(ensureKeyword('본문', '', 7), '본문');
  assert.equal(ensureKeyword('본문', '키워드', 0), '본문');
});

test('parseShots splits on commas and drops blanks', () => {
  assert.deepEqual(parseShots('외관, 입구,, 관리실 '), ['외관', '입구', '관리실']);
});

test('applyReelEdits returns a new variant and keeps the original', () => {
  const original = { id: 'A', name: '감성', hook: '원래', scenes: ['a'], caption: 'c' };
  const edited = applyReelEdits(original, { hook: '새 훅', scenesText: 'x\n\ny', caption: '새 캡션' });
  assert.deepEqual(edited.scenes, ['x', 'y']);
  assert.equal(edited.hook, '새 훅');
  assert.equal(original.hook, '원래');
});
