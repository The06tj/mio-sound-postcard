import { encodeWav, waveformPeaks, makeDemo, selectionFrames } from './audio.js';
import { cardMarkup, attachPlayer, exportHTML, waveMarkup, timeLabel } from './postcard.js';
import { copy } from './i18n.js';
const $ = selector => document.querySelector(selector);
const stampURL = new URL('../assets/sunset-stamp.webp', import.meta.url).href;
let lang = 'en';
try { lang = localStorage.getItem('mio-postcard-language') === 'zh' ? 'zh' : 'en'; } catch {}
let theme = 'cream', buffer = null, wav = null, peaks = [], audioURL = '', sourceName = '', isDemo = false, loading = false, exporting = false, sequence = 0, valid = false;
let start = 0, end = 0;
const today = new Date();
let statusKey = '';
const t = key => copy[lang][key];
const dateText = () => lang === 'zh' ? today.toLocaleDateString('zh-CN', {year:'numeric',month:'long',day:'numeric'}) : today.toLocaleDateString('en-GB', {day:'2-digit',month:'short',year:'numeric'}).toUpperCase();
function data() { return {lang,theme,recipient:$('#recipient').value,sender:$('#sender').value,message:$('#message').value,place:$('#place').value,date:dateText(),duration:end-start,peaks}; }
$('#card-mount').innerHTML = cardMarkup(data(), stampURL);
const card = $('#card-mount .postcard');
const player = attachPlayer(card);
let dialogPlayer = null;
function status(key) { statusKey = key; $('#status').textContent = key ? t(key) : ''; }
function availability() {
  const ready = !!wav && valid && !loading && !exporting;
  $('#download').disabled = !ready; $('#open-preview').disabled = !ready;
  card.querySelector('[data-play]').disabled = !ready; card.querySelector('[data-seek]').disabled = !ready;
  $('#download').setAttribute('aria-busy', exporting ? 'true' : 'false');
}
function updateText() {
  for (const key of ['recipient','sender','message','place']) card.querySelector('[data-'+key+']').textContent = $('#'+key).value;
  card.querySelector('[data-date]').textContent = dateText();
  $('#char-count').textContent = $('#message').value.length + ' / 240';
}
function details() {
  $('#trim-panel').hidden = !buffer;
  if (!buffer) return;
  $('#file-title').textContent = isDemo ? t('demoName') : sourceName;
  $('#file-subtitle').textContent = t('replace');
  $('#selection-label').textContent = (valid ? (end-start).toFixed(1) : '—') + ' s ' + t('selected');
  $('#source-length').textContent = timeLabel(buffer.duration) + ' ' + t('source');
  if (wav) $('#export-size').textContent = t('size') + ' ' + ((wav.byteLength * 4/3 + 50000) / 1000000).toFixed(1) + ' MB · .html';
}
function setLanguage(next) {
  const old = lang;
  for (const [id,key] of [['recipient','sampleRecipient'],['sender','sampleSender'],['message','sampleMessage'],['place','samplePlace']]) {
    if ($('#'+id).value === copy[old][key] || (old === next && $('#'+id).value === copy.en[key])) $('#'+id).value = copy[next][key];
  }
  lang = next;
  document.documentElement.lang = lang === 'zh' ? 'zh-CN' : 'en';
  document.title = lang === 'zh' ? 'Mio Sound Postcard — 把这一刻，寄给你。' : 'Mio Sound Postcard — A moment, kept.';
  document.querySelectorAll('[data-i18n]').forEach(el => {
    if (el.dataset.i18n === 'headline') el.innerHTML = t('headline');
    else el.textContent = t(el.dataset.i18n);
  });
  document.querySelectorAll('[data-lang]').forEach(el => el.setAttribute('aria-pressed', String(el.dataset.lang === lang)));
  for (const [attr,key] of [['to-label','dear'],['from-label','withLove'],['place-label','place'],['listen','listen'],['made','made']]) card.querySelector('[data-'+attr+']').textContent = t(key);
  card.querySelector('[data-seek]').setAttribute('aria-label', t('seek'));
  card.setAttribute('aria-label', lang === 'zh' ? '声音明信片' : 'Sound postcard');
  card.querySelector('.waveform').setAttribute('aria-label', t('wave'));
  $('.editor').setAttribute('aria-label', t('editorLabel'));
  $('.canvas-column').setAttribute('aria-label', t('previewLabel'));
  $('.theme-list').setAttribute('aria-label', t('paperLabel'));
  try { localStorage.setItem('mio-postcard-language', lang); } catch {}
  updateText(); details(); player.update(); status(statusKey);
}
document.querySelectorAll('[data-lang]').forEach(el => el.addEventListener('click', () => setLanguage(el.dataset.lang)));
document.querySelectorAll('[data-theme]').forEach(el => el.addEventListener('click', () => {
  theme = el.dataset.theme; card.className = 'postcard enhanced theme-' + theme;
  document.querySelectorAll('[data-theme]').forEach(button => button.setAttribute('aria-pressed', String(button === el)));
}));
for (const key of ['recipient','sender','message','place']) $('#'+key).addEventListener('input', updateText);
function clearAudio() {
  player.audio.pause(); player.audio.removeAttribute('src'); player.audio.load();
  if (audioURL) URL.revokeObjectURL(audioURL);
  audioURL = ''; wav = null; valid = false; peaks = [];
  $('#export-size').textContent = t('exportHint');
  card.querySelector('.waveform').innerHTML = waveMarkup(new Array(100).fill(0));
  card.querySelector('[data-duration]').textContent = '0:00';
}
function applySelection() {
  if (!buffer) return;
  start = $('#trim-start').valueAsNumber; end = $('#trim-end').valueAsNumber;
  try {
    selectionFrames(buffer, start, end);
    if (end-start < 0.2 - 1/buffer.sampleRate || end-start > 30 + 1/buffer.sampleRate) throw new Error();
    const next = encodeWav(buffer, start, end);
    player.audio.pause();
    if (audioURL) URL.revokeObjectURL(audioURL);
    wav = next; valid = true;
    audioURL = URL.createObjectURL(new Blob([wav], {type:'audio/wav'}));
    player.audio.src = audioURL;
    peaks = waveformPeaks(buffer, start, end);
    card.querySelector('.waveform').innerHTML = waveMarkup(peaks);
    card.querySelector('[data-duration]').textContent = timeLabel(end-start);
    card.querySelector('[data-seek]').max = end-start;
    if (statusKey === 'invalidTrim') status('');
  } catch { clearAudio(); status('invalidTrim'); }
  availability(); details();
}
let trimTimer;
for (const id of ['trim-start','trim-end']) {
  $('#'+id).addEventListener('change', () => { clearTimeout(trimTimer); applySelection(); });
  $('#'+id).addEventListener('input', () => {
    valid = false; player.audio.pause(); availability(); clearTimeout(trimTimer);
    trimTimer = setTimeout(applySelection, 180);
  });
}
function installBuffer(next, name, demo = false) {
  if (next.duration > 300) throw new Error('tooLong');
  if (next.duration < 0.2) throw new Error('tooShort');
  if (next.numberOfChannels > 2) throw new Error('channels');
  buffer = next; sourceName = name; isDemo = demo;
  $('#trim-start').value = '0';
  $('#trim-end').value = Math.min(30, Math.floor(buffer.duration * 1000) / 1000);
  $('#trim-start').max = Math.max(0, buffer.duration - 0.2); $('#trim-end').max = buffer.duration;
  applySelection();
}
function preflightDuration(file) {
  return new Promise(resolve => {
    const media = document.createElement('audio'), url = URL.createObjectURL(file);
    let finished = false;
    const finish = duration => { if(finished)return; finished=true; clearTimeout(timer); media.removeAttribute('src'); media.load(); URL.revokeObjectURL(url); resolve(duration); };
    const timer = setTimeout(() => finish(null), 3500);
    media.preload = 'metadata'; media.onloadedmetadata = () => finish(Number.isFinite(media.duration) ? media.duration : null);
    media.onerror = () => finish(null); media.src = url;
  });
}
async function importFile(file) {
  if (!file) return;
  const token = ++sequence;
  clearTimeout(trimTimer);
  clearAudio(); buffer = null; sourceName = ''; isDemo = false; loading = true;
  $('#trim-panel').hidden = true; $('#file-title').textContent = file.name; $('#file-subtitle').textContent = t('loading');
  status('loading'); availability();
  try {
    if (!file.size) throw new Error('invalidFile');
    if (file.size > 25000000) throw new Error('tooBig');
    const duration = await preflightDuration(file);
    if (token !== sequence) return;
    if (duration > 300) throw new Error('tooLong');
    const context = new OfflineAudioContext(2, 1, 48000);
    const decoded = await context.decodeAudioData(await file.arrayBuffer());
    if (token !== sequence) return;
    installBuffer(decoded, file.name); status('ready');
  } catch (error) {
    if (token !== sequence) return;
    status(['tooBig','tooLong','tooShort','channels'].includes(error.message) ? error.message : 'invalidFile');
    $('#file-title').textContent = t('drop'); $('#file-subtitle').textContent = t('formats');
  } finally {
    if (token === sequence) { loading = false; availability(); details(); }
  }
}
$('#audio-file').addEventListener('change', event => { importFile(event.target.files[0]); event.target.value=''; });
const dropzone = $('#dropzone');
for (const type of ['dragenter','dragover']) dropzone.addEventListener(type, event => { event.preventDefault(); dropzone.classList.add('dragging'); });
for (const type of ['dragleave','drop']) dropzone.addEventListener(type, event => { event.preventDefault(); dropzone.classList.remove('dragging'); });
dropzone.addEventListener('drop', event => importFile(event.dataTransfer.files[0]));
window.addEventListener('dragover', event => event.preventDefault());
window.addEventListener('drop', event => event.preventDefault());
$('#demo').addEventListener('click', () => {
  ++sequence; loading = false; clearAudio();
  try { installBuffer(makeDemo(new OfflineAudioContext(2,1,48000)), '', true); status('ready'); }
  catch { status('invalidFile'); }
  availability(); details();
});
$('#open-preview').addEventListener('click', () => {
  if (!valid || !wav) return;
  player.audio.pause(); $('#dialog-card').innerHTML = cardMarkup(data(), stampURL, audioURL);
  dialogPlayer = attachPlayer($('#dialog-card .postcard'),lang); $('#preview-dialog').showModal();
});
$('#close-preview').addEventListener('click', () => $('#preview-dialog').close());
$('#preview-dialog').addEventListener('close', () => { dialogPlayer?.audio.pause(); $('#dialog-card').replaceChildren(); dialogPlayer = null; });
$('#preview-dialog').addEventListener('click', event => { if (event.target === $('#preview-dialog')) { const r = event.target.getBoundingClientRect(); if(event.clientX<r.left || event.clientX>r.right || event.clientY<r.top || event.clientY>r.bottom) event.target.close(); }});
const toDataURL = blob => new Promise((resolve,reject) => { const reader = new FileReader(); reader.onload=()=>resolve(reader.result); reader.onerror=reject; reader.readAsDataURL(blob); });
let assetsPromise;
function exportAssets() {
  return assetsPromise ||= Promise.all([
    fetch(new URL('./card.css', import.meta.url)).then(r => { if(!r.ok)throw new Error(); return r.text(); }),
    fetch(stampURL).then(r => { if(!r.ok)throw new Error(); return r.blob(); }).then(toDataURL)
  ]).catch(error => { assetsPromise = undefined; throw error; });
}
$('#download').addEventListener('click', async () => {
  if (!wav || !valid || loading || exporting) return;
  const snapshot = data(), selectedWav = wav;
  exporting = true; availability(); status('exporting');
  try {
    const [[css, stamp], sound] = await Promise.all([exportAssets(), toDataURL(new Blob([selectedWav], {type:'audio/wav'}))]);
    const html = exportHTML(snapshot, sound, stamp, css);
    const url = URL.createObjectURL(new Blob([html], {type:'text/html;charset=utf-8'}));
    const a = document.createElement('a'); a.href = url; a.download = 'mio-sound-postcard.html'; document.body.append(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 60000); status('saved');
  } catch { status('exportError'); }
  finally { exporting = false; availability(); }
});
window.addEventListener('pagehide', () => { player.audio.pause(); dialogPlayer?.audio.pause(); });
setLanguage(lang); availability();
