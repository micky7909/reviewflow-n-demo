// Posting audit, split into phases: check → score → render.
// Parsing the raw input from the page happens in the UI layer.
import { countKeyword } from './keyword.js';

const NO_RISK_NOTE = '큰 리스크는 낮습니다. 실제 방문 디테일과 사진 순서를 발행 전 반영하세요.';

// Rules run in this order; the order is visible in the report.
const RULES = [
  {
    penalty: 25,
    note: '대가성 표시가 약합니다. 제목 아래 또는 첫 문단 근처에 명확히 넣으세요.',
    // KNOWN BUG: any of these words passes, including disclosure placeholders.
    fails: ({ text, sponsorship }) => sponsorship !== '내돈내산' && !/(협찬|제공|체험단|원고료|광고|대가성)/.test(text),
  },
  {
    penalty: 10,
    note: 'AI 활용 자제 안내가 있습니다. 실제 체험 메모를 충분히 넣고 직접 수정해야 합니다.',
    // KNOWN BUG: matches the letters "AI" anywhere, so a notice and a draft are not told apart.
    fails: ({ text }) => /AI 활용은 자제|AI/.test(text),
  },
  {
    penalty: 12,
    note: '키워드 반복이 많습니다. 지정 횟수는 맞추되 문장 흐름을 자연스럽게 정리하세요.',
    // KNOWN BUG: fixed threshold, ignores the campaign's target count.
    fails: (_input, { keywordCount }) => keywordCount > 9,
  },
  {
    penalty: 15,
    note: '정보량이 부족합니다. 위치, 가격, 예약 조건, 사진 포인트, 실제 체험감을 보강하세요.',
    // KNOWN BUG: also applied to short campaign notices.
    fails: ({ text }) => text.length < 500,
  },
  {
    penalty: 10,
    note: '현장 리뷰/사진/영상 조건 체크가 필요합니다.',
    fails: ({ text }) => !/(리뷰|사진|동영상|움짤|카카오맵|구글|영수증)/.test(text),
  },
];

/** @param {{text: string, keyword: string, sponsorship: string}} input */
export function checkAudit(input) {
  const facts = { keywordCount: countKeyword(input.text, input.keyword) };
  const findings = RULES.filter(rule => rule.fails(input, facts)).map(({ penalty, note }) => ({ penalty, note }));
  return { ...facts, findings };
}

export function scoreAudit(findings) {
  return Math.max(0, findings.reduce((score, f) => score - f.penalty, 100));
}

export function renderAuditReport({ score, keywordCount, findings }) {
  const notes = findings.length ? findings.map(f => f.note) : [NO_RISK_NOTE];
  return `[Dr.포스팅 진단표]\nNaver-fit 점수: ${score}/100\n키워드 반복: ${keywordCount}회\n\n[처방전]\n${notes.map((n, i) => `${i + 1}. ${n}`).join('\n')}\n\n[발행 원칙]\n- 노출 보장이 아니라 제한 리스크 감소가 목적입니다.\n- 대가성 표시는 독자가 쉽게 인식할 위치에 배치합니다.\n- 실제 체험 메모, 사진, 동선, 구체적 상황을 넣습니다.`;
}

export function auditPosting(input) {
  const { keywordCount, findings } = checkAudit(input);
  return renderAuditReport({ score: scoreAudit(findings), keywordCount, findings });
}
