import test from 'node:test';
import assert from 'node:assert/strict';
import { encodeWav, selectionFrames, waveformPeaks } from '../src/audio.js';
import { exportHTML, escapeHTML, cardMarkup } from '../src/postcard.js';
function fixture(rate=48000, seconds=1, channels=2) {
 const arrays=Array.from({length:channels},(_,c)=>Float32Array.from({length:Math.round(rate*seconds)},(_,i)=>c===0 ? 0.5 : -0.25));
 return {sampleRate:rate,length:arrays[0].length,duration:arrays[0].length/rate,numberOfChannels:channels,getChannelData:c=>arrays[c]};
}
test('PCM WAV has correct sizes, sample rate, stereo interleaving and equal edge fades',()=>{
 const b=fixture(), view=new DataView(encodeWav(b,.25,.75));
 assert.equal(view.byteLength,44+24000*4); assert.equal(view.getUint32(4,true),view.byteLength-8);
 assert.equal(view.getUint32(24,true),48000); assert.equal(view.getUint16(22,true),2);
 assert.equal(view.getUint32(28,true),192000); assert.equal(view.getUint16(32,true),4);
 assert.equal(view.getInt16(44,true),0); assert.equal(view.getInt16(view.byteLength-2,true),0);
 assert.equal(view.getInt16(44+1000*4,true),16384); assert.equal(view.getInt16(46+1000*4,true),-8192);
 assert.equal(b.getChannelData(0)[12000],0.5);
});
test('44.1 kHz mono and exact 30 second boundaries',()=>{
 const b=fixture(44100,32,1), v=new DataView(encodeWav(b,2,32));
 assert.equal(v.byteLength,44+30*44100*2); assert.equal(v.getUint32(24,true),44100);
 assert.deepEqual(selectionFrames(b,2,32),[88200,1411200]);
 assert.throws(()=>encodeWav(b,1,32),RangeError);
});
test('Invalid, reversed, out-of-bounds, nonfinite selections and multichannel input rejected',()=>{
 const b=fixture();
 for(const pair of [[0,0],[1,0],[-1,.5],[NaN,.5],[0,Infinity],[0,1.1],[2,3]]) assert.throws(()=>encodeWav(b,...pair),RangeError);
 assert.throws(()=>encodeWav(fixture(48000,1,3)),RangeError);
});
test('Stereo peak envelope does not erase opposite-polarity content',()=>{
 const b=fixture(); b.getChannelData(1).fill(-.5);
 assert.equal(waveformPeaks(b,0,1).length,100); assert.ok(waveformPeaks(b,0,1).every(x=>x===.5));
});
test('Nonfinite samples become silence and full-scale samples are clamped',()=>{
 const b=fixture(48000,1,1), arr=b.getChannelData(0);
 arr[1000]=NaN; arr[1001]=Infinity; arr[1002]=2;arr[1003]=-2;
 const v=new DataView(encodeWav(b));
 assert.equal(v.getInt16(44+2000,true),0);assert.equal(v.getInt16(44+2002,true),0);
 assert.equal(v.getInt16(44+2004,true),32767);assert.equal(v.getInt16(44+2006,true),-32768);
});
test('User text cannot break out of exported markup or script',()=>{
 const payload='</script><img src=x onerror=alert(1)> & " \u2028 你好🥰';
 const html=exportHTML({recipient:payload,sender:payload,message:payload,place:payload,date:payload,theme:'night" onclick="alert(1)',lang:'zh',duration:1,peaks:[.2,.4]},'data:audio/wav;base64,AAAA','data:image/webp;base64,AAAA','body{}');
 assert.ok(!html.includes('<img src=x')); assert.ok(!html.includes('onclick='));
 assert.ok(html.includes(escapeHTML(payload)));assert.equal((html.match(/<script>/g)||[]).length,1);
 assert.equal((html.match(/<\/script>/g)||[]).length,1);assert.ok(html.includes('theme-cream'));
 assert.ok(html.includes("connect-src 'none'"));assert.ok(!html.includes('blob:'));
});
test('Export rejects non-embedded assets',()=>{
 assert.throws(()=>exportHTML({},'blob:any','data:image/png;base64,AAAA',''));
 assert.throws(()=>exportHTML({},'data:audio/wav;base64,AAAA','https://example.com/a.png',''));
});
test('Card text handles newlines, quotes and emoji without hidden metadata',()=>{
 const markup=cardMarkup({message:'hello\n你好🥰',recipient:'A&B',sender:'<Mio>',place:'"here"',date:'2026',duration:1,peaks:[]},'stamp.webp');
 assert.ok(markup.includes('hello\n你好🥰'));assert.ok(markup.includes('A&amp;B'));assert.ok(markup.includes('&lt;Mio&gt;'));
 assert.ok(!markup.includes('filename'));
});

