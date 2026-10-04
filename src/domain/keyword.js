export function escapeRegExp(value) {
  return String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function countKeyword(text, keyword) {
  if (!keyword) return 0;
  return (text.match(new RegExp(escapeRegExp(keyword), 'g')) || []).length;
}
