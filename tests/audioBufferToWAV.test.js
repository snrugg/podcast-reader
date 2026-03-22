import { describe, it, expect } from 'vitest';
import { audioBufferToWAV } from '../utils.js';

// ---------------------------------------------------------------------------
// Mock AudioBuffer — satisfies the Web Audio API surface used by audioBufferToWAV.
// Each channel is a Float32Array; samples should be in the range [-1, 1].
// ---------------------------------------------------------------------------

/**
 * @param {{ samples: number[][], sampleRate?: number }} options
 *   samples - one array per channel; all channels must have the same length.
 */
function makeBuffer({ samples, sampleRate = 24000 }) {
  const channels = samples.map(ch => new Float32Array(ch));
  return {
    numberOfChannels: channels.length,
    sampleRate,
    length: channels[0].length,
    getChannelData: (ch) => channels[ch],
  };
}

// ---------------------------------------------------------------------------
// DataView helpers — WAV is little-endian throughout
// ---------------------------------------------------------------------------
const dv     = (bytes) => new DataView(bytes.buffer);
const str4   = (bytes, off) => String.fromCharCode(...bytes.slice(off, off + 4));
const u32    = (bytes, off) => dv(bytes).getUint32(off, true);
const u16    = (bytes, off) => dv(bytes).getUint16(off, true);
const i16    = (bytes, off) => dv(bytes).getInt16(off, true);

// ── Return type ───────────────────────────────────────────────────────────────

describe('return type', () => {
  it('returns a Uint8Array', () => {
    expect(audioBufferToWAV(makeBuffer({ samples: [[0]] }))).toBeInstanceOf(Uint8Array);
  });
});

// ── File size ─────────────────────────────────────────────────────────────────

describe('file size', () => {
  it('is 44 + (samples × channels × 2) bytes', () => {
    const wav = audioBufferToWAV(makeBuffer({ samples: [[0, 0, 0]] }));
    expect(wav.length).toBe(44 + 3 * 1 * 2);
  });

  it('accounts for channel count in file size', () => {
    const wav = audioBufferToWAV(makeBuffer({ samples: [[0, 0], [0, 0]] }));
    expect(wav.length).toBe(44 + 2 * 2 * 2);
  });

  it('handles a zero-length (silent) buffer', () => {
    const wav = audioBufferToWAV(makeBuffer({ samples: [[]] }));
    expect(wav.length).toBe(44);
  });
});

// ── RIFF / WAVE chunk ─────────────────────────────────────────────────────────

describe('RIFF/WAVE chunk', () => {
  it('starts with "RIFF"', () => {
    expect(str4(audioBufferToWAV(makeBuffer({ samples: [[0]] })), 0)).toBe('RIFF');
  });

  it('contains "WAVE" at offset 8', () => {
    expect(str4(audioBufferToWAV(makeBuffer({ samples: [[0]] })), 8)).toBe('WAVE');
  });

  it('encodes (fileSize - 8) at offset 4', () => {
    // 100 mono samples: 44 + 100*1*2 = 244 bytes; RIFF size = 244 - 8 = 236
    const wav = audioBufferToWAV(makeBuffer({ samples: [new Array(100).fill(0)] }));
    expect(u32(wav, 4)).toBe(wav.length - 8);
  });
});

// ── fmt sub-chunk ─────────────────────────────────────────────────────────────

describe('fmt sub-chunk', () => {
  it('has "fmt " marker at offset 12', () => {
    expect(str4(audioBufferToWAV(makeBuffer({ samples: [[0]] })), 12)).toBe('fmt ');
  });

  it('has sub-chunk size of 16 at offset 16', () => {
    expect(u32(audioBufferToWAV(makeBuffer({ samples: [[0]] })), 16)).toBe(16);
  });

  it('has audio format PCM (1) at offset 20', () => {
    expect(u16(audioBufferToWAV(makeBuffer({ samples: [[0]] })), 20)).toBe(1);
  });

  it('encodes number of channels at offset 22', () => {
    const mono   = makeBuffer({ samples: [[0]] });
    const stereo = makeBuffer({ samples: [[0], [0]] });
    expect(u16(audioBufferToWAV(mono),   22)).toBe(1);
    expect(u16(audioBufferToWAV(stereo), 22)).toBe(2);
  });

  it('encodes sample rate at offset 24', () => {
    expect(u32(audioBufferToWAV(makeBuffer({ samples: [[0]], sampleRate: 24000 })), 24)).toBe(24000);
    expect(u32(audioBufferToWAV(makeBuffer({ samples: [[0]], sampleRate: 44100 })), 24)).toBe(44100);
    expect(u32(audioBufferToWAV(makeBuffer({ samples: [[0]], sampleRate: 48000 })), 24)).toBe(48000);
  });

  it('encodes byte rate (sampleRate × channels × 2) at offset 28', () => {
    const wav = audioBufferToWAV(makeBuffer({ samples: [[0]], sampleRate: 24000 }));
    expect(u32(wav, 28)).toBe(24000 * 1 * 2);
  });

  it('encodes block align (channels × 2) at offset 32', () => {
    const mono   = audioBufferToWAV(makeBuffer({ samples: [[0]] }));
    const stereo = audioBufferToWAV(makeBuffer({ samples: [[0], [0]] }));
    expect(u16(mono,   32)).toBe(1 * 2);
    expect(u16(stereo, 32)).toBe(2 * 2);
  });

  it('encodes bits per sample (16) at offset 34', () => {
    expect(u16(audioBufferToWAV(makeBuffer({ samples: [[0]] })), 34)).toBe(16);
  });
});

// ── data sub-chunk ────────────────────────────────────────────────────────────

describe('data sub-chunk', () => {
  it('has "data" marker at offset 36', () => {
    expect(str4(audioBufferToWAV(makeBuffer({ samples: [[0]] })), 36)).toBe('data');
  });

  it('encodes data byte count (samples × channels × 2) at offset 40', () => {
    const wav = audioBufferToWAV(makeBuffer({ samples: [new Array(80).fill(0)] }));
    expect(u32(wav, 40)).toBe(80 * 1 * 2);
  });
});

// ── PCM sample encoding ───────────────────────────────────────────────────────

describe('PCM sample encoding', () => {
  it('encodes silence (0.0) as 0', () => {
    expect(i16(audioBufferToWAV(makeBuffer({ samples: [[0.0]] })), 44)).toBe(0);
  });

  it('encodes full-scale positive (1.0) as 0x7FFF', () => {
    expect(i16(audioBufferToWAV(makeBuffer({ samples: [[1.0]] })), 44)).toBe(0x7FFF);
  });

  it('encodes full-scale negative (-1.0) as -0x8000', () => {
    expect(i16(audioBufferToWAV(makeBuffer({ samples: [[-1.0]] })), 44)).toBe(-0x8000);
  });

  it('encodes mid-scale positive (0.5) close to 0x3FFF', () => {
    expect(i16(audioBufferToWAV(makeBuffer({ samples: [[0.5]] })), 44)).toBeCloseTo(0x3FFF, -1);
  });

  it('encodes multiple samples in order', () => {
    const wav = audioBufferToWAV(makeBuffer({ samples: [[0.0, 1.0, -1.0]] }));
    expect(i16(wav, 44)).toBe(0);
    expect(i16(wav, 46)).toBe(0x7FFF);
    expect(i16(wav, 48)).toBe(-0x8000);
  });

  it('interleaves stereo channels L R L R', () => {
    // L channel: [1.0, 0.0], R channel: [-1.0, 0.0]
    const wav = audioBufferToWAV(makeBuffer({ samples: [[1.0, 0.0], [-1.0, 0.0]] }));
    expect(i16(wav, 44)).toBe(0x7FFF);  // sample 0, L
    expect(i16(wav, 46)).toBe(-0x8000); // sample 0, R
    expect(i16(wav, 48)).toBe(0);       // sample 1, L
    expect(i16(wav, 50)).toBe(0);       // sample 1, R
  });
});

// ── Clamping ──────────────────────────────────────────────────────────────────

describe('sample clamping', () => {
  it('clamps values above 1.0 to 0x7FFF', () => {
    expect(i16(audioBufferToWAV(makeBuffer({ samples: [[1.5]] })), 44)).toBe(0x7FFF);
    expect(i16(audioBufferToWAV(makeBuffer({ samples: [[99]] })), 44)).toBe(0x7FFF);
  });

  it('clamps values below -1.0 to -0x8000', () => {
    expect(i16(audioBufferToWAV(makeBuffer({ samples: [[-1.5]] })), 44)).toBe(-0x8000);
    expect(i16(audioBufferToWAV(makeBuffer({ samples: [[-99]] })), 44)).toBe(-0x8000);
  });

  it('does not clamp values within [-1, 1]', () => {
    const wav = audioBufferToWAV(makeBuffer({ samples: [[-1.0, 0.0, 1.0]] }));
    expect(i16(wav, 44)).toBe(-0x8000);
    expect(i16(wav, 46)).toBe(0);
    expect(i16(wav, 48)).toBe(0x7FFF);
  });
});
