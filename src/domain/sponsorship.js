// Sponsorship type. Self-paid posts are a Special Case object (NoSponsorship), so callers
// ask `requiresDisclosure` instead of comparing against '내돈내산'.

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

  static from(type) {
    if (type === SELF_PAID) return new NoSponsorship();
    return new Sponsorship(type || DEFAULT_SPONSORSHIP);
  }

  get requiresDisclosure() { return true; }

  // Unknown types still get a disclosure, using the default wording.
  get disclosure() { return DISCLOSURES[this.type] ?? DISCLOSURES[DEFAULT_SPONSORSHIP]; }
}

export class NoSponsorship extends Sponsorship {
  constructor() { super(SELF_PAID); }

  get requiresDisclosure() { return false; }

  get disclosure() { return null; }
}
