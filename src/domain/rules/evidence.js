import { finding } from './finding.js';

export const evidenceRule = {
  id: 'evidence',
  check({ text }, policy) {
    if (policy.patterns.evidence.test(text)) return null;
    return finding(this.id, policy, '현장 리뷰/사진/영상 조건 체크가 필요합니다.');
  },
};
