import assert from 'node:assert/strict';
import { test } from 'node:test';
import { analyzeClaims, trimToSource } from './claims';
import { deriveTitle, extractCandidates } from './extract';
import { buildDemoNotebook } from './seed';
import { validateNotebook } from './storage';
import { buildQuiz, isDue, nextReview, orderItems } from './study';
import type { Item, Source } from './types';

const source: Source = {
  id: 'rome', title: 'History', topic: 'Rome', origin: 'user', createdAt: '2026-01-01T00:00:00Z',
  pages: [{ page: 1, text: 'Rome fell in 476 AD.' }, { page: 2, text: 'A republic contains several institutions and offices.' }],
  priorities: ['howto'],
};
const item: Item = {
  id: 'rome-item', title: 'Rome fell in 476 AD.', kind: 'Concept', body: '',
  excerpts: [{ sourceId: 'rome', page: 1, text: 'Rome fell in 476 AD.' }],
  tags: [], status: 'approved', understanding: 'new', createdAt: '2026-01-01T00:00:00Z',
};

test('Rome acceptance: unsupported causal phrase is highlighted without altering the excerpt', () => {
  const result = analyzeClaims('Rome fell in 476 AD', 'Rome fell in 476 AD because of barbarian invasions', 'Rome fell in 476 AD');
  assert.equal(result.hasWarning, true);
  assert.deepEqual(result.explanationTokens.filter((t) => t.unsupported).map((t) => t.text), ['because', 'of', 'barbarian', 'invasions']);
  assert.equal(result.titleTokens.some((t) => t.unsupported), false);
  assert.equal(analyzeClaims('Rome fell in 476 AD', '', 'Rome fell in 476 AD').hasWarning, false);
});

test('Spanish causal and evaluative connectors are flagged only when unsupported', () => {
  for (const connector of ['porque', 'debido a', 'por lo tanto', 'causó']) {
    const r = analyzeClaims('Roma cayó', `Roma cayó ${connector} invasiones`, 'Roma cayó en el año 476.');
    assert.equal(r.hasWarning, true);
    assert.ok(r.connectors.includes(connector));
  }
  assert.equal(analyzeClaims('Roma cayó porque hubo invasiones.', '', 'Roma cayó porque hubo invasiones.').hasWarning, false);
});

test('trim keeps exact source evidence and uses a word-boundary ellipsis', () => {
  const text = 'The group asks: what evidence, from which sources, supports this particular claim?';
  const trimmed = trimToSource(text);
  assert.equal(trimmed.body, text);
  assert.ok(text.startsWith(trimmed.title.replace(/…$/, '')));
  assert.equal(analyzeClaims(trimmed.title, trimmed.body, text).hasWarning, false);
});

test('titles preserve punctuation and split heading/sentence merges', () => {
  assert.equal(deriveTitle('Rome fell in 476 AD.'), 'Rome fell in 476 AD.');
  const title = deriveTitle('A heading\nRome fell in 476 AD.');
  assert.equal(title, 'Rome fell in 476 AD.');
  const text = 'First, identify the learning objective; next, review its supporting material carefully.';
  assert.equal(deriveTitle(text), 'First, identify the learning objective; next, review its…');
  assert.ok(text.startsWith(deriveTitle(text).slice(0, -1)));
});

test('short factual sources are extracted, all exact citations pending', () => {
  const extracted = extractCandidates(source.id, source.pages, source.topic);
  assert.ok(extracted.some((i) => i.excerpts[0].text === 'Rome fell in 476 AD.'));
  assert.ok(extracted.every((i) => i.status === 'pending' && !i.reviewChecks?.accurate));
  assert.ok(extracted.every((i) => source.pages.some((p) => p.page === i.excerpts[0].page && p.text.includes(i.excerpts[0].text))));
});

test('demo starts pending with requested goal/priorities and round-trips backup', () => {
  const demo = buildDemoNotebook();
  assert.ok(demo.items.length > 0);
  assert.ok(demo.items.every((i) => i.status === 'pending' && !i.demoApproved));
  assert.equal(demo.sources[0].studyGoal, 'Designing AI-supported learning environments for university teachers');
  assert.deepEqual(demo.sources[0].priorities, ['recall', 'howto']);
  assert.equal(validateNotebook(JSON.parse(JSON.stringify(demo))).ok, true);
});

test('legacy migration revokes app-made demo approvals but preserves user approvals', () => {
  const old = buildDemoNotebook();
  old.items[0].status = 'approved';
  old.items[0].demoApproved = true;
  old.items[1].status = 'approved';
  old.items[1].demoApproved = false;
  const raw = JSON.parse(JSON.stringify(old));
  delete raw.attempts;
  delete raw.warningEvents;
  const loaded = validateNotebook(raw);
  assert.equal(loaded.ok, true);
  if (!loaded.ok) return;
  assert.equal(loaded.data.items[0].status, 'pending');
  assert.equal(loaded.data.items[1].status, 'approved');
  assert.deepEqual(loaded.data.attempts, []);
  assert.deepEqual(loaded.data.warningEvents, []);
});

test('backup rejects invented evidence', () => {
  const notebook = buildDemoNotebook();
  notebook.items[0].excerpts[0].text = 'An invented assertion not present in the source.';
  assert.equal(validateNotebook(notebook).ok, false);
});

test('practical priority reorders pending review and due items are scheduled first', () => {
  const process: Item = { ...item, id: 'steps', kind: 'How-to', status: 'pending' };
  assert.equal(orderItems([{ ...item, status: 'pending' }, process], [source])[0].id, 'steps');
  const future = { ...process, status: 'approved' as const, dueAt: '2030-01-01T00:00:00.000Z' };
  assert.equal(orderItems([future, item], [source], Date.parse('2026-01-01'))[0].id, item.id);
  assert.equal(isDue(item), true);
  const good = nextReview(item, true, 0);
  assert.equal(good.intervalDays, 1);
  assert.equal(Date.parse(good.dueAt), 86400000);
  assert.equal(nextReview({ ...item, intervalDays: 1 }, true, 0).intervalDays, 3);
  assert.equal(Date.parse(nextReview(item, false, 0).dueAt), 600000);
});

test('quiz uses cloze/source questions, unique options, and only approved evidence', () => {
  const questions = buildQuiz([item, { ...item, id: 'pending', status: 'pending' }], [source]);
  assert.ok(questions.length > 0);
  assert.ok(questions.every((q) => q.type === 'cloze' || q.type === 'source'));
  assert.ok(questions.every((q) => q.itemId === item.id && q.options.includes(q.answer)));
  assert.ok(questions.every((q) => new Set(q.options).size === q.options.length));
  const cloze = questions.find((q) => q.type === 'cloze');
  assert.ok(cloze && cloze.prompt.replace('______', cloze.answer) === item.excerpts[0].text);
  assert.equal(questions.find((q) => q.type === 'source')?.answer, 'rome:1');
});

test('Spanish questions after a heading are split from the heading', () => {
  const segs = deriveTitle('Preguntas para investigar\n¿Cómo puede un docente distinguir entre participación y comprensión?');
  assert.ok(!segs.startsWith('Preguntas'));
});
