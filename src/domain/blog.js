// Blog draft generation. A Draft keeps title, body and disclosure apart so later
// rules can check each part; draftToText joins them for display.
import { countKeyword } from './keyword.js';

// KNOWN BUG: appends stock sentences to reach the target count (keyword stuffing),
// and always uses the particle 를. Replaced by a count rule + repair step in phase 5.
export function ensureKeyword(text, keyword, target) {
  if (!keyword || !(target > 0)) return text;
  const lines = [
    `그래서 ${keyword}를 찾는 분들이라면 한 번쯤 후보로 넣어볼 만했습니다.`,
    `특히 위치와 조건을 같이 보는 분들에게는 ${keyword}로 참고하기 좋겠습니다.`,
    `이런 부분 때문에 ${keyword}를 알아보는 분들께도 무난한 선택지처럼 느껴졌습니다.`,
    `결국 ${keyword}에서 중요한 건 실제로 불편하지 않은지인데, 그 기준에는 꽤 잘 맞았습니다.`,
  ];
  for (let i = 0; countKeyword(text, keyword) < target; i++) text += `\n\n${lines[i % lines.length]}`;
  return text;
}

/**
 * @param {ReturnType<import('./campaign.js').createCampaignSpec>} spec
 * @param {string} memo
 */
export function buildDraft(spec, memo) {
  const { brand, keyword, keywordTarget, sponsorship } = spec;
  const title = `${keyword} ${brand}, 직접 다녀온 후기`;
  let body = `[오히려좋아 배너 이미지 상단 삽입]\n[협찬 문구 원문 상단 삽입]\n\n${brand}에 다녀왔습니다.\n\n요즘 체험단 글은 맛있다, 좋았다만 쓰면 끝나는 게 아니더라고요.\n키워드, 사진 수, 현장 리뷰, 협찬 문구까지 챙길 게 많아서 오히려 조건 관리가 더 중요합니다.\n\n---\n\n■ 첫인상\n\n${memo.trim()}\n\n저는 이런 공간을 볼 때 과하게 포장된 설명보다 실제로 불편하지 않은지를 먼저 봅니다.\n찾기 쉬운지, 안내가 명확한지, 체험 조건이 헷갈리지 않는지 같은 부분이요.\n\n---\n\n■ 총평\n\n${brand}은 체험단 글로 정리할 때 정보성, 실제 체험감, 체크리스트를 같이 잡아야 하는 곳이었습니다.`;
  // The title already contains the keyword once, so the body needs fewer repeats.
  body = ensureKeyword(body, keyword.text, keywordTarget - keyword.countIn(title));
  return Object.freeze({
    title,
    body,
    // KNOWN BUG: the blog tab has no sponsorship input, so this is always the default type.
    disclosure: sponsorship.disclosure,
    // KNOWN BUG: labelled "본문 키워드" but includes the title.
    keywordCount: keyword.countIn(title) + keyword.countIn(body),
    keywordTarget,
  });
}

export function draftToText(draft) {
  const disclosure = draft.disclosure ? `\n\n---\n\n${draft.disclosure}` : '';
  return `${draft.title}\n\n${draft.body}${disclosure}\n\n[Dr.포스팅 검증] 본문 키워드 ${draft.keywordCount}회 / 목표 ${draft.keywordTarget}회`;
}
