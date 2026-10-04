import { finding } from './finding.js';

export const keywordCountRule = {
  id: 'keyword-count',
  check({ keyword, keywordTarget }, policy, { keywordCount }) {
    if (keyword.isEmpty) return null;
    const { keywordMaxRepeats, keywordOverTolerance } = policy.draft;
    const max = keywordTarget == null ? keywordMaxRepeats : keywordTarget + keywordOverTolerance;
    if (keywordTarget != null && keywordCount < keywordTarget) {
      return finding(this.id, policy, `키워드가 목표보다 적습니다(${keywordCount}/${keywordTarget}회). 문맥에 맞게 자연스럽게 보강하세요.`);
    }
    if (keywordCount > max) {
      return finding(this.id, policy, '키워드 반복이 많습니다. 지정 횟수는 맞추되 문장 흐름을 자연스럽게 정리하세요.');
    }
    return null;
  },
};
