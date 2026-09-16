# Validation — 2026-09-16

## Automated checks

8 focused Node.js tests pass:

- PCM16 WAV header, byte counts, sample rate, stereo interleaving, 5 ms edge fades and original buffer preservation.
- 44.1 kHz mono encoding and an exact 30 second nonzero-start selection.
- Reversed, zero, nonfinite and out-of-bounds selections; unsupported multichannel audio.
- Opposite-polarity stereo waveform detection.
- Nonfinite sample sanitization and full-scale clipping.
- Escaped user text, closing-script payloads, theme allowlisting and embedded-asset enforcement.
- Unicode, emoji, quotes and newline preservation.

The dependency-free static build passes.

## Browser checks

Tested in the available Chromium-based Codex browser and Chrome:

- Empty state, original demo, play/pause, live waveform and 12 second decoded playback.
- English / Chinese switching, localized default text and persistent language.
- Four paper controls and recipient preview.
- 44.1 kHz mono source import; 32 second source capped to 30 seconds.
- Start/end editing, nonzero start, exact 30 second span and rejection of a 32 second span.
- 390 px mobile viewport: document width equals viewport width; visual inspection of the Chinese card.
- Actual Chrome HTML download.

A downloaded demo card was independently inspected with Python's standard-library WAV parser: 12.0 seconds, two channels, 48,000 Hz, 16-bit samples. Its artwork and sound are inline data; it contains no remote src/href assets or blob URL dependencies.

The browser automation policy blocks direct file:// navigation. Consequently, direct offline-file playback was **not** runtime-tested. Editor playback, exported audio bytes and the shared player implementation were verified separately. Safari, Firefox, iOS file-opening behavior and individual chat/email attachment policies were not tested.

## Independent review

A second agent reviewed audio.js, postcard.js and app.js for trim/export correctness and injection. No actionable defects were reported. Browser QA caught an input/change ordering issue in the trim fields, which was fixed by debounced input updates and checked again.

## Scope limits

- The editor requires HTTP/HTTPS; only exported postcards are self-contained.
- No hosted private card URL, cloud upload, audio recording, draft persistence or video export.
- Supported input codecs depend on the browser.
- Limits: 25 MB source, five minutes decoded duration, mono/stereo, 0.2–30 seconds selected.
- Metadata preflight checks duration when available. Unknown-duration compressed inputs may still require a large decode allocation.
- Export uses 48 kHz PCM16 with short edge fades; it is not a lossless copy of the source.

