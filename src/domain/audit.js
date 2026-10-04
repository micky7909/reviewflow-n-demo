// Posting audit. The input kind decides the path:
//   notice → extract conditions (no score)
//   draft  → check rules → score → render
// Parsing the raw input from the page happens in the UI layer.
import { POLICY_PACK, validatePolicyPack } from './policy-pack.js';
import { DRAFT_RULES } from './rules/index.js';
import { splitTitleBody } from './document.js';
import { INPUT_KIND, detectInputKind, extractNoticeConditions } from './notice.js';

validatePolicyPack(POLICY_PACK, DRAFT_RULES.map(r => r.id));

const NO_RISK_NOTE = '큰 리스크는 낮습니다. 실제 방문 디테일과 사진 순서를 발행 전 반영하세요.';
const PRINCIPLES = '[발행 원칙]\n- 노출 보장이 아니라 제한 리스크 감소가 목적입니다.\n- 대가성 표시는 독자가 쉽게 인식할 위치에 배치합니다.\n- 실제 체험 메모, 사진, 동선, 구체적 상황을 넣습니다.';

/**
 * @typedef {{text: string, keyword: import('./keyword.js').Keyword,
 *            sponsorship: import('./sponsorship.js').Sponsorship, keywordTarget?: number|null}} AuditInput
 */

/** Keywords are counted in the body only: a pasted draft's first line is its title. */
export function checkAudit(input, policy = POLICY_PACK, rules = DRAFT_RULES) {
  const context = { keywordTarget: null, ...input };
  const facts = { keywordCount: input.keyword.countIn(splitTitleBody(input.text).body) };
  const findings = rules.map(rule => rule.check(context, policy, facts)).filter(Boolean);
  return { ...facts, findings };
}

/** @param {import('./rules/finding.js').Finding[]} findings */
export function scoreAudit(findings) {
  return Math.max(0, findings.reduce((score, f) => score - f.penalty, 100));
}

export function renderAuditReport({ score, keywordCount, keywordTarget = null, findings, policyVersion = POLICY_PACK.version }) {
  const notes = findings.length ? findings.map(f => f.note) : [NO_RISK_NOTE];
  const target = keywordTarget == null ? '' : ` / 목표 ${keywordTarget}회`;
  return `[Dr.포스팅 진단표]\nNaver-fit 점수: ${score}/100\n키워드 반복: ${keywordCount}회${target} (본문 기준)\n\n[처방전]\n${notes.map((n, i) => `${i + 1}. ${n}`).join('\n')}\n\n${PRINCIPLES}\n\n정책팩 ${policyVersion}`;
}

export function renderNoticeReport({ keywordTarget, aiRestricted, conditions }, policyVersion = POLICY_PACK.version) {
  const list = conditions.map(c => `- [${c.label}] ${c.text}`).join('\n');
  const next = [
    keywordTarget != null && `- 초안 처방 탭에서 키워드 반복 목표를 ${keywordTarget}회로 맞추세요.`,
    aiRestricted && '- AI 활용 자제 캠페인입니다. 실제 체험 메모를 충분히 넣고 직접 수정하세요.',
    '- 초안을 쓴 뒤 이 탭에서 다시 진단하면 점수와 처방전이 나옵니다.',
  ].filter(Boolean).join('\n');
  return `[Dr.포스팅 진단표]\n입력 종류: 체험단 공지\n공지는 점수를 매기지 않습니다. 초안을 쓸 때 지킬 조건을 정리했습니다.\n\n[공지 조건 ${conditions.length}개]\n${list}\n\n[다음 단계]\n${next}\n\n${PRINCIPLES}\n\n정책팩 ${policyVersion}`;
}

/** @param {AuditInput} input */
export function auditPosting(input, policy = POLICY_PACK) {
  const kind = detectInputKind(input.text, policy);
  if (kind === INPUT_KIND.NOTICE) {
    const notice = extractNoticeConditions(input.text, policy);
    return { kind, notice, report: renderNoticeReport(notice, policy.version) };
  }
  const { keywordCount, findings } = checkAudit(input, policy);
  const score = scoreAudit(findings);
  const keywordTarget = input.keywordTarget ?? null;
  return {
    kind, score, keywordCount, findings,
    report: renderAuditReport({ score, keywordCount, keywordTarget, findings, policyVersion: policy.version }),
  };
}
