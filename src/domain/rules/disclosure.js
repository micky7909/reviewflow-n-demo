import { removePlaceholders } from '../document.js';

/**
 * Finds the earliest real disclosure: a #광고-style hashtag, or a sentence that names the
 * sponsorship AND says something was received. Placeholders and passing mentions of 협찬
 * do not count. Indexes refer to the original text.
 * @returns {{index: number, sentence: string} | null}
 */
export function findDisclosure(text, policy) {
  const { placeholder, disclosureHashtag, disclosureSubject, disclosureReceipt } = policy.patterns;
  const clean = removePlaceholders(text, placeholder);
  const candidates = [];
  const hashtag = clean.match(disclosureHashtag);
  if (hashtag) candidates.push(hashtag[0]);
  const sentence = clean.split(/[.!?\n]+/).map(s => s.trim())
    .find(s => disclosureSubject.test(s) && disclosureReceipt.test(s));
  if (sentence) candidates.push(sentence);
  const found = candidates.map(c => ({ index: text.indexOf(c), sentence: c })).sort((a, b) => a.index - b.index);
  return found[0] ?? null;
}
