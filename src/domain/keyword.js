import { withObject, withDirection } from './korean.js';

export function escapeRegExp(value) {
  return String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function countKeyword(text, keyword) {
  if (!keyword) return 0;
  return (text.match(new RegExp(escapeRegExp(keyword), 'g')) || []).length;
}

/** A search keyword. Wraps the raw string so counting and particle choice live in one place. */
export class Keyword {
  constructor(text) {
    this.text = String(text ?? '').trim();
    Object.freeze(this);
  }

  get isEmpty() { return this.text === ''; }

  countIn(text) { return countKeyword(text, this.text); }

  get asObject() { return withObject(this.text); }

  get asDirection() { return withDirection(this.text); }

  toString() { return this.text; }
}
