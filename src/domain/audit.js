// Posting audit, split into phases: check → score → render.
// Parsing the raw input from the page happens in the UI layer.
import { AUDIT_RULES } from './rules.js';

const NO_RISK_NOTE = '큰 리스크는 낮습니다. 실제 방문 디테일과 사진 순서를 발행 전 반영하세요.';

/** @typedef {Readonly<{ruleId: string, penalty: number, note: string}>} Finding */

/** @param {import('./rules.js').AuditInput} input */
export function checkAudit(input, rules = AUDIT_RULES) {
  const facts = { keywordCount: input.keyword.countIn(input.text) };
  const findings = rules
    .filter(rule => rule.fails(input, facts))
    .map(rule => Object.freeze({ ruleId: rule.id, penalty: rule.penalty, note: rule.note }));
  return { ...facts, findings };
}

/** @param {Finding[]} findings */
export function scoreAudit(findings) {
  return Math.max(0, findings.reduce((score, f) => score - f.penalty, 100));
}

export function renderAuditReport({ score, keywordCount, findings }) {
  const notes = findings.length ? findings.map(f => f.note) : [NO_RISK_NOTE];
  return `[Dr.포스팅 진단표]\nNaver-fit 점수: ${score}/100\n키워드 반복: ${keywordCount}회\n\n[처방전]\n${notes.map((n, i) => `${i + 1}. ${n}`).join('\n')}\n\n[발행 원칙]\n- 노출 보장이 아니라 제한 리스크 감소가 목적입니다.\n- 대가성 표시는 독자가 쉽게 인식할 위치에 배치합니다.\n- 실제 체험 메모, 사진, 동선, 구체적 상황을 넣습니다.`;
}

/** @returns {{score: number, keywordCount: number, findings: Finding[], report: string}} */
export function auditPosting(input) {
  const { keywordCount, findings } = checkAudit(input);
  const score = scoreAudit(findings);
  return { score, keywordCount, findings, report: renderAuditReport({ score, keywordCount, findings }) };
}
