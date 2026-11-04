import { translate } from '@/i18n';
import type { Page } from './types';

export class ImportProblem extends Error {}

/** Parses a PDF entirely in the browser. Nothing is uploaded. */
export async function extractPdfPages(file: File): Promise<Page[]> {
  let pdfjs: typeof import('pdfjs-dist');
  try {
    pdfjs = await import('pdfjs-dist');
    const worker = await import('pdfjs-dist/build/pdf.worker.min.mjs?url');
    pdfjs.GlobalWorkerOptions.workerSrc = worker.default;
  } catch {
    throw new ImportProblem(translate('pdf.loadFailed'));
  }
  const data = new Uint8Array(await file.arrayBuffer());
  let doc;
  try {
    doc = await pdfjs.getDocument({ data }).promise;
  } catch (e) {
    const name = (e as { name?: string })?.name;
    if (name === 'PasswordException') throw new ImportProblem(translate('pdf.password'));
    throw new ImportProblem(translate('pdf.unreadable'));
  }
  const pages: Page[] = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    let text = '';
    for (const it of content.items) {
      if ('str' in it) text += it.str + (it.hasEOL ? '\n' : it.str.endsWith(' ') ? '' : ' ');
    }
    text = text.replace(/[ \t]+/g, ' ').replace(/ *\n */g, '\n').replace(/\n{3,}/g, '\n\n').trim();
    pages.push({ page: i, text });
  }
  const chars = pages.reduce((n, p) => n + p.text.length, 0);
  if (chars < 30 * Math.max(1, pages.length) * 0.5 || chars < 40) {
    throw new ImportProblem(translate('pdf.noText', { count: pages.length }));
  }
  return pages.filter((p) => p.text.length > 0);
}
