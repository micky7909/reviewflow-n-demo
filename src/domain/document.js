// Plain-text helpers shared by the audit rules and notice extraction.

export function splitSentences(text) {
  return text.split(/[.!?\n]+/).map(s => s.trim()).filter(Boolean);
}

/** A pasted draft's first line is its title; a one-line text is all body. */
export function splitTitleBody(text) {
  const trimmed = text.trim();
  const newline = trimmed.indexOf('\n');
  if (newline === -1) return { title: '', body: trimmed };
  return { title: trimmed.slice(0, newline).trim(), body: trimmed.slice(newline + 1) };
}

export function findPlaceholders(text, pattern) {
  return [...text.matchAll(new RegExp(pattern.source, 'g'))].map(m => m[0]);
}

export function removePlaceholders(text, pattern) {
  return text.replace(new RegExp(pattern.source, 'g'), '');
}
