// Hand-written WAV parser — the robust path for real producer files.
//
// Why this exists: the browser's decodeAudioData (a) ALWAYS resamples to the AudioContext
// rate, which on a long 48k/96k mixbus is a huge main-thread resample that freezes the UI,
// and (b) does not reliably decode 32-bit float WAV (the standard unmastered DAW export).
// So for WAV we skip decodeAudioData entirely: read the PCM ourselves at the NATIVE rate and
// feed it straight into the DSP (which is already fs-parameterized). No resample, no codec,
// no upload — and 32-bit float "just works".
//
// Supports: PCM int 16 / 24 / 32, IEEE float 32, mono..N channels, any sample rate,
// and WAVE_FORMAT_EXTENSIBLE (0xFFFE) by reading the real format tag from the SubFormat GUID.

export interface ParsedWav {
  sampleRate: number;
  numberOfChannels: number;
  length: number;               // frames per channel
  channelData: Float32Array[];  // one Float32Array per channel, native rate, [-1, 1]
}

export class WavParseError extends Error {
  constructor(public code: 'not-wav' | 'unsupported-format' | 'corrupt', message: string) {
    super(message); this.name = 'WavParseError';
  }
}

const FMT_PCM = 0x0001;
const FMT_FLOAT = 0x0003;
const FMT_EXTENSIBLE = 0xfffe;

// Read a 4-char ASCII tag at offset.
function tag(dv: DataView, off: number): string {
  return String.fromCharCode(dv.getUint8(off), dv.getUint8(off + 1), dv.getUint8(off + 2), dv.getUint8(off + 3));
}

// Quick sniff used by the orchestrator to route WAV vs everything else (by content, not name).
export function isWavBuffer(buf: ArrayBuffer): boolean {
  if (buf.byteLength < 12) return false;
  const dv = new DataView(buf);
  return tag(dv, 0) === 'RIFF' && tag(dv, 8) === 'WAVE';
}

export function parseWav(buf: ArrayBuffer): ParsedWav {
  if (!isWavBuffer(buf)) throw new WavParseError('not-wav', 'Pas un fichier WAV (en-tête RIFF/WAVE absent).');
  const dv = new DataView(buf);

  let fmtFound = false;
  let audioFormat = 0, numChannels = 0, sampleRate = 0, bitsPerSample = 0;
  let dataOffset = -1, dataSize = 0;

  // Walk sub-chunks starting after "RIFF"(4) + size(4) + "WAVE"(4) = 12.
  let p = 12;
  while (p + 8 <= dv.byteLength) {
    const id = tag(dv, p);
    const size = dv.getUint32(p + 4, true);
    const body = p + 8;

    if (id === 'fmt ') {
      audioFormat = dv.getUint16(body, true);
      numChannels = dv.getUint16(body + 2, true);
      sampleRate = dv.getUint32(body + 4, true);
      bitsPerSample = dv.getUint16(body + 14, true);
      if (audioFormat === FMT_EXTENSIBLE) {
        // cbSize at body+16, extension follows: validBits(2) + channelMask(4) + 16-byte SubFormat GUID.
        // The real format tag is the first 2 bytes (LE) of the GUID at body+24.
        if (body + 26 <= dv.byteLength) audioFormat = dv.getUint16(body + 24, true);
      }
      fmtFound = true;
    } else if (id === 'data') {
      dataOffset = body;
      dataSize = size;
      // data is usually the last meaningful chunk; keep walking only if fmt not yet seen.
      if (fmtFound) break;
    }
    // Chunks are word-aligned: an odd size is padded by 1 byte.
    p = body + size + (size & 1);
  }

  if (!fmtFound) throw new WavParseError('corrupt', 'En-tête WAV invalide (chunk fmt introuvable).');
  if (dataOffset < 0) throw new WavParseError('corrupt', 'En-tête WAV invalide (chunk data introuvable).');
  if (numChannels < 1) throw new WavParseError('corrupt', 'Nombre de canaux invalide.');

  const isFloat = audioFormat === FMT_FLOAT;
  const isPcm = audioFormat === FMT_PCM;
  if (!isFloat && !isPcm) {
    throw new WavParseError('unsupported-format', `Format WAV non géré (tag ${audioFormat}). Réexporte en PCM ou float.`);
  }
  if (isFloat && bitsPerSample !== 32) {
    throw new WavParseError('unsupported-format', `Float ${bitsPerSample}-bit non géré. Réexporte en float 32 ou PCM.`);
  }
  if (isPcm && bitsPerSample !== 16 && bitsPerSample !== 24 && bitsPerSample !== 32) {
    throw new WavParseError('unsupported-format', `PCM ${bitsPerSample}-bit non géré. Réexporte en 16, 24 ou 32-bit.`);
  }

  const bytesPerSample = bitsPerSample >> 3;
  const frameBytes = bytesPerSample * numChannels;
  // Clamp dataSize to what is actually in the buffer (some files over-report).
  const availBytes = Math.min(dataSize, dv.byteLength - dataOffset);
  const frames = Math.floor(availBytes / frameBytes);

  const channelData: Float32Array[] = [];
  for (let c = 0; c < numChannels; c++) channelData.push(new Float32Array(frames));

  // De-interleave + convert to Float32 [-1, 1], little-endian.
  if (isFloat) {
    for (let i = 0; i < frames; i++) {
      const base = dataOffset + i * frameBytes;
      for (let c = 0; c < numChannels; c++) {
        channelData[c][i] = dv.getFloat32(base + c * 4, true);
      }
    }
  } else if (bitsPerSample === 16) {
    for (let i = 0; i < frames; i++) {
      const base = dataOffset + i * frameBytes;
      for (let c = 0; c < numChannels; c++) {
        channelData[c][i] = dv.getInt16(base + c * 2, true) / 32768;
      }
    }
  } else if (bitsPerSample === 24) {
    for (let i = 0; i < frames; i++) {
      const base = dataOffset + i * frameBytes;
      for (let c = 0; c < numChannels; c++) {
        const o = base + c * 3;
        // assemble 24-bit LE then sign-extend
        let v = dv.getUint8(o) | (dv.getUint8(o + 1) << 8) | (dv.getUint8(o + 2) << 16);
        if (v & 0x800000) v |= ~0xffffff;   // sign-extend negative
        channelData[c][i] = v / 8388608;
      }
    }
  } else { // 32-bit int
    for (let i = 0; i < frames; i++) {
      const base = dataOffset + i * frameBytes;
      for (let c = 0; c < numChannels; c++) {
        channelData[c][i] = dv.getInt32(base + c * 4, true) / 2147483648;
      }
    }
  }

  return { sampleRate, numberOfChannels: numChannels, length: frames, channelData };
}
