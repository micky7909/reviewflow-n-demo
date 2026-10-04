import { finding } from './finding.js';
import { findPlaceholders } from '../document.js';

export const placeholderRule = {
  id: 'placeholder',
  check({ text }, policy) {
    const found = findPlaceholders(text, policy.patterns.placeholder);
    if (!found.length) return null;
    return finding(this.id, policy, `채우지 않은 자리표시자가 있습니다: ${found.join(', ')}. 발행 전에 실제 내용으로 바꾸세요.`);
  },
};
