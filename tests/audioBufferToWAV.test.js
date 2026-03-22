import { describe, it, expect } from 'vitest';
import { audioBufferToWAV } from '../utils.js';

// Mock AudioBuffer — matches the Web Audio API surface we use
function makeBuffer({ samples, sampleRate = 24000, numChannels = 1 } = {}) {
  const channels = Array.from({ length: numChannels }, (_, ch) =>
    new Float32Array(samples[ch] ?? samples[0])
  );
  return {
    numberOfChannels: numChannels,
    sampleRate,
    length: channels[0].length,
    getChannelData: (ch) => channels[ch],
  };
}

function readStr(bytes, offset, len) {
  return Array.from(bytes.slice(offset, offset + len))
    .map(b => String.fromCharCode(b))
    .join('');
}

function readUint32LE(bytes, offset) {
  return new DataView(bytes.buffer).getUint32(offset, true);
}

function readUint16LE(bytes, offset) {
  return new DataView(bytes.buffer).getUint16(offset, true);
}

function readInt16LE(bytes, offset) {
  return new DataView(bytes.buffer).getInt16(offset, true);
}

// ── Output type ───────────────────────────────────────────────────────────────

describe('return type', () => {
  it('returns a Uint8Array', () => {
    const buf = makeBuffer({ samples: [[0]] });
    expect(audioBufferToWAV(buf)).toBeInstanceOf(Uint8Array);
  });

  it('returns exactly 44 bytes for a silent 1-sample buffer', () => {
    const buf = makeBuffer({ samples: [[0]] });
    expect(audioBufferToWAV(buf).length).toBe(44 + 1 * 1 * 2);
  });

  it('total byte length is 44 + (samples × channels × 2)', () => {
    const buf = makeBuffer({ samples: [new Float32Array(100)] });
    expect(audioBufferToWAV(buf).length).toBe(44 + 100 * 1 * 2);
  });

  it('accounts for stereo in total byte length', () => {
    const buf = makeBuffer({
      samples: [new Float32Array(100), new Float32Array(100)],
      numChannels: 2,
    });
    expect(audioBufferToWAV(buf).length).toBe(44 + 100 * 2 * 2);
  });
});

// ── RIFF / WAVE header ────────────────────────────────────────────────────────

describe('RIFF/WAVE header', () => {
  it('starts with "RIFF"', () => {
    const wav = audioBufferToWAV(makeBuffer({ samples: [[0]] }));
    expect(readStr(wav, 0, 4)).toBe('RIFF');
  });

  it('contains "WAVE" at offset 8', () => {
    const wav = audioBufferToWAV(makeBuffer({ samples: [[0]] }));
    expect(readStr(wav, 8, 4)).toBe('WAVE');
  });

  it('encodes total file size - 8 at offset 4', () => {
    const buf = makeBuffer({ samples: [new Float32Array(50)] });
    const wav = audioBufferToWAV(buf);
    // RIFF chunk size = 36 + data bytes = 36 + 50*1*2 = 136
    expect(readUint32LE(wav, 4)).toBe(36 + 50 * 1 * 2);
  });
});

// ── fmt chunk ─────────────────────────────────────────────────────────────────

describe('fmt chunk', () => {
  it('has "fmt " marker at offset 12', () => {
    const wav = audioBufferToWAV(makeBuffer({ samples: [[0]] }));
    expect(readStr(wav, 12, 4)).toBe('fmt ');
  });

  it('encodes PCM format (1) at offset 20', () => {
    const wav = audioBufferToWAV(makeBuffer({ samples: [[0]] }));
    expect(readUint16LE(wav, 20)).toBe(1);
  });

  it('encodes num channels at offset 22', () => {
    const mono = makeBuffer({ samples: [[0]], numChannels: 1 });
    expect(readUint16LE(audioBufferToWAV(mono), 22)).toBe(1);

    const stereo = makeBuffer({ samples: [[0], [0]], numChannels: 2 });
    expect(readUint16LE(audioBufferToWAV(stereo), 22)).toBe(2);
  });

  it('encodes sample rate at offset 24', () => {
    const buf = makeBuffer({ samples: [[0]], sampleRate: 24000 });
    expect(readUint32LE(audioBufferToWAV(buf), 24)).toBe(24000);

    const buf44k = makeBuffer({ samples: [[0]], sampleRate: 44100 });
    expect(readUint32LE(audioBufferToWAV(buf44k), 24)).toBe(44100);
  });

  it('encodes byte rate (sampleRate × channels × 2) at offset 28', () => {
    const buf = makeBuffer({ samples: [[0]], sampleRate: 24000, numChannels: 1 });
    expect(readUint32LE(audioBufferToWAV(buf), 28)).toBe(24000 * 1 * 2);
  });

  it('encodes bits-per-sample (16) at offset 34', () => {
    const wav = audioBufferToWAV(makeBuffer({ samples: [[0]] }));
    expect(readUint16LE(wav, 34)).toBe(16);
  });
});

// ── data chunk ────────────────────────────────────────────────────────────────

describe('data chunk', () => {
  it('has "data" marker at offset 36', () => {
    const wav = audioBufferToWAV(makeBuffer({ samples: [[0]] }));
    expect(readStr(wav, 36, 4)).toBe('data');
  });

  it('encodes data byte count at offset 40', () => {
    const buf = makeBuffer({ samples: [new Float32Array(80)] });
    const wav = audioBufferToWAV(buf);
    expect(readUint32LE(wav, 40)).toBe(80 * 1 * 2);
  });
});

// ── PCM encoding ──────────────────────────────────────────────────────────────

describe('PCM sample encoding', () => {
  it('encodes silence (0.0) as 0', () => {
    const wav = audioBufferToWAV(makeBuffer({ samples: [[0.0]] }));
    expect(readInt16LE(wav, 44)).toBe(0);
  });

  it('encodes full-scale positive (1.0) as 0x7FFF', () => {
    const wav = audioBufferToWAV(makeBuffer({ samples: [[1.0]] }));
    expect(readInt16LE(wav, 44)).toBe(0x7FFF);
  });

  it('encodes full-scale negative (-1.0) as -32768 (0x8000)', () => {
    const wav = audioBufferToWAV(makeBuffer({ samples: [[-1.0]] }));
    expect(readInt16LE(wav, 44)).toBe(-0x8000);
  });

  it('encodes mid-scale positive (0.5) close to 0x3FFF', () => {
    const wav = audioBufferToWAV(makeBuffer({ samples: [[0.5]] }));
    expect(readInt16LE(wav, 44)).toBeCloseTo(0x3FFF, -1);
  });

  it('encodes multiple samples in order', () => {
    const wav = audioBufferToWAV(makeBuffer({ samples: [[0.0, 1.0, -1.0]] }));
    expect(readInt16LE(wav, 44)).toBe(0);
    expect(readInt16LE(wav, 46)).toBe(0x7FFF);
    expect(readInt16LE(wav, 48)).toBe(-0x8000);
  });

  it('interleaves stereo channels correctly (L R L R ...)', () => {
    const buf = makeBuffer({
      samples: [[1.0, 0.0], [-1.0, 0.0]],
      numChannels: 2,
    });
    const wav = audioBufferToWAV(buf);
    // Sample 0: L=1.0, R=-1.0
    expect(readInt16LE(wav, 44)).toBe(0x7FFF);  // L
    expect(readInt16LE(wav, 46)).toBe(-0x8000); // R
    // Sample 1: L=0.0, R=0.0
    expect(readInt16LE(wav, 48)).toBe(0);
    expect(readInt16LE(wav, 50)).toBe(0);
  });
});
