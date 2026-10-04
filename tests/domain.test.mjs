// Unit tests for the domain modules. They import pure functions directly: no DOM, no harness.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { auditPosting, checkAudit, scoreAudit, renderAuditReport } from '../src/domain/audit.js';
import { detectInputKind, extractNoticeConditions } from '../src/domain/notice.js';
import { POLICY_PACK, validatePolicyPack } from '../src/domain/policy-pack.js';
import { DRAFT_RULES } from '../src/domain/rules/index.js';
import { buildDraft, draftToText, ensureKeyword } from '../src/domain/blog.js';
import { createCampaignSpec } from '../src/domain/campaign.js';
import { Keyword } from '../src/domain/keyword.js';
import { withObject, withTopic, withDirection } from '../src/domain/korean.js';
import { Sponsorship, NoSponsorship } from '../src/domain/sponsorship.js';
import { parseShots, applyReelEdits, ReelSession } from '../src/domain/reels.js';

const DISCLOSURE = '※ 본 포스팅은 체험단을 통해 서비스를 제공받아 작성한 후기입니다.';
const filler = '사진과 리뷰를 곁들여 다녀온 곳을 정리했습니다. '.repeat(20);
const longDraft = `제목 줄\n${DISCLOSURE}\n${filler}`;
const audit = (text, keyword, sponsorship = '체험단 제공 있음', keywordTarget = null) =>
  checkAudit({ text, keyword: new Keyword(keyword), sponsorship: Sponsorship.from(sponsorship), keywordTarget });
const ids = result => result.findings.map(f => f.ruleId);

test('checkAudit returns findings in rule order with policy penalties', () => {
  const { findings } = audit('AI 짧은 글', '글');
  assert.deepEqual(findings.map(f => [f.ruleId, f.penalty]), [['disclosure-missing', 25], ['length', 15], ['evidence', 10]]);
});

test('checkAudit finds nothing for a long draft disclosed at the top', () => {
  assert.deepEqual(audit(longDraft, '부산역').findings, []);
});

test('disclosure placeholders and passing mentions of 협찬 are not a disclosure', () => {
  assert.deepEqual(ids(audit(`제목\n[협찬 문구 원문 상단 삽입]\n${filler}`, '부산역')), ['disclosure-missing', 'placeholder']);
  assert.deepEqual(ids(audit(`제목\n협찬 문구까지 챙길 게 많았습니다.\n${filler}`, '부산역')), ['disclosure-missing']);
  assert.deepEqual(ids(audit(`제목\n#광고\n${filler}`, '부산역')), []);
});

test('a disclosure far down the text is flagged as late', () => {
  assert.deepEqual(ids(audit(`제목\n${filler}\n${DISCLOSURE}`, '부산역')), ['disclosure-late']);
});

test('self-paid posts need no disclosure', () => {
  assert.deepEqual(ids(audit(`제목\n${filler}`, '부산역', '내돈내산')), []);
});

test('keyword count is checked against the campaign target when known', () => {
  const draft = n => `${'키워드 '.repeat(5)}제목\n${DISCLOSURE}\n${filler}${'키워드 '.repeat(n)}`;
  assert.equal(audit(draft(7), '키워드', undefined, 7).keywordCount, 7, 'title is not counted');
  assert.deepEqual(ids(audit(draft(7), '키워드', undefined, 7)), []);
  assert.deepEqual(ids(audit(draft(9), '키워드', undefined, 7)), [], 'within tolerance');
  assert.match(audit(draft(5), '키워드', undefined, 7).findings[0].note, /목표보다 적습니다\(5\/7회\)/);
  assert.match(audit(draft(10), '키워드', undefined, 7).findings[0].note, /반복이 많습니다/);
  assert.deepEqual(ids(audit(draft(9), '키워드')), [], 'no target: up to 9 allowed');
  assert.deepEqual(ids(audit(draft(10), '키워드')), ['keyword-count']);
});

test('detectInputKind tells notices from drafts', () => {
  assert.equal(detectInputKind('오히려좋아 배너 상단 삽입. 협찬 문구 삽입. 키워드 본문 7번 반복. 현장 리뷰 필수.', POLICY_PACK), 'notice');
  assert.equal(detectInputKind('[협찬 문구 원문 상단 삽입]\n오늘 다녀온 곳 후기입니다.', POLICY_PACK), 'draft');
  assert.equal(detectInputKind(longDraft, POLICY_PACK), 'draft');
  assert.equal(detectInputKind('', POLICY_PACK), 'draft');
});

test('extractNoticeConditions quotes each directive and reads the keyword target', () => {
  const notice = extractNoticeConditions('키워드 본문 7번 반복. 사진 15장 이상 첨부. AI 활용은 자제 부탁드립니다. 맛있게 드세요.', POLICY_PACK);
  assert.equal(notice.keywordTarget, 7);
  assert.equal(notice.aiRestricted, true);
  assert.deepEqual(notice.conditions.map(c => [c.topic, c.text]), [
    ['keyword', '키워드 본문 7번 반복'], ['photo', '사진 15장 이상 첨부'], ['ai', 'AI 활용은 자제 부탁드립니다'],
  ]);
});

test('auditPosting reports a notice without a score', () => {
  const result = auditPosting({ text: '협찬 문구 삽입. 현장 리뷰 필수.', keyword: new Keyword(''), sponsorship: Sponsorship.from('') });
  assert.equal(result.kind, 'notice');
  assert.equal(result.score, undefined);
  assert.match(result.report, /정책팩 2026-10-04/);
});

test('validatePolicyPack rejects a rule without a penalty', () => {
  assert.doesNotThrow(() => validatePolicyPack(POLICY_PACK, DRAFT_RULES.map(r => r.id)));
  assert.throws(() => validatePolicyPack(POLICY_PACK, ['new-rule']), /penalty for "new-rule"/);
  assert.throws(() => validatePolicyPack({ ...POLICY_PACK, version: '' }, []), /version/);
  assert.ok(Object.isFrozen(POLICY_PACK.penalties));
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
  assert.match(renderAuditReport({ score: 90, keywordCount: 7, keywordTarget: 7, findings: [] }), /7회 \/ 목표 7회 \(본문 기준\)/);
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
  assert.ok(Sponsorship.from('내돈내산') instanceof NoSponsorship);
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
  assert.equal(new Keyword('맛집').countIn(draft.body), 5, 'target counts the body only');
  assert.match(draft.body, /■ 첫인상\n\n메모\n/);
  assert.match(draftToText(draft), /^맛집 가게, 직접 다녀온 후기\n\n※ 본 포스팅은 체험단을 통해[^\n]*\n\n\[오히려좋아/);
  const selfPaid = buildDraft(createCampaignSpec({ brand: '가게', keyword: '맛집', keywordTarget: 5, sponsorship: '내돈내산' }), '');
  assert.equal(selfPaid.disclosure, null);
  assert.doesNotMatch(selfPaid.body, /협찬 문구 원문/);
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
