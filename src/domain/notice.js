// Tells a campaign notice from a draft, and lists a notice's conditions.
// This is a deterministic baseline; phase 5 can swap in an LLM extractor behind the same shape.
import { splitSentences } from './document.js';

export const INPUT_KIND = Object.freeze({ NOTICE: 'notice', DRAFT: 'draft' });

/** @returns {'notice'|'draft'} */
export function detectInputKind(text, policy) {
  const sentences = splitSentences(text);
  if (!sentences.length) return INPUT_KIND.DRAFT;
  const directives = sentences.filter(s => policy.patterns.directive.test(s)).length;
  const { minDirectives, minDirectiveShare } = policy.notice;
  return directives >= minDirectives && directives / sentences.length >= minDirectiveShare
    ? INPUT_KIND.NOTICE
    : INPUT_KIND.DRAFT;
}

/**
 * Each directive sentence becomes one condition, quoted from the notice so nothing is invented.
 * @returns {{keywordTarget: number|null, aiRestricted: boolean,
 *            conditions: {topic: string, label: string, text: string}[]}}
 */
export function extractNoticeConditions(text, policy) {
  const { topics, keywordCount } = policy.notice;
  const conditions = splitSentences(text)
    .filter(s => policy.patterns.directive.test(s))
    .map(sentence => {
      const topic = topics.find(t => t.pattern.test(sentence));
      return { topic: topic?.id ?? 'other', label: topic?.label ?? '기타', text: sentence };
    });
  const count = text.match(keywordCount);
  return {
    keywordTarget: count ? Number(count[1]) : null,
    aiRestricted: conditions.some(c => c.topic === 'ai'),
    conditions,
  };
}
