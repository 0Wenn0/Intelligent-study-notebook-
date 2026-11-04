import { type Item, type Kind, type Page, uid } from './types';
import { translate } from '@/i18n';

/**
 * On-device extraction. Every candidate excerpt is an exact substring of the
 * supplied page text. Titles are short labels derived from that text; the only
 * generated prose is clearly-flagged investigation prompts (kind Question).
 */

const SENTENCE_RE = /[^.!?]+[.!?]+["'\u201d\u2019)\]]*(?=\s|$)|[^.!?]+$/gu;

interface Candidate {
  text: string;
  page: number;
  kind: Kind;
  score: number;
  order: number;
}

function classify(s: string): { kind: Kind; score: number } {
  const t = s.trim();
  if (
    /^(to [a-z]+[^,]*,|first,|begin by|start by|use |make |ensure |avoid |try |set |choose |create |write |read |keep |check |apply |add |remove |select |follow |identify |review |record |compare |list |plan |schedule |place |limit |turn |reserve |return )/i.test(t) ||
    /\bhow to\b/i.test(t) || /^(primero|comienza|empieza|elige|crea|escribe|revisa|identifica|registra|compara|define|selecciona|plantea|acuerden|reúnan|discutan|revisen|lee|usa|evita|planea|valora)(?![\p{L}])/iu.test(t) || /^¿?cómo \p{L}+(ar|er|ir)(?![\p{L}])/iu.test(t)
  )
    return { kind: 'How-to', score: 3 };
  if (/\b(steps?|stages?|phases?|then|next|afterwards|finally|process|procedure|sequence|cycle|over time|pasos?|etapas?|fases?|luego|después|finalmente|proceso|procedimiento|secuencia|ciclo)\b/iu.test(t))
    return { kind: 'Process', score: 2.5 };
  if (/\b(is defined as|refers? to|is called|are called|known as|means|the term|we call|is termed|se define|se refiere|se llama|significa|el término)\b/iu.test(t))
    return { kind: 'Terminology', score: 3 };
  if (/\b(system|systems|components?|consists? of|composed of|structure|framework|architecture|network|interacts?|mechanism|layers?|parts?|sistemas?|componentes?|estructura|marco|red|mecanismo|partes?)\b/iu.test(t))
    return { kind: 'System', score: 2.2 };
  if (/\b(is|are) (a|an|the)\b/i.test(t) || /\b(concept|idea|principle|theory|model|because)\b/i.test(t) ||
      /(^|\s)(es|son) (un|una|el|la|los|las)\s/iu.test(t) || /(^|\s)(concepto|idea|principio|teoría|modelo)(?![\p{L}])/iu.test(t))
    return { kind: 'Concept', score: 2 };
  return { kind: 'Concept', score: 1 };
}

function usable(s: string) {
  const words = s.split(/\s+/).filter(Boolean);
  if (s.length < 15 || s.length > 800 || words.length < 4) return false;
  const letters = (s.match(/\p{L}/gu) || []).length;
  return letters / s.length > 0.45;
}

export function deriveTitle(text: string): string {
  const clean = sentenceSegments(text)[0] ?? text.trim();
  const words = [...clean.matchAll(/\S+/gu)];
  const limit = Math.min(8, words.length);
  const last = words[limit - 1];
  if (!last) return '';
  const end = last.index! + last[0].length;
  return clean.slice(0, end) + (end < clean.length ? '…' : '');
}

export function questionPrompt(title: string, page: number) {
  return translate('templates.investigation', { title, page });
}

/** Separate headings from prose without changing the text of either. */
export function sentenceSegments(text: string): string[] {
  const blocks = text.split(/\n\s*\n/u);
  const output: string[] = [];
  for (const block of blocks) {
    let prose = block.trim();
    const lines = prose.split('\n');
    if (lines.length > 1) {
      const heading = lines[0].trim();
      const rest = lines.slice(1).join('\n').trim();
      if (heading.split(/\s+/u).length <= 10 && heading.length < 110 &&
          !/[.!?,;]$/u.test(heading) && /[.!?]/u.test(rest) &&
          (/^[¿¡"'«“(]*\p{Lu}/u.test(rest) || /^\d+[.)]/u.test(rest))) {
        prose = rest;
      }
    }
    for (const match of prose.matchAll(SENTENCE_RE)) {
      const sentence = match[0].trim();
      if (sentence && text.includes(sentence)) output.push(sentence);
    }
  }
  return output;
}

export function extractCandidates(sourceId: string, pages: Page[], topic: string, opts: { demo?: boolean } = {}): Item[] {
  const all: Candidate[] = [];
  let order = 0;
  for (const p of pages) {
    const matches = sentenceSegments(p.text);
    const seen = new Set<string>();
    for (const raw of matches) {
      const s = raw.trim();
      if (!usable(s) || seen.has(s) || !p.text.includes(s)) continue;
      seen.add(s);
      const c = classify(s);
      all.push({ text: s, page: p.page, kind: c.kind, score: c.score, order: order++ });
    }
  }
  if (all.length === 0) return [];

  // Diversity: round-robin across kinds, best scores first, cap 26 so prompts fit in 30.
  const byKind = new Map<Kind, Candidate[]>();
  for (const c of all) {
    const arr = byKind.get(c.kind) ?? [];
    arr.push(c);
    byKind.set(c.kind, arr);
  }
  byKind.forEach((arr) => arr.sort((a, b) => b.score - a.score || a.order - b.order));
  const picked: Candidate[] = [];
  const queues = [...byKind.values()];
  while (picked.length < 26 && queues.some((q) => q.length)) {
    for (const q of queues) {
      const c = q.shift();
      if (c && picked.length < 26) picked.push(c);
    }
  }
  picked.sort((a, b) => a.order - b.order);

  const now = new Date().toISOString();
  const topicTag = topic.trim().toLowerCase().replace(/\s+/g, '-') || translate('tags.untagged');
  const items: Item[] = picked.map((c) => ({
    id: uid('item'),
    title: deriveTitle(c.text),
    kind: c.kind,
    body: '',
    excerpts: [{ sourceId, page: c.page, text: c.text }],
    tags: [topicTag],
    status: 'pending',
    understanding: 'new',
    createdAt: now,
    demo: opts.demo,
    generatedLabel: true,
    reviewChecks: { accurate: false, worthwhile: false },
  }));

  // Investigation prompts: generated interpretation, anchored to the same exact excerpt.
  const promptBase = picked.filter((c) => c.kind === 'Concept' || c.kind === 'System' || c.kind === 'Terminology');
  const nPrompts = Math.min(4, Math.max(1, Math.floor(picked.length / 5)), promptBase.length);
  for (let i = 0; i < nPrompts; i++) {
    const c = promptBase[Math.floor((i * promptBase.length) / nPrompts)];
    const title = deriveTitle(c.text);
    items.push({
      id: uid('item'),
      title,
      kind: 'Question',
      body: questionPrompt(title, c.page),
      excerpts: [{ sourceId, page: c.page, text: c.text }],
      tags: [topicTag, translate('tags.prompt')],
      status: 'pending',
      understanding: 'new',
      createdAt: now,
      generated: true,
      demo: opts.demo,
      generatedLabel: true,
      reviewChecks: { accurate: false, worthwhile: false },
    });
  }
  return items.slice(0, 30);
}

export function textToPages(text: string): Page[] {
  const parts = text.includes('\f') ? text.split('\f') : [text];
  return parts.map((t, i) => ({ page: i + 1, text: t.trim() })).filter((p) => p.text.length > 0);
}
