// Korean particle (조사) selection by the final consonant (받침) of the preceding word.
const HANGUL_FIRST = 0xac00;
const HANGUL_LAST = 0xd7a3;
const FINAL_RIEUL = 8; // ㄹ

function finalConsonant(word) {
  const code = String(word).trim().slice(-1).charCodeAt(0);
  if (!(code >= HANGUL_FIRST && code <= HANGUL_LAST)) return null; // not Hangul: unknown
  return (code - HANGUL_FIRST) % 28;
}

// Non-Hangul endings (digits, Latin) keep the vowel form, as the original copy did.
const pick = (word, withFinal, withoutFinal) => (finalConsonant(word) ? withFinal : withoutFinal);

export const withObject = word => `${word}${pick(word, '을', '를')}`;
export const withTopic = word => `${word}${pick(word, '은', '는')}`;
export const withDirection = word => {
  const final = finalConsonant(word);
  return `${word}${final && final !== FINAL_RIEUL ? '으로' : '로'}`;
};
