// ══════════════════════════════════════
// MARKDOWN PARSER
// ══════════════════════════════════════
export function parseMarkdown(text) {
  const blocks = text.split(/\n---\n/);

  // Block 0: episode metadata
  const meta = blocks[0];
  const titleMatch = meta.match(/^#\s+(.+)$/m);
  const subtitleMatch = meta.match(/^##\s+(.+)$/m);
  const title = titleMatch ? titleMatch[1].trim() : 'Podcast';
  const subtitle = subtitleMatch ? subtitleMatch[1].trim() : '';

  const sections = [];
  for (let i = 1; i < blocks.length; i++) {
    const block = blocks[i].trim();
    if (!block) continue;

    // Extract section title from ## heading or **[MARKER]** line
    let sectionTitle = '';
    const headingMatch = block.match(/^##\s+(.+)$/m);
    if (headingMatch) {
      sectionTitle = headingMatch[1].trim();
    } else {
      const markerMatch = block.match(/\*\*\[([^\]]+)\]\*\*/);
      if (markerMatch) {
        const t = markerMatch[1];
        if (/intro/i.test(t)) sectionTitle = 'Introduction';
        else if (/outro/i.test(t)) sectionTitle = 'Outro';
        else sectionTitle = t.replace(/\s*[—–-].*$/, '').trim();
      }
    }
    if (!sectionTitle) continue; // skip trailing metadata blocks

    const sectionText = block
      .replace(/^##.+$/gm, '')                        // headings
      .replace(/```[\s\S]*?```/g, '')                  // code blocks
      .replace(/^\s*\*\*\[[^\]]*\]\*\*\s*$/gm, '')    // stage direction lines
      .replace(/\*\*HOST:\*\*\s*/g, '')                // HOST: labels
      .replace(/\*\*([^*\n]+)\*\*/g, '$1')            // bold markers
      .replace(/^\*[^*\n].*$/gm, '')                   // *italic metadata* lines
      .replace(/\n{3,}/g, '\n\n')
      .trim();

    if (!sectionText) continue;

    const id = sectionTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').substring(0, 40);
    sections.push({ id, title: sectionTitle, text: sectionText });
  }

  return { title, subtitle, sections };
}

// ══════════════════════════════════════
// WAV ENCODER
// ══════════════════════════════════════
export function audioBufferToWAV(buffer) {
  const numChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const length = buffer.length;
  const ab = new ArrayBuffer(44 + length * numChannels * 2);
  const view = new DataView(ab);
  const str = (off, s) => [...s].forEach((c, i) => view.setUint8(off + i, c.charCodeAt(0)));
  str(0, 'RIFF'); view.setUint32(4, 36 + length * numChannels * 2, true);
  str(8, 'WAVE'); str(12, 'fmt ');
  view.setUint32(16, 16, true); view.setUint16(20, 1, true);
  view.setUint16(22, numChannels, true); view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * numChannels * 2, true);
  view.setUint16(32, numChannels * 2, true); view.setUint16(34, 16, true);
  str(36, 'data'); view.setUint32(40, length * numChannels * 2, true);
  let off = 44;
  for (let i = 0; i < length; i++) {
    for (let ch = 0; ch < numChannels; ch++) {
      const s = buffer.getChannelData(ch)[i];
      view.setInt16(off, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
      off += 2;
    }
  }
  return new Uint8Array(ab);
}
