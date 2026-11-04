import type { Excerpt, Item, Source, Confidence } from './types';

export function isDue(item: Item, now = Date.now()) {
  return !item.dueAt || !Number.isFinite(Date.parse(item.dueAt)) || Date.parse(item.dueAt) <= now;
}

function priorityScore(item: Item, sources: Source[]) {
  const priorities = new Set(sources.filter((s) => item.excerpts.some((e) => e.sourceId === s.id)).flatMap((s) => s.priorities ?? ['recall']));
  let score = 0;
  if (priorities.has('howto') && (item.kind === 'How-to' || item.kind === 'Process')) score += 8;
  if (priorities.has('recall') && (item.kind === 'Concept' || item.kind === 'Terminology')) score += 3;
  if (priorities.has('exam') && (item.kind === 'Question' || item.kind === 'Terminology')) score += 4;
  if (priorities.has('meeting') && (item.kind === 'System' || item.kind === 'Question')) score += 4;
  return score;
}

export function orderItems(items: Item[], sources: Source[], now = Date.now()): Item[] {
  return [...items].sort((a, b) => {
    const due = a.status === 'approved' && b.status === 'approved' ? Number(isDue(b, now)) - Number(isDue(a, now)) : 0;
    return due || priorityScore(b, sources) - priorityScore(a, sources) || a.createdAt.localeCompare(b.createdAt);
  });
}

export function nextReview(item: Item, correct: boolean, now = Date.now()) {
  const intervals = [1, 3, 7, 14, 30];
  const intervalDays = correct ? intervals.find((n) => n > (item.intervalDays ?? 0)) ?? 30 : 0;
  return {
    intervalDays,
    dueAt: new Date(now + (correct ? intervalDays * 86400000 : 600000)).toISOString(),
  };
}

export function confidenceProbability(value: Confidence) {
  return (value - 1) / 3;
}

export interface QuizQuestion {
  id: string;
  itemId: string;
  type: 'cloze' | 'source';
  prompt: string;
  answer: string;
  options: string[];
  excerpt: Excerpt;
}

const STOP = new Set((
  'about above after again against before being below between could during every first further having into itself other should their there these those through under until where which while would source excerpt learning material the and for that with from this then have they were what when your next finally also can each make made more most some such than them only over same very will just ' +
  'para como cómo este esta estas estos ese esa esos esas entre sobre desde hasta donde dónde cuando cuándo luego después primero finalmente puede pueden cada todo toda todos todas también porque según antes ellos ellas otra otro otras otros solo sólo unos unas más menos muy está están hace hacen tiene tienen hacer aquí allí pero sino aunque mientras dentro fuera parte partes forma sobre qué cuál cuáles quien quién donde'
).split(' '));

function shuffled<T>(values: T[]): T[] {
  const out = [...values];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function keyTerms(text: string) {
  const all = [...text.matchAll(/[\p{L}][\p{L}\p{N}\-]{3,}/gu)].map((m) => m[0]);
  return [...new Map(all.filter((w) => !STOP.has(w.toLocaleLowerCase())).map((w) => [w.toLocaleLowerCase(), w])).values()];
}

/** Questions never invent distractor assertions: options are terms or existing page IDs. */
export function buildQuiz(items: Item[], sources: Source[]): QuizQuestion[] {
  const pool = orderItems(items.filter((i) => i.status === 'approved' && i.excerpts.length), sources);
  const questions: QuizQuestion[] = [];
  const seen = new Set<string>();
  const terms = [...new Set(pool.flatMap((i) => keyTerms(i.excerpts.map((e) => e.text).join(' '))))];
  for (const item of pool) {
    const excerpt = item.excerpts[0];
    if (seen.has(excerpt.text)) continue;
    seen.add(excerpt.text);
    const keywords = keyTerms(excerpt.text).sort((a, b) => b.length - a.length);
    const answer = keywords[0];
    if (answer) {
      const choices = shuffled(terms.filter((t) => t.toLocaleLowerCase() !== answer.toLocaleLowerCase())).slice(0, 3);
      if (choices.length) {
        const start = excerpt.text.indexOf(answer);
        questions.push({
          id: `cloze-${item.id}`, itemId: item.id, type: 'cloze',
          prompt: excerpt.text.slice(0, start) + '______' + excerpt.text.slice(start + answer.length),
          answer, options: shuffled([answer, ...choices]), excerpt,
        });
      }
    }
    // A location question is valid only when the quote uniquely identifies its page.
    const locations = sources.flatMap((s) => s.pages.map((p) => ({ key: `${s.id}:${p.page}`, text: p.text })));
    const containing = locations.filter((p) => p.text.includes(excerpt.text));
    const answerKey = `${excerpt.sourceId}:${excerpt.page}`;
    if (containing.length === 1 && containing[0].key === answerKey && locations.length > 1) {
      const others = shuffled([...new Set(locations.filter((p) => p.key !== answerKey).map((p) => p.key))]).slice(0, 3);
      questions.push({ id: `source-${item.id}`, itemId: item.id, type: 'source', prompt: excerpt.text, answer: answerKey, options: shuffled([answerKey, ...others]), excerpt });
    }
    if (questions.length >= 5) break;
  }
  return questions.slice(0, 5);
}
