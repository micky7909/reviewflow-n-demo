// Audit rules, applied in this order (the order is visible in the report).
// Each rule gets the audit input and precomputed facts, and says whether it fails.

/** @typedef {{text: string, keyword: import('./keyword.js').Keyword, sponsorship: import('./sponsorship.js').Sponsorship}} AuditInput */
/** @typedef {{keywordCount: number}} AuditFacts */

export const AUDIT_RULES = [
  {
    id: 'disclosure',
    penalty: 25,
    note: '대가성 표시가 약합니다. 제목 아래 또는 첫 문단 근처에 명확히 넣으세요.',
    // KNOWN BUG: any of these words passes, including disclosure placeholders.
    fails: ({ text, sponsorship }) => sponsorship.requiresDisclosure && !/(협찬|제공|체험단|원고료|광고|대가성)/.test(text),
  },
  {
    id: 'ai-usage',
    penalty: 10,
    note: 'AI 활용 자제 안내가 있습니다. 실제 체험 메모를 충분히 넣고 직접 수정해야 합니다.',
    // KNOWN BUG: matches the letters "AI" anywhere, so a notice and a draft are not told apart.
    fails: ({ text }) => /AI 활용은 자제|AI/.test(text),
  },
  {
    id: 'keyword-overuse',
    penalty: 12,
    note: '키워드 반복이 많습니다. 지정 횟수는 맞추되 문장 흐름을 자연스럽게 정리하세요.',
    // KNOWN BUG: fixed threshold, ignores the campaign's target count.
    fails: (_input, { keywordCount }) => keywordCount > 9,
  },
  {
    id: 'length',
    penalty: 15,
    note: '정보량이 부족합니다. 위치, 가격, 예약 조건, 사진 포인트, 실제 체험감을 보강하세요.',
    // KNOWN BUG: also applied to short campaign notices.
    fails: ({ text }) => text.length < 500,
  },
  {
    id: 'evidence',
    penalty: 10,
    note: '현장 리뷰/사진/영상 조건 체크가 필요합니다.',
    fails: ({ text }) => !/(리뷰|사진|동영상|움짤|카카오맵|구글|영수증)/.test(text),
  },
];
