export const MAX_SECONDS = 30;
export function selectionFrames(buffer, start, end) {
  if (![start, end, buffer.sampleRate, buffer.length].every(Number.isFinite) || start < 0 || end <= start || buffer.sampleRate <= 0) throw new RangeError('Invalid selection');
  const first = Math.round(start * buffer.sampleRate);
  const last = Math.min(buffer.length, Math.round(end * buffer.sampleRate));
  if (first >= last || end > buffer.length / buffer.sampleRate + 1 / buffer.sampleRate || last - first > Math.floor(MAX_SECONDS * buffer.sampleRate)) throw new RangeError('Selection must be within the audio and no longer than 30 seconds');
  return [first, last];
}

export function encodeWav(buffer, start = 0, end = Math.min(buffer.duration, MAX_SECONDS)) {
  const [first, last] = selectionFrames(buffer, start, end);
  const channels = buffer.numberOfChannels;
  if (channels !== 1 && channels !== 2) throw new RangeError('Use mono or stereo audio');
  const frames = last - first, size = frames * channels * 2;
  const out = new ArrayBuffer(44 + size), view = new DataView(out);
  const str = (offset, text) => [...text].forEach((c, i) => view.setUint8(offset + i, c.charCodeAt(0)));
  str(0, 'RIFF'); view.setUint32(4, 36 + size, true); str(8, 'WAVE'); str(12, 'fmt ');
  view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, channels, true);
  view.setUint32(24, buffer.sampleRate, true); view.setUint32(28, buffer.sampleRate * channels * 2, true);
  view.setUint16(32, channels * 2, true); view.setUint16(34, 16, true); str(36, 'data'); view.setUint32(40, size, true);
  const data = Array.from({ length: channels }, (_, c) => buffer.getChannelData(c));
  const fade = Math.min(Math.floor(buffer.sampleRate * 0.005), Math.floor(frames / 2));
  for (let i = 0; i < frames; i++) {
    const gain = fade ? Math.min(1, i / fade, (frames - 1 - i) / fade) : 1;
    for (let c = 0; c < channels; c++) {
      const raw = data[c][first + i];
      const v = (Number.isFinite(raw) ? Math.max(-1, Math.min(1, raw)) : 0) * gain;
      view.setInt16(44 + (i * channels + c) * 2, Math.round(v * (v < 0 ? 32768 : 32767)), true);
    }
  }
  return out;
}

export function waveformPeaks(buffer, start, end, count = 100) {
  const [first, last] = selectionFrames(buffer, start, end);
  const peaks = new Array(count).fill(0);
  for (let b = 0; b < count; b++) {
    const a = first + Math.floor((last - first) * b / count);
    const z = Math.min(last, Math.max(a + 1, first + Math.floor((last - first) * (b + 1) / count)));
    for (let c = 0; c < buffer.numberOfChannels; c++) {
      const data = buffer.getChannelData(c);
      for (let i = a; i < z; i++) if (Number.isFinite(data[i])) peaks[b] = Math.max(peaks[b], Math.abs(data[i]));
    }
  }
  return peaks;
}

// Original, deterministic little music-box phrase; no downloaded samples.
export function makeDemo(context) {
  const buffer = context.createBuffer(2, context.sampleRate * 12, context.sampleRate);
  const notes = [261.6256, 329.6276, 391.9954, 493.8833, 440, 391.9954, 329.6276, 293.6648];
  for (let c = 0; c < 2; c++) {
    const data = buffer.getChannelData(c);
    for (let i = 0; i < data.length; i++) {
      const t = i / buffer.sampleRate;
      let value = 0;
      for (let n = 0; n < notes.length; n++) {
        const dt = t - (0.3 + n * 1.05 + c * 0.013);
        if (dt >= 0) value += Math.sin(2 * Math.PI * notes[n] * dt) * Math.exp(-dt * 1.7) * Math.min(dt * 80, 1) * 0.16 + Math.sin(2 * Math.PI * notes[n] * 2 * dt) * Math.exp(-dt * 4) * Math.min(dt * 80, 1) * 0.035;
      }
      data[i] = value * Math.min(1, (12 - t) / 0.4);
    }
  }
  return buffer;
}
