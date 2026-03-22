// WAV encoding constants (PCM, 16-bit, little-endian)
const WAV_HEADER_BYTES = 44;
const PCM_FORMAT      = 1;   // Linear PCM
const BITS_PER_SAMPLE = 16;
const FMT_CHUNK_SIZE  = 16;  // Size of the fmt sub-chunk for PCM
const INT16_MAX       = 0x7FFF;
const INT16_MIN       = 0x8000; // Used as unsigned magnitude for negative values

// ══════════════════════════════════════
// MARKDOWN PARSER
// ══════════════════════════════════════

/**
 * Parse a podcast script in the app's Markdown dialect into structured data.
 *
 * Expected format:
 *   # Episode Title
 *   ## Subtitle
 *   ---
 *   **[INTRO — description]**
 *   **HOST:** Spoken text…
 *   ---
 *   ## ACT ONE: Section Title
 *   **HOST:** Spoken text…
 *   ---
 *   **[OUTRO]**
 *   **HOST:** Closing text…
 *   ---
 *   *Metadata line*
 *
 * Sections are delimited by `---` on its own line. The first block is treated
 * as episode metadata; subsequent blocks become playable sections. Blocks with
 * no heading and no **[MARKER]** are silently skipped (e.g. trailing metadata).
 *
 * The following elements are stripped from section text before TTS:
 *   - `## Heading` lines
 *   - `**[Stage direction]**` lines
 *   - `**HOST:**` labels
 *   - Fenced code blocks
 *   - Bold markers (**text** → text)
 *   - `*Italic metadata*` lines
 *
 * @param {string} text - Raw markdown string.
 * @returns {{ title: string, subtitle: string, sections: Array<{id: string, title: string, text: string}> }}
 */
export function parseMarkdown(text) {
  if (typeof text !== 'string') throw new TypeError('parseMarkdown: expected a string');

  const blocks = text.split(/\n---\n/);

  // Block 0: episode metadata
  const meta = blocks[0];
  const titleMatch    = meta.match(/^#\s+(.+)$/m);
  const subtitleMatch = meta.match(/^##\s+(.+)$/m);
  const title    = titleMatch    ? titleMatch[1].trim()    : 'Podcast';
  const subtitle = subtitleMatch ? subtitleMatch[1].trim() : '';

  const sections = [];
  for (let i = 1; i < blocks.length; i++) {
    const block = blocks[i].trim();
    if (!block) continue;

    // Extract section title from ## heading or **[MARKER]** line.
    // ## heading takes precedence if both appear in the same block.
    let sectionTitle = '';
    const headingMatch = block.match(/^##\s+(.+)$/m);
    if (headingMatch) {
      sectionTitle = headingMatch[1].trim();
    } else {
      const markerMatch = block.match(/\*\*\[([^\]]+)\]\*\*/);
      if (markerMatch) {
        const t = markerMatch[1];
        if      (/intro/i.test(t)) sectionTitle = 'Introduction';
        else if (/outro/i.test(t)) sectionTitle = 'Outro';
        else sectionTitle = t.replace(/\s*[—–-].*$/, '').trim();
      }
    }
    if (!sectionTitle) continue; // skip trailing metadata blocks

    const sectionText = block
      .replace(/^##.+$/gm,                     '')  // headings
      .replace(/```[\s\S]*?```/g,              '')  // fenced code blocks
      .replace(/^\s*\*\*\[[^\]]*\]\*\*\s*$/gm, '') // stage direction lines
      .replace(/\*\*HOST:\*\*\s*/g,            '')  // HOST: labels
      .replace(/\*\*([^*\n]+)\*\*/g,          '$1') // bold markers → plain text
      .replace(/^\*[^*\n].*$/gm,               '')  // *italic metadata* lines
      .replace(/\n{3,}/g, '\n\n')
      .trim();

    if (!sectionText) continue;

    // Slug: lowercase, collapse non-alphanumeric runs to hyphens, max 40 chars
    const id = sectionTitle
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .substring(0, 40);

    sections.push({ id, title: sectionTitle, text: sectionText });
  }

  return { title, subtitle, sections };
}

// ══════════════════════════════════════
// WAV ENCODER
// ══════════════════════════════════════

/**
 * Encode a Web Audio API AudioBuffer (or compatible object) as a 16-bit PCM WAV.
 *
 * The output is a standard RIFF/WAVE file with a single `fmt ` chunk (PCM,
 * 16-bit, little-endian) and a `data` chunk. Multi-channel audio is interleaved
 * in channel order (L, R, L, R, …). Float32 sample values are clamped to [-1, 1]
 * before conversion to avoid integer overflow.
 *
 * @param {{ numberOfChannels: number, sampleRate: number, length: number, getChannelData: (ch: number) => Float32Array }} buffer
 * @returns {Uint8Array} Raw WAV file bytes.
 */
export function audioBufferToWAV(buffer) {
  const numChannels = buffer.numberOfChannels;
  const sampleRate  = buffer.sampleRate;
  const length      = buffer.length;
  const dataBytes   = length * numChannels * (BITS_PER_SAMPLE / 8);

  const ab   = new ArrayBuffer(WAV_HEADER_BYTES + dataBytes);
  const view = new DataView(ab);

  // Helper: write a fixed ASCII string at a byte offset
  const str = (off, s) => [...s].forEach((c, i) => view.setUint8(off + i, c.charCodeAt(0)));

  // RIFF chunk descriptor
  str(0,  'RIFF');
  view.setUint32(4, 36 + dataBytes, true);       // file size - 8
  str(8,  'WAVE');

  // fmt sub-chunk
  str(12, 'fmt ');
  view.setUint32(16, FMT_CHUNK_SIZE, true);       // sub-chunk size (16 for PCM)
  view.setUint16(20, PCM_FORMAT, true);            // audio format: 1 = PCM
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * numChannels * (BITS_PER_SAMPLE / 8), true); // byte rate
  view.setUint16(32, numChannels * (BITS_PER_SAMPLE / 8), true);              // block align
  view.setUint16(34, BITS_PER_SAMPLE, true);

  // data sub-chunk
  str(36, 'data');
  view.setUint32(40, dataBytes, true);

  // PCM samples — interleaved across channels, clamped to [-1, 1]
  let off = WAV_HEADER_BYTES;
  for (let i = 0; i < length; i++) {
    for (let ch = 0; ch < numChannels; ch++) {
      const s = Math.max(-1, Math.min(1, buffer.getChannelData(ch)[i]));
      view.setInt16(off, s < 0 ? s * INT16_MIN : s * INT16_MAX, true);
      off += 2;
    }
  }

  return new Uint8Array(ab);
}
