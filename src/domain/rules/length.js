import { finding } from './finding.js';

export const lengthRule = {
  id: 'length',
  check({ text }, policy) {
    if (text.length >= policy.draft.minLength) return null;
    return finding(this.id, policy, '정보량이 부족합니다. 위치, 가격, 예약 조건, 사진 포인트, 실제 체험감을 보강하세요.');
  },
};
