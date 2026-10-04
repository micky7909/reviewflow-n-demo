// Reels A/B/C plans: build variants, apply edits, format the script.

export function parseShots(shotsText) {
  return shotsText.split(',').map(s => s.trim()).filter(Boolean);
}

// KNOWN ISSUE: shots are picked by position, so reordering the input changes their meaning.
export function buildReelVariants({ topic, point, shots }) {
  return [
    {
      id: 'A', name: '감성 브이로그형', tag: '분위기',
      hook: `${topic}, 분위기부터 보고 고르는 분들께`,
      scenes: [shots[0] || '외관', shots[1] || '입구', shots[3] || '공간', shots[5] || '체험 장면', '마무리 후기'],
      caption: `실제로 머물렀을 때의 분위기와 동선을 중심으로 정리했습니다. ${point}`,
    },
    {
      id: 'B', name: '정보 요약형', tag: '저장각',
      hook: `${topic} 핵심 정보만 빠르게 정리`,
      scenes: [shots[0] || '위치', '가격/제공내역', '예약 조건', '필수 리뷰', '체크리스트'],
      caption: `방문 전에 헷갈리기 쉬운 조건만 모았습니다. ${point}`,
    },
    {
      id: 'C', name: '후킹 저장유도형', tag: 'CTA',
      hook: '여기 갈 사람은 이 조건부터 확인하세요',
      scenes: ['문제 제기', shots[0] || '장소 컷', shots[2] || '동선 컷', shots[5] || '핵심 장면', '저장 유도'],
      caption: `놓치면 곤란한 방문 조건과 실제 체험 포인트를 한 번에 정리했습니다. ${point}`,
    },
  ];
}

export function applyReelEdits(variant, { hook, scenesText, caption }) {
  return { ...variant, hook, scenes: scenesText.split('\n').filter(Boolean), caption };
}

export function formatReelScript(variant, cta) {
  return `[Dr.포스팅 릴스 처방 ${variant.id}안 · ${variant.name}]\n\n첫 2초 훅:\n${variant.hook}\n\n컷 구성:\n${variant.scenes.map((s, i) => `${i + 1}. ${s}`).join('\n')}\n\n캡션:\n${variant.caption}\n\nCTA:\n${cta}`;
}

/** Holds the generated variants and the one being edited. Replaces two loose globals. */
export class ReelSession {
  #variants = [];
  #selected = null;

  get variants() { return this.#variants; }

  get selected() { return this.#selected; }

  generate(input) {
    this.#variants = buildReelVariants(input);
    return this.#variants;
  }

  // Editing works on a copy, so the card list keeps the generated version.
  choose(index) {
    this.#selected = structuredClone(this.#variants[index]);
    return this.#selected;
  }

  edit(edits) {
    if (!this.#selected) return null;
    this.#selected = applyReelEdits(this.#selected, edits);
    return this.#selected;
  }
}
