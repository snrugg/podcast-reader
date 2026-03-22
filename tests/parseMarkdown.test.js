import { describe, it, expect } from 'vitest';
import { parseMarkdown } from '../utils.js';

// Minimal valid script matching the expected format
const MINIMAL = `# My Podcast

## A great show

---

**[INTRO — music fades]**

**HOST:** Welcome to the show.

---

## ACT ONE: The Beginning

**HOST:** Here is the content of act one.

---

**[OUTRO]**

**HOST:** Thanks for listening.

---

*Script length: approximately 1 minute.*
`;

// ── Metadata ──────────────────────────────────────────────────────────────────

describe('metadata extraction', () => {
  it('extracts the episode title from # heading', () => {
    const { title } = parseMarkdown(MINIMAL);
    expect(title).toBe('My Podcast');
  });

  it('extracts the subtitle from ## heading in the metadata block', () => {
    const { subtitle } = parseMarkdown(MINIMAL);
    expect(subtitle).toBe('A great show');
  });

  it('falls back to "Podcast" when no # title is present', () => {
    const { title } = parseMarkdown('No title here\n\n---\n\n## ACT ONE: Foo\n\n**HOST:** Content.\n');
    expect(title).toBe('Podcast');
  });

  it('falls back to empty string when no ## subtitle is present', () => {
    const { subtitle } = parseMarkdown('# Title Only\n\n---\n\n## ACT ONE: Foo\n\n**HOST:** Content.\n');
    expect(subtitle).toBe('');
  });

  it('does not mistake an ACT heading for the subtitle', () => {
    const { subtitle } = parseMarkdown(MINIMAL);
    expect(subtitle).not.toContain('ACT');
  });
});

// ── Section count ─────────────────────────────────────────────────────────────

describe('section count', () => {
  it('parses the correct number of content sections', () => {
    const { sections } = parseMarkdown(MINIMAL);
    expect(sections).toHaveLength(3); // Intro + Act One + Outro
  });

  it('skips the trailing metadata block (no heading, only *italic* lines)', () => {
    const { sections } = parseMarkdown(MINIMAL);
    const titles = sections.map(s => s.title);
    expect(titles).not.toContain('Script length');
  });

  it('skips empty blocks between dividers', () => {
    const text = '# T\n\n---\n\n---\n\n## ACT ONE: Foo\n\n**HOST:** Content.\n';
    const { sections } = parseMarkdown(text);
    expect(sections).toHaveLength(1);
  });

  it('returns zero sections when there is only metadata', () => {
    const { sections } = parseMarkdown('# Title\n\n## Subtitle\n');
    expect(sections).toHaveLength(0);
  });
});

// ── Section titles ────────────────────────────────────────────────────────────

describe('section title extraction', () => {
  it('uses the ## heading as the section title', () => {
    const { sections } = parseMarkdown(MINIMAL);
    expect(sections[1].title).toBe('ACT ONE: The Beginning');
  });

  it('maps **[INTRO ...]** marker to "Introduction"', () => {
    const { sections } = parseMarkdown(MINIMAL);
    expect(sections[0].title).toBe('Introduction');
  });

  it('maps **[OUTRO]** marker to "Outro"', () => {
    const { sections } = parseMarkdown(MINIMAL);
    expect(sections[2].title).toBe('Outro');
  });

  it('maps **[intro]** (lowercase) to "Introduction"', () => {
    const text = '# T\n\n---\n\n**[intro — jazz]**\n\n**HOST:** Hello.\n';
    const { sections } = parseMarkdown(text);
    expect(sections[0].title).toBe('Introduction');
  });

  it('strips the em-dash suffix from unknown markers', () => {
    const text = '# T\n\n---\n\n**[INTERLUDE — some description]**\n\n**HOST:** Content.\n';
    const { sections } = parseMarkdown(text);
    expect(sections[0].title).toBe('INTERLUDE');
  });

  it('skips a block with no heading and no marker', () => {
    const text = '# T\n\n---\n\nJust some text with no heading.\n\n---\n\n## ACT ONE: Real\n\n**HOST:** Content.\n';
    const { sections } = parseMarkdown(text);
    expect(sections).toHaveLength(1);
    expect(sections[0].title).toBe('ACT ONE: Real');
  });
});

// ── Section IDs ───────────────────────────────────────────────────────────────

describe('section ID generation', () => {
  it('lowercases the title', () => {
    const { sections } = parseMarkdown(MINIMAL);
    expect(sections[1].id).toBe(sections[1].id.toLowerCase());
  });

  it('replaces spaces and special characters with hyphens', () => {
    const { sections } = parseMarkdown(MINIMAL);
    expect(sections[1].id).toMatch(/^[a-z0-9-]+$/);
  });

  it('does not have leading or trailing hyphens', () => {
    const { sections } = parseMarkdown(MINIMAL);
    sections.forEach(s => {
      expect(s.id).not.toMatch(/^-/);
      expect(s.id).not.toMatch(/-$/);
    });
  });

  it('truncates IDs to 40 characters', () => {
    const text = '# T\n\n---\n\n## ACT ONE: A Very Long Section Title That Exceeds Forty Characters Easily\n\n**HOST:** Content.\n';
    const { sections } = parseMarkdown(text);
    expect(sections[0].id.length).toBeLessThanOrEqual(40);
  });

  it('produces unique IDs for different section titles', () => {
    const text = '# T\n\n---\n\n## ACT ONE: First\n\n**HOST:** Content.\n\n---\n\n## ACT TWO: Second\n\n**HOST:** Content.\n';
    const { sections } = parseMarkdown(text);
    expect(sections[0].id).not.toBe(sections[1].id);
  });
});

// ── Text cleaning ─────────────────────────────────────────────────────────────

describe('text cleaning', () => {
  it('removes **HOST:** labels', () => {
    const { sections } = parseMarkdown(MINIMAL);
    sections.forEach(s => expect(s.text).not.toContain('**HOST:**'));
  });

  it('removes stage direction lines like **[beat]**', () => {
    const text = '# T\n\n---\n\n## ACT ONE: Foo\n\n**HOST:** Line one.\n\n**[beat]**\n\n**HOST:** Line two.\n';
    const { sections } = parseMarkdown(text);
    expect(sections[0].text).not.toContain('[beat]');
    expect(sections[0].text).toContain('Line one.');
    expect(sections[0].text).toContain('Line two.');
  });

  it('removes **[INTRO ...]** marker lines from the text body', () => {
    const { sections } = parseMarkdown(MINIMAL);
    expect(sections[0].text).not.toContain('[INTRO');
  });

  it('removes the ## heading line from the section text', () => {
    const { sections } = parseMarkdown(MINIMAL);
    expect(sections[1].text).not.toContain('## ACT ONE');
  });

  it('removes code blocks', () => {
    const text = '# T\n\n---\n\n## ACT ONE: Foo\n\n**HOST:** Run this:\n\n```\nollama pull model\n```\n\n**HOST:** Done.\n';
    const { sections } = parseMarkdown(text);
    expect(sections[0].text).not.toContain('ollama');
    expect(sections[0].text).not.toContain('```');
    expect(sections[0].text).toContain('Done.');
  });

  it('removes *italic metadata* lines', () => {
    const { sections } = parseMarkdown(MINIMAL);
    sections.forEach(s => expect(s.text).not.toMatch(/^\*[^*]/m));
  });

  it('strips bold markers but keeps the inner text', () => {
    const text = '# T\n\n---\n\n## ACT ONE: Foo\n\n**HOST:** This is **important** content.\n';
    const { sections } = parseMarkdown(text);
    expect(sections[0].text).toContain('important');
    expect(sections[0].text).not.toContain('**important**');
  });

  it('preserves the actual spoken content', () => {
    const { sections } = parseMarkdown(MINIMAL);
    expect(sections[0].text).toContain('Welcome to the show.');
    expect(sections[1].text).toContain('Here is the content of act one.');
    expect(sections[2].text).toContain('Thanks for listening.');
  });

  it('skips sections that become empty after cleaning', () => {
    // A block with only a heading and stage directions — no spoken text
    const text = '# T\n\n---\n\n## ACT ONE: Foo\n\n**[beat]**\n\n---\n\n## ACT TWO: Bar\n\n**HOST:** Real content.\n';
    const { sections } = parseMarkdown(text);
    expect(sections).toHaveLength(1);
    expect(sections[0].title).toBe('ACT TWO: Bar');
  });
});

// ── Real script smoke test ────────────────────────────────────────────────────

describe('real script format', () => {
  const REAL = `# The Qwen Revolution

## A Podcast Script on Qwen 3.5

---

**[INTRO — upbeat music fades]**

**HOST:** Welcome back to another episode.

**[beat]**

**HOST:** Today we're going deep on Qwen.

---

## ACT ONE: The Rise of Qwen

**HOST:** The story starts in April 2023. Alibaba launches Tongyi Qianwen.

**[transition beat]**

**HOST:** By September 2023, Alibaba opens it to the public.

---

## ACT TWO: The Flagship

**HOST:** Here is the setup command:

\`\`\`
ollama pull qwen3.5:35b-a3b
\`\`\`

**HOST:** Then set the environment variables and launch.

---

**[OUTRO]**

**HOST:** Thanks for listening.

---

*Script length: approximately 25 minutes.*
*Sources: community benchmarks.*
`;

  it('parses the full real-format script without error', () => {
    expect(() => parseMarkdown(REAL)).not.toThrow();
  });

  it('extracts the correct title', () => {
    expect(parseMarkdown(REAL).title).toBe('The Qwen Revolution');
  });

  it('produces 4 sections', () => {
    expect(parseMarkdown(REAL).sections).toHaveLength(4);
  });

  it('does not include shell commands in any section text', () => {
    const { sections } = parseMarkdown(REAL);
    sections.forEach(s => expect(s.text).not.toContain('ollama pull'));
  });

  it('does not include beat markers in any section text', () => {
    const { sections } = parseMarkdown(REAL);
    sections.forEach(s => expect(s.text).not.toContain('[beat]'));
  });

  it('does not include HOST: in any section text', () => {
    const { sections } = parseMarkdown(REAL);
    sections.forEach(s => expect(s.text).not.toContain('HOST:'));
  });
});
