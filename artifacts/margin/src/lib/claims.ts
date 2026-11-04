/** A conservative lexical check, not an entailment model or a truth verifier. */
export interface ClaimToken {
  text: string;
  unsupported: boolean;
  connector: boolean;
}

const STOP_WORDS = new Set(
  ('a an the and or but of to in on at for from with without as by is are was were be been being ' +
    'it its this that these those i you he she we they them his her our their my your ' +
    'do does did have has had can could may might will would shall should not no so ' +
    'what which who when where how why into about than then also using use only ' +
    'el la los las un una unos unas de del al a y o e u en por para con sin ' +
    'es son era eran fue fueron ser estar está están se lo le les su sus tu tus ' +
    'yo tú él ella nosotros ustedes ellos ellas este esta esto estos estas ese esa ' +
    'que qué quien quién cuando cuándo donde dónde como cómo cual cuál cuales ' +
    'ha han había hay no ni si sí más menos muy sobre entre desde hasta ' +
    'explain explica explain investigate investigar investigation prompt generated using source excerpt page ' +
    'investigación pregunta generada generado fuente extracto página palabras propias unclear remains claim claims').split(/\s+/),
);

const CONNECTORS = [
  'because of', 'because', 'due to', 'caused by', 'causes', 'caused', 'therefore', 'thus',
  'consequently', 'proves', 'best', 'worst', 'superior', 'inferior',
  'debido a', 'por lo tanto', 'por tanto', 'a causa de', 'porque', 'causó', 'causa',
  'por consiguiente', 'demuestra', 'mejor', 'peor',
];
const wordPattern = /[\p{L}\p{N}]+(?:['’\-][\p{L}\p{N}]+)*/gu;

function normalize(text: string) {
  return text.normalize('NFD').replace(/\p{M}/gu, '').toLocaleLowerCase('en');
}

function connectorSpans(text: string, excerpt: string) {
  const spans: { start: number; end: number; text: string }[] = [];
  for (const phrase of CONNECTORS) {
    const pattern = new RegExp(`(?<![\\p{L}\\p{N}])${phrase.replace(/ /g, '\\s+')}(?![\\p{L}\\p{N}])`, 'giu');
    const sourcePattern = new RegExp(`(?<![\\p{L}\\p{N}])${phrase.replace(/ /g, '\\s+')}(?![\\p{L}\\p{N}])`, 'iu');
    if (sourcePattern.test(excerpt)) continue;
    for (const m of text.matchAll(pattern)) {
      spans.push({ start: m.index!, end: m.index! + m[0].length, text: m[0] });
    }
  }
  return spans;
}

function tokenize(text: string, excerpt: string, sourceWords: Set<string>) {
  const spans = connectorSpans(text, excerpt);
  const tokens: ClaimToken[] = [];
  let cursor = 0;
  for (const match of text.matchAll(wordPattern)) {
    const start = match.index!;
    if (start > cursor) tokens.push({ text: text.slice(cursor, start), unsupported: false, connector: false });
    const word = normalize(match[0]);
    const connector = spans.some((s) => start >= s.start && start < s.end);
    const unsupported = connector || (!STOP_WORDS.has(word) && !sourceWords.has(word));
    tokens.push({ text: match[0], unsupported, connector });
    cursor = start + match[0].length;
  }
  if (cursor < text.length) tokens.push({ text: text.slice(cursor), unsupported: false, connector: false });
  return { tokens, connectors: [...new Set(spans.map((s) => s.text))] };
}

export function analyzeClaims(title: string, explanation: string, excerpt: string) {
  const sourceWords = new Set([...excerpt.matchAll(wordPattern)].map((m) => normalize(m[0])));
  const a = tokenize(title, excerpt, sourceWords);
  const b = tokenize(explanation, excerpt, sourceWords);
  const tokens = [...a.tokens, { text: '\n', unsupported: false, connector: false }, ...b.tokens];
  const unsupportedWords = [...new Set(tokens.filter((t) => t.unsupported).map((t) => t.text))];
  const connectors = [...new Set([...a.connectors, ...b.connectors])];
  const hasWarning = unsupportedWords.length > 0;
  // Store no copied claim text in analytics; de-duplicate a warning by content.
  let hash = 2166136261;
  for (const c of `${title}\n${explanation}\n${excerpt}`) {
    hash ^= c.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return {
    tokens, titleTokens: a.tokens, explanationTokens: b.tokens,
    unsupportedWords, connectors, hasWarning, signature: hasWarning ? (hash >>> 0).toString(36) : '',
  };
}

/** Both results preserve the source verbatim; no attempted grammatical rewrite. */
export function trimToSource(excerpt: string): { title: string; body: string } {
  const sentence = excerpt.split(/\n\s*\n/).find((s) => s.trim())?.trim() ?? excerpt.trim();
  const words = [...sentence.matchAll(/\S+/gu)];
  const boundary = words[Math.min(8, words.length) - 1];
  const end = boundary ? boundary.index! + boundary[0].length : sentence.length;
  return { title: sentence.slice(0, end) + (end < sentence.length ? '…' : ''), body: excerpt };
}
