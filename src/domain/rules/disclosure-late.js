import { finding } from './finding.js';
import { findDisclosure } from './disclosure.js';

export const disclosureLateRule = {
  id: 'disclosure-late',
  check({ text, sponsorship }, policy) {
    if (!sponsorship.requiresDisclosure) return null;
    const disclosure = findDisclosure(text, policy);
    if (!disclosure || disclosure.index < policy.draft.disclosureWithinChars) return null;
    return finding(this.id, policy, `대가성 표시가 글 뒤쪽(${disclosure.index}자 위치)에 있습니다. 제목 아래 첫 문단 안으로 옮기세요.`);
  },
};
