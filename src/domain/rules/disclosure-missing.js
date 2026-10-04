import { finding } from './finding.js';
import { findDisclosure } from './disclosure.js';

export const disclosureMissingRule = {
  id: 'disclosure-missing',
  check({ text, sponsorship }, policy) {
    if (!sponsorship.requiresDisclosure || findDisclosure(text, policy)) return null;
    return finding(this.id, policy, '대가성 표시가 약합니다. 제목 아래 또는 첫 문단 근처에 명확히 넣으세요.');
  },
};
