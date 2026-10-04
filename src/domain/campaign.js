// CampaignSpec: the facts about one campaign that every output must agree on.
import { Keyword } from './keyword.js';
import { Sponsorship } from './sponsorship.js';

const KEYWORD_TARGET_MIN = 1;
const KEYWORD_TARGET_MAX = 12;
const KEYWORD_TARGET_DEFAULT = 7;

export function clampKeywordTarget(raw) {
  const n = Math.round(Number(raw));
  return Math.min(KEYWORD_TARGET_MAX, Math.max(KEYWORD_TARGET_MIN, n || KEYWORD_TARGET_DEFAULT));
}

/**
 * @param {{brand?: string, keyword?: string, keywordTarget?: string|number, sponsorship?: string}} raw
 * @returns {Readonly<{brand: string, keyword: Keyword, keywordTarget: number, sponsorship: Sponsorship}>}
 */
export function createCampaignSpec({ brand = '', keyword = '', keywordTarget, sponsorship } = {}) {
  return Object.freeze({
    brand: brand.trim() || '업체명',
    keyword: new Keyword(keyword),
    keywordTarget: clampKeywordTarget(keywordTarget),
    sponsorship: Sponsorship.from(sponsorship),
  });
}
