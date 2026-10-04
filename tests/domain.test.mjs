// Unit tests for the domain modules. They import pure functions directly: no DOM, no harness.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkAudit, scoreAudit, renderAuditReport } from '../src/domain/audit.js';
import { buildDraft, draftToText, ensureKeyword } from '../src/domain/blog.js';
import { createCampaignSpec } from '../src/domain/campaign.js';
import { Keyword } from '../src/domain/keyword.js';
import { withObject, withTopic, withDirection } from '../src/domain/korean.js';
import { Sponsorship } from '../src/domain/sponsorship.js';
import { parseShots, applyReelEdits, ReelSession } from '../src/domain/reels.js';

const longDraft = '사진과 리뷰를 포함한 협찬 후기입니다. '.repeat(30);
const audit = (text, keyword, sponsorship = '체험단 제공 있음') =>
  checkAudit({ text, keyword: new Keyword(keyword), sponsorship: Sponsorship.from(sponsorship) });

test('checkAudit returns findings in rule order with rule ids and penalties', () => {
  const { keywordCount, findings } = audit('AI 짧은 글', '글');
  assert.equal(keywordCount, 1);
  assert.deepEqual(findings.map(f => [f.ruleId, f.penalty]), [['disclosure', 25], ['ai-usage', 10], ['length', 15], ['evidence', 10]]);
});

test('checkAudit finds nothing for a long disclosed draft with evidence', () => {
  assert.deepEqual(audit(longDraft, '부산역').findings, []);
});

test('checkAudit flags more than 9 keyword repeats', () => {
  const { keywordCount, findings } = audit(longDraft, '협찬', '내돈내산');
  assert.equal(keywordCount, 30);
  assert.deepEqual(findings.map(f => f.ruleId), ['keyword-overuse']);
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

test('createCampaignSpec trims, defaults the brand and clamps the target', () => {
  const spec = createCampaignSpec({ brand: '  ', keyword: ' 키워드 ', keywordTarget: '7' });
  assert.equal(spec.brand, '업체명');
  assert.equal(spec.keyword.text, '키워드');
  assert.equal(spec.keywordTarget, 7);
  assert.equal(spec.sponsorship.type, '체험단 제공 있음');
  assert.equal(createCampaignSpec({ keywordTarget: '100000' }).keywordTarget, 12);
  assert.equal(createCampaignSpec({ keywordTarget: '-3' }).keywordTarget, 1);
  assert.equal(createCampaignSpec({ keywordTarget: '' }).keywordTarget, 7);
  assert.ok(Object.isFrozen(spec));
});

test('Keyword trims and counts literal occurrences', () => {
  const kw = new Keyword(' a.b ');
  assert.equal(kw.text, 'a.b');
  assert.equal(kw.countIn('a.b axb a.b'), 2);
  assert.ok(new Keyword('  ').isEmpty);
});

test('Sponsorship knows whether and how to disclose', () => {
  assert.equal(Sponsorship.from('내돈내산').requiresDisclosure, false);
  assert.equal(Sponsorship.from('내돈내산').disclosure, null);
  assert.match(Sponsorship.from('원고료 제공').disclosure, /원고료/);
  assert.match(Sponsorship.from('알 수 없음').disclosure, /체험단/);
  assert.equal(Sponsorship.from('').type, '체험단 제공 있음');
});

test('buildDraft keeps title, body and disclosure apart and meets the target', () => {
  const spec = createCampaignSpec({ brand: '가게', keyword: '맛집', keywordTarget: 5 });
  const draft = buildDraft(spec, ' 메모 ');
  assert.equal(draft.title, '맛집 가게, 직접 다녀온 후기');
  assert.equal(draft.keywordCount, 5);
  assert.match(draft.body, /■ 첫인상\n\n메모\n/);
  assert.match(draftToText(draft), /^맛집 가게, 직접 다녀온 후기\n\n\[오히려좋아/);
  assert.match(draftToText(draft), /※ 본 포스팅은 체험단을 통해/);
  assert.match(draft.body, /가게는 체험단 글로/);
});

test('ensureKeyword leaves text alone without a keyword or target', () => {
  assert.equal(ensureKeyword('본문', new Keyword(''), 7), '본문');
  assert.equal(ensureKeyword('본문', new Keyword('키워드'), 0), '본문');
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

test('ReelSession edits a copy of the chosen variant', () => {
  const session = new ReelSession();
  assert.equal(session.edit({ hook: 'x', scenesText: '', caption: '' }), null);
  session.generate({ topic: '주제', point: '포인트', shots: ['외관'] });
  session.choose(0);
  session.edit({ hook: '새 훅', scenesText: 'a', caption: 'c' });
  assert.equal(session.selected.hook, '새 훅');
  assert.equal(session.variants[0].hook, '주제, 분위기부터 보고 고르는 분들께');
});

test('Korean particles follow the final consonant', () => {
  assert.equal(withObject('잘하는 곳'), '잘하는 곳을');
  assert.equal(withObject('마사지'), '마사지를');
  assert.equal(withTopic('광장마사지'), '광장마사지는');
  assert.equal(withTopic('부산역'), '부산역은');
  assert.equal(withDirection('곳'), '곳으로');
  assert.equal(withDirection('마사지'), '마사지로');
  assert.equal(withDirection('서울'), '서울로');
  assert.equal(withObject('SPA'), 'SPA를');
});
