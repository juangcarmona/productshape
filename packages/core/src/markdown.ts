/**
 * Minimal deterministic Markdown renderer for the constrained vocabulary artifact bodies use:
 * headings, paragraphs, unordered and ordered lists (with wrapped continuation lines), and
 * fenced code blocks. Inline: bold, italic, inline code, links. Anything outside the subset
 * falls back to preformatted text so content is never dropped. No dependency, no state, and
 * identical input always yields identical output.
 */

export function escapeHtml(text: string): string {
  return text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

/** Inline formatting over already-escaped text: code first so its content stays literal. */
function renderInline(escaped: string): string {
  let out = escaped.replace(/`([^`]+)`/g, (_, code: string) => `<code>${code}</code>`);
  out = out.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  out = out.replace(/(^|[\s(])_([^_]+)_(?=[\s).,;:!?]|$)/g, '$1<em>$2</em>');
  out = out.replace(
    /\[([^\]]+)\]\(([^)\s]+)\)/g,
    (_, text: string, href: string) => `<a href="${href}">${text}</a>`,
  );
  return out;
}

interface ListItem {
  text: string;
}

function flushList(items: ListItem[], ordered: boolean, html: string[]): void {
  if (items.length === 0) return;
  const tag = ordered ? 'ol' : 'ul';
  html.push(`<${tag}>`);
  for (const item of items) html.push(`<li>${renderInline(escapeHtml(item.text))}</li>`);
  html.push(`</${tag}>`);
  items.length = 0;
}

function flushParagraph(lines: string[], html: string[]): void {
  if (lines.length === 0) return;
  html.push(`<p>${renderInline(escapeHtml(lines.join(' ')))}</p>`);
  lines.length = 0;
}

/** Render a Markdown body to HTML. Line-based, single pass, deterministic. */
export function renderMarkdown(markdown: string): string {
  const html: string[] = [];
  const paragraph: string[] = [];
  const listItems: ListItem[] = [];
  let listOrdered = false;
  let inList = false;
  let fence: string[] | undefined;

  const closeBlocks = (): void => {
    flushParagraph(paragraph, html);
    if (inList) {
      flushList(listItems, listOrdered, html);
      inList = false;
    }
  };

  for (const rawLine of markdown.split('\n')) {
    const line = rawLine.replace(/\r$/, '');

    if (fence !== undefined) {
      if (/^```/.test(line.trim())) {
        html.push(`<pre><code>${escapeHtml(fence.join('\n'))}</code></pre>`);
        fence = undefined;
      } else {
        fence.push(line);
      }
      continue;
    }

    if (/^```/.test(line.trim())) {
      closeBlocks();
      fence = [];
      continue;
    }

    const heading = /^(#{1,4})\s+(.*)$/.exec(line);
    if (heading) {
      closeBlocks();
      const level = (heading[1] ?? '#').length;
      html.push(`<h${level}>${renderInline(escapeHtml((heading[2] ?? '').trim()))}</h${level}>`);
      continue;
    }

    const bullet = /^\s*[-*]\s+(.*)$/.exec(line);
    const numbered = /^\s*\d+\.\s+(.*)$/.exec(line);
    if (bullet || numbered) {
      const ordered = Boolean(numbered);
      flushParagraph(paragraph, html);
      if (inList && listOrdered !== ordered) flushList(listItems, listOrdered, html);
      inList = true;
      listOrdered = ordered;
      listItems.push({ text: (bullet ?? numbered)?.[1] ?? '' });
      continue;
    }

    if (line.trim() === '') {
      closeBlocks();
      continue;
    }

    // Wrapped continuation of the previous list item.
    const lastItem = listItems.at(-1);
    if (inList && lastItem && /^\s{2,}\S/.test(line)) {
      lastItem.text += ` ${line.trim()}`;
      continue;
    }

    // Outside the subset (tables, blockquotes, raw HTML): preformatted fallback, never dropped.
    if (/^\s*[|>]/.test(line)) {
      closeBlocks();
      html.push(`<pre>${escapeHtml(line)}</pre>`);
      continue;
    }

    if (inList) {
      flushList(listItems, listOrdered, html);
      inList = false;
    }
    paragraph.push(line.trim());
  }

  if (fence !== undefined) html.push(`<pre><code>${escapeHtml(fence.join('\n'))}</code></pre>`);
  closeBlocks();
  return html.join('\n');
}
