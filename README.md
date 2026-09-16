# Mio Sound Postcard 💌

**A little sound. A few words. Something to keep.**

[Make a postcard](https://the06tj.github.io/mio-sound-postcard/) · [中文说明](#中文) · [Validation](docs/VALIDATION.md)

Turn a small sound into a personal postcard: the rain outside, a guitar phrase, a familiar voice. Write a note, choose a paper color, and save a single HTML file with the sound inside.

## What it does

- Imports a local audio file, with an original music-box demo to try first.
- Keeps a selected **0.2–30 second** excerpt from a recording up to **5 minutes / 25 MB**.
- Previews the selected waveform with play, pause, seek and a progress highlight.
- Adds a recipient, sender, message, place and today's date.
- Offers Butter, Blush, Air mail and Midnight paper colors.
- Switches between English and Chinese, remembering only the language.
- Exports one self-contained **.html postcard** with inline artwork, styling and PCM WAV audio.

The editor is a static website. There are **no uploads, user accounts, analytics, external fonts, or runtime dependencies**. Only the app's own static assets are fetched. Hosting providers can still receive normal website request metadata.

## Send a postcard

1. Open the app and choose a sound, or try **A little daydream**.
2. Select the start and end in seconds.
3. Write your note and choose your paper.
4. Use **Open your postcard** to see the recipient view.
5. Save the HTML file and send it as a file attachment.

The recipient downloads the file and opens it in a browser. It contains its own sound and requires no hosted audio URL. Chat previews, email services and mobile file previewers may block HTML attachments or scripts; open the downloaded file in a full browser. The card includes native audio controls as a fallback when JavaScript is disabled. This is a file-sharing flow, not a hosted card link.

**Anyone you give the file to can read the note and extract the included sound.** The editor does not store drafts: reloading clears your audio and writing.

## Audio details

Browser decoding support varies. WAV, MP3 and M4A commonly work; unsupported formats get a clear error. Use mono or stereo sources.

Audio is decoded at 48 kHz and exported as 16-bit PCM WAV. A 5 ms fade at each cut edge reduces clicks; the preview and download use the same encoded audio. Original file metadata and filename are not included. There is no loudness normalization, compression, encryption or archival-fidelity claim.

At 30 seconds, stereo sound produces about **7.7 MB** of embedded base64 audio; mono is about **3.8 MB**. The editor shows an approximate size before saving. A source-byte limit and metadata duration check bound typical imports, but decoding unusually compressed files can still be memory intensive.

## Run locally

Requires Node.js 20+ for the small development scripts. There is nothing to install.

~~~sh
npm run dev
# Open http://127.0.0.1:4179
npm test
npm run build
~~~

Serve the editor over HTTP/HTTPS. Opening the editor's index.html directly as a file is not supported because it uses ES modules. **Exported postcards are separate, self-contained files.**

## Publish your own

Fork this repository and select **GitHub Actions** as the Pages source in repository Settings → Pages. The included workflow tests, builds and publishes on a push to main. Change the repository links in index.html and this README for your fork.

## Project map

- src/audio.js — sample-accurate selection, PCM16 WAV, waveform peaks, original demo
- src/postcard.js — escaped card markup, shared player, self-contained export
- src/app.js — editing and local file flow
- src/i18n.js — English / Chinese copy
- src/card.css — shared card and standalone layout
- src/style.css — editor layout
- tests/core.test.mjs — audio boundaries and export safety
- assets/sunset-stamp.webp — original AI-generated stamp art

## 中文

**一小段声音，几句心里话，一张值得留下的明信片。**

把雨声、一段吉他，或一个熟悉的声音，装进可以播放的明信片。写下想说的话，选一张信纸，再把文件送给别人。

- 中英双语，四种信纸，真实声音波形。
- 声音只在你的浏览器里处理，不上传，无需账户。
- 从 5 分钟 / 25 MB 以内的录音中，截取 0.2–30 秒。
- 导出一个自带声音和插画的 HTML 文件，无需依赖线上音频链接。
- 收件人下载后，用浏览器打开。聊天软件和手机文件预览不一定支持播放。
- 刷新页面会清空草稿；只记住语言偏好。
- 你主动发出的文件包含留言和声音，对方可以提取这些内容。

想先试试？点击「试试这一小段白日梦」就能开始。

## Credits and license

Made by Tim & Mio. The short demo phrase is synthesized in code with no borrowed samples. The sunset artwork was generated for this project using OpenAI image generation and optimized locally. No third-party asset pack or audio recording is bundled.

Code and bundled project assets are offered under the [MIT License](LICENSE), to the extent rights apply. You keep responsibility for the sounds and text you choose to share.

