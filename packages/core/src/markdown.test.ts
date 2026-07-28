import { describe, expect, it } from 'vitest';
import { renderMarkdown } from './markdown.js';

describe('renderMarkdown', () => {
  it('renders headings at levels 1-4', () => {
    expect(renderMarkdown('## Rule')).toBe('<h2>Rule</h2>');
    expect(renderMarkdown('#### Deep')).toBe('<h4>Deep</h4>');
  });

  it('joins wrapped paragraph lines into one paragraph', () => {
    const html = renderMarkdown('First line\ncontinues here.\n\nSecond paragraph.');
    expect(html).toBe('<p>First line continues here.</p>\n<p>Second paragraph.</p>');
  });

  it('renders unordered lists with wrapped continuation lines', () => {
    const html = renderMarkdown('- one item that\n  wraps onto the next line\n- second');
    expect(html).toBe(
      '<ul>\n<li>one item that wraps onto the next line</li>\n<li>second</li>\n</ul>',
    );
  });

  it('renders ordered lists separately from unordered ones', () => {
    const html = renderMarkdown('1. first\n2. second');
    expect(html).toBe('<ol>\n<li>first</li>\n<li>second</li>\n</ol>');
  });

  it('renders fenced code blocks literally, escaped', () => {
    const html = renderMarkdown('```bash\nprodshape validate --format json\n```');
    expect(html).toBe('<pre><code>prodshape validate --format json</code></pre>');
  });

  it('renders inline bold, italic, code and links', () => {
    const html = renderMarkdown('A **strong** _word_ with `code` and [text](#UC-A).');
    expect(html).toBe(
      '<p>A <strong>strong</strong> <em>word</em> with <code>code</code> and <a href="#UC-A">text</a>.</p>',
    );
  });

  it('escapes HTML in every construct', () => {
    expect(renderMarkdown('a <script> & "quote"')).toBe(
      '<p>a &lt;script&gt; &amp; &quot;quote&quot;</p>',
    );
    expect(renderMarkdown('```\n<tag>\n```')).toBe('<pre><code>&lt;tag&gt;</code></pre>');
  });

  it('does not italicize snake_case identifiers', () => {
    expect(renderMarkdown('uses snake_case_name here')).toBe('<p>uses snake_case_name here</p>');
  });

  it('falls back to preformatted text for constructs outside the subset', () => {
    const html = renderMarkdown('| a | b |');
    expect(html).toBe('<pre>| a | b |</pre>');
  });

  it('is deterministic: identical input yields identical output', () => {
    const input = '## H\n\n- a\n- b\n\nText **bold**.';
    expect(renderMarkdown(input)).toBe(renderMarkdown(input));
  });

  it('closes an unterminated fence at end of input without losing content', () => {
    expect(renderMarkdown('```\ndangling')).toBe('<pre><code>dangling</code></pre>');
  });
});
