// Policy pack: every threshold, penalty and pattern the audit uses, in one versioned place.
// Rules read from here instead of holding magic numbers. Bump `version` on any change so
// a report can be traced back to the policy it was judged against.

function deepFreeze(value) {
  if (value && typeof value === 'object' && !(value instanceof RegExp)) {
    Object.values(value).forEach(deepFreeze);
    Object.freeze(value);
  }
  return value;
}

export const POLICY_PACK = deepFreeze({
  version: '2026-10-04',

  draft: {
    minLength: 500,
    // Used when no campaign target is known (manual audit).
    keywordMaxRepeats: 9,
    // With a target, up to this many extra repeats are tolerated.
    keywordOverTolerance: 2,
    // The disclosure must start within this many characters of the text.
    disclosureWithinChars: 300,
  },

  penalties: {
    'disclosure-missing': 25,
    'disclosure-late': 10,
    placeholder: 10,
    'keyword-count': 12,
    length: 15,
    evidence: 10,
  },

  patterns: {
    // Unfilled template slots such as [협찬 문구 원문 상단 삽입].
    placeholder: /\[[^\]\n]*(삽입|입력|넣기|붙여넣기)[^\]\n]*\]/g,
    disclosureHashtag: /#(광고|협찬|제공|체험단)/,
    disclosureSubject: /(협찬|원고료|제공|지원|광고|대가|체험단)/,
    // Receiving something is what makes a sentence a disclosure, not just mentioning 협찬.
    disclosureReceipt: /(받아|받고|받은|받았|제공받|지원받)/,
    evidence: /(리뷰|사진|동영상|움짤|카카오맵|구글|영수증)/,
    // Sentence-level cues that a text gives instructions (a campaign notice).
    directive: /(삽입|필수|부탁|반복|자제|해\s*주세요|바랍니다|기재|첨부|업로드|금지|이상\s*(작성|등록|첨부))/,
  },

  notice: {
    // A text is a notice when at least this many sentences are directives...
    minDirectives: 2,
    // ...and directives make up at least this share of its sentences.
    minDirectiveShare: 0.5,
    keywordCount: /키워드[^.\n]{0,20}?(\d+)\s*(번|회)/,
    topics: [
      { id: 'keyword', label: '키워드', pattern: /키워드/ },
      { id: 'disclosure', label: '협찬 표시', pattern: /(협찬|대가성|광고)\s*(문구|표시|배너)?/ },
      { id: 'banner', label: '배너', pattern: /(배너|오히려좋아)/ },
      { id: 'review', label: '현장 리뷰', pattern: /(현장\s*리뷰|리뷰\s*작성|영수증\s*리뷰|플레이스\s*리뷰)/ },
      { id: 'photo', label: '사진', pattern: /(사진|이미지)/ },
      { id: 'video', label: '영상', pattern: /(동영상|영상|움짤|클립|릴스)/ },
      { id: 'ai', label: 'AI 활용', pattern: /AI/ },
    ],
  },
});

/** Fails fast if a rule has no penalty or a value has the wrong type. */
export function validatePolicyPack(pack, ruleIds) {
  if (typeof pack.version !== 'string' || !pack.version) throw new Error('policy pack: version is required');
  for (const id of ruleIds) {
    const penalty = pack.penalties[id];
    if (!(Number.isFinite(penalty) && penalty > 0)) throw new Error(`policy pack: penalty for "${id}" must be a positive number`);
  }
  for (const [key, value] of Object.entries(pack.draft)) {
    if (!(Number.isFinite(value) && value >= 0)) throw new Error(`policy pack: draft.${key} must be a non-negative number`);
  }
  return pack;
}
