// Search only names and explicit aliases from the catalogue. In particular, a
// mention in a description must not silently turn into a destination.
function normalize(value) {
  return String(value ?? '').normalize('NFKC').toLocaleLowerCase('ru')
    .replace(/ё/g, 'е').replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
}

function phraseAt(haystack, needle, prefixLast = false) {
  if (needle.length > haystack.length) return -1;
  for (let i = 0; i <= haystack.length - needle.length; i++) {
    if (needle.every((word, j) => {
      const candidate = haystack[i + j];
      return prefixLast && j === needle.length - 1
        ? candidate.startsWith(word)
        : candidate === word;
    })) return i;
  }
  return -1;
}

/** Return catalogue records that match the query, most relevant first. */
export function searchServices(query, services = []) {
  const normalized = normalize(query);
  // Room numbers belong to room search, and a single letter is too broad.
  if (normalized.length < 2 || !/\p{L}/u.test(normalized) || !Array.isArray(services)) return [];
  const words = normalized.split(' ');

  return services.map((service, index) => {
    const names = [service?.title, ...(Array.isArray(service?.aliases) ? service.aliases : [])];
    let score = Infinity;
    for (const name of names) {
      if (typeof name !== 'string') continue;
      const field = normalize(name);
      if (!field) continue;
      if (field === normalized) {
        score = 0;
        break;
      }
      const fieldWords = field.split(' ');
      const position = phraseAt(fieldWords, words, true);
      if (position !== -1) score = Math.min(score, position === 0 ? 1 : 2);
      // A full catalogue phrase may occur inside a longer natural-language
      // query. Require at least two words to avoid guessing from incidental
      // single words in a sentence.
      if (fieldWords.length >= 2 && phraseAt(words, fieldWords) !== -1) {
        score = Math.min(score, 3);
      }
    }
    return { service, score, index };
  }).filter(result => Number.isFinite(result.score))
    .sort((a, b) => a.score - b.score || a.index - b.index)
    .map(result => result.service);
}
