// Sponsorship type, replacing the raw select string and the `!== '내돈내산'` comparisons.

const DISCLOSURES = {
  '체험단 제공 있음': '※ 본 포스팅은 체험단을 통해 서비스를 제공받아 직접 체험 후 작성한 후기입니다.',
  '원고료 제공': '※ 본 포스팅은 업체로부터 원고료를 받아 작성한 후기입니다.',
  '제품 제공': '※ 본 포스팅은 업체로부터 제품을 제공받아 직접 사용 후 작성한 후기입니다.',
};

export const SELF_PAID = '내돈내산';
export const DEFAULT_SPONSORSHIP = '체험단 제공 있음';

export class Sponsorship {
  constructor(type) {
    this.type = type;
    Object.freeze(this);
  }

  static from(type) { return new Sponsorship(type || DEFAULT_SPONSORSHIP); }

  // Unknown types are treated as sponsored, matching the original check.
  get requiresDisclosure() { return this.type !== SELF_PAID; }

  get disclosure() {
    if (!this.requiresDisclosure) return null;
    return DISCLOSURES[this.type] ?? DISCLOSURES[DEFAULT_SPONSORSHIP];
  }
}
