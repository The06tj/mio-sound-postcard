export const themes = ['cream', 'rose', 'blue', 'night'];
export const escapeHTML = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const timeLabel = value => `${Math.floor((Number.isFinite(value) ? value : 0) / 60)}:${String(Math.floor((Number.isFinite(value) ? value : 0) % 60)).padStart(2, '0')}`;
export function waveMarkup(peaks) {
  const safe = peaks.map(p => Number.isFinite(p) ? Math.max(0, Math.min(1, p)) : 0);
  const peak = Math.max(0.02, ...safe);
  return safe.map((p, i) => { const h = 3 + 61 * Math.sqrt(p / peak); return `<rect x="${i * 6.4}" y="${(72 - h) / 2}" width="3.4" height="${h}" rx="1.7"/>`; }).join('');
}
export function cardMarkup(data, stamp, audio = '') {
  const zh = data.lang === 'zh';
  const e = escapeHTML;
  return `<article class="postcard theme-${themes.includes(data.theme) ? data.theme : 'cream'}" aria-label="${zh ? '声音明信片' : 'Sound postcard'}">
    <div class="card-top"><span class="card-kicker">MIO SOUND POSTCARD</span><span class="card-edition">A MOMENT, KEPT.</span></div>
    <div class="card-body"><div class="card-story"><p class="card-greeting"><span data-to-label>${zh ? '亲爱的' : 'Dear'}</span> <span data-recipient>${e(data.recipient)}</span><span> ,</span></p><p class="card-message" data-message>${e(data.message)}</p><p class="card-signature"><span data-from-label>${zh ? '来自' : 'With love,'}</span> <span data-sender>${e(data.sender)}</span></p></div>
    <div class="card-address"><div class="stamp-area"><div class="stamp"><img src="${e(stamp)}" alt="" width="112" height="112"><span>MIO · SOUND MAIL</span></div><div class="postmark" aria-hidden="true"><span>SENT WITH</span><strong>LOVE</strong><span>听 · 见 · 此 · 刻</span></div></div><div class="address-lines"><span data-place-label>${zh ? '声音来自' : 'A little sound from'}</span><strong data-place>${e(data.place)}</strong><time data-date>${e(data.date)}</time></div><span class="airmail">PAR AVION · BY SOUND</span></div></div>
    <div class="card-player"><audio preload="metadata" controls src="${e(audio)}"></audio><div class="custom-player"><button class="play-button" type="button" aria-label="${zh ? '播放声音' : 'Play sound'}" data-play>▶</button><div class="wave-area"><svg class="waveform" viewBox="0 0 640 72" preserveAspectRatio="none" role="img" aria-label="${zh ? '声音波形' : 'Audio waveform'}">${waveMarkup(data.peaks || new Array(100).fill(0))}</svg><input class="seek" data-seek type="range" min="0" max="${data.duration || 1}" value="0" step="0.01" aria-label="${zh ? '播放进度' : 'Playback position'}"></div><span class="play-time" data-time>0:00</span></div><div class="sound-caption"><span data-listen>${zh ? '按下播放，听见这一刻。' : 'Press play. Be here for a moment.'}</span><span data-duration>${timeLabel(data.duration)}</span></div><p class="player-error" data-player-error role="status"></p></div>
    <div class="card-bottom"><span>♥ <span data-made>${zh ? '把这一刻，寄给你。' : 'A little closer, wherever you are.'}</span></span><span>01 / 01</span></div>
  </article>`;
}

// Self-contained by design: this exact function is also embedded in exported cards.
export function attachPlayer(root, language = 'en') {
  const audio = root.querySelector('audio'), play = root.querySelector('[data-play]'), seek = root.querySelector('[data-seek]');
  const time = root.querySelector('[data-time]'), error = root.querySelector('[data-player-error]');
  const zh = () => root.closest('[lang]')?.getAttribute('lang')?.startsWith('zh') || language === 'zh';
  const format = v => `${Math.floor((v || 0) / 60)}:${String(Math.floor((v || 0) % 60)).padStart(2, '0')}`;
  const update = () => {
    const duration = Number.isFinite(audio.duration) ? audio.duration : Number(seek.max);
    seek.max = duration || 1; seek.value = audio.currentTime || 0;
    time.textContent = format(audio.currentTime);
    seek.setAttribute('aria-valuetext', `${format(audio.currentTime)} / ${format(duration)}`);
    play.textContent = audio.paused ? '▶' : 'Ⅱ';
    play.setAttribute('aria-label', audio.paused ? (zh() ? '播放声音' : 'Play sound') : (zh() ? '暂停声音' : 'Pause sound'));
    root.querySelectorAll('.waveform rect').forEach((bar, i, bars) => bar.classList.toggle('heard', i / bars.length < audio.currentTime / duration));
  };
  play.addEventListener('click', async () => {
    error.textContent = '';
    if (!audio.paused) { audio.pause(); return; }
    try { if (audio.ended) audio.currentTime = 0; await audio.play(); }
    catch { error.textContent = zh() ? '暂时无法播放。请用浏览器重新打开这张卡片。' : 'Could not play. Try opening this card in a browser.'; }
    update();
  });
  seek.addEventListener('input', () => { if (Number.isFinite(audio.duration)) audio.currentTime = Number(seek.value); update(); });
  ['timeupdate', 'play', 'pause', 'ended', 'loadedmetadata', 'emptied'].forEach(event => audio.addEventListener(event, update));
  root.classList.add('enhanced'); update();
  return { audio, update };
}

export function exportHTML(data, audioDataURL, stampDataURL, css) {
  if (!/^data:audio\/wav;base64,[A-Za-z0-9+/=]+$/.test(audioDataURL) || !/^data:image\/(webp|png);base64,[A-Za-z0-9+/=]+$/.test(stampDataURL)) throw new Error('Export assets must be embedded');
  const zh = data.lang === 'zh';
  return `<!doctype html><html lang="${zh ? 'zh-CN' : 'en'}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src data:; media-src data:; style-src 'unsafe-inline'; script-src 'unsafe-inline'; connect-src 'none'; base-uri 'none'; form-action 'none'"><title>${escapeHTML(zh ? '给 ' + data.recipient + ' 的声音明信片' : 'A sound postcard for ' + data.recipient)}</title><style>${css}</style></head><body class="received"><main><p class="received-intro">${zh ? '有人把这一刻，寄给了你。' : 'Someone saved a little moment for you.'}</p>${cardMarkup(data, stampDataURL, audioDataURL)}<p class="received-note">${zh ? '这张明信片自带声音，可以留存，也可以离线聆听。' : 'The sound lives in this card. Keep it. Play it offline. Share a moment.'}</p></main><script>(${attachPlayer.toString()})(document.querySelector('.postcard'), '${zh ? 'zh' : 'en'}');</script></body></html>`;
}
