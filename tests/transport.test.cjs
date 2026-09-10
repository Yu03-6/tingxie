const test = require('node:test');
const assert = require('node:assert/strict');
const { SpeechTransport } = require('../assets/transport.js');
const flush = () => new Promise(resolve => setImmediate(resolve));
function setup() {
  const sources = []; let synthesize;
  global.Audio = class { pause() {} };
  global.LocalSpeech = class { synthesize() { return new Promise(resolve => { synthesize = resolve; }); } };
  global.window = { AudioContext: class {
    constructor() { this.state = 'running'; }
    decodeAudioData(bytes) { return Promise.resolve(bytes); }
    createBufferSource() { const source = { playbackRate: {}, connect() {}, disconnect() {}, stop() {}, start() { source.started = true; } }; sources.push(source); return source; }
  } };
  const transport = new SpeechTransport();
  return { transport, sources, resolve: value => synthesize(value) };
}
test('stopping during local synthesis never starts delayed audio', async () => {
  const { transport, sources, resolve } = setup();
  let ended = 0;
  transport.play({ text: 'new word', language: 'en-US', voiceMode: 'local' }, 1, () => ended++, assert.fail);
  transport.stop(); resolve(new ArrayBuffer(48)); await flush();
  assert.equal(sources.length, 0); assert.equal(ended, 0);
});
test('cached local audio honors playback rate and calls completion only once', async () => {
  const { transport, sources, resolve } = setup(); let ended = 0;
  const item = { text: '重庆', language: 'zh-CN', voiceMode: 'local' };
  transport.play(item, 0.8, () => ended++, assert.fail);
  resolve(new ArrayBuffer(48)); await flush();
  assert.equal(sources[0].playbackRate.value, 0.8);
  sources[0].onended(); sources[0].onended(); assert.equal(ended, 1);
  transport.play(item, 1.2, () => ended++, assert.fail); await flush();
  assert.equal(sources[1].playbackRate.value, 1.2);
  sources[1].onended(); assert.equal(ended, 2);
});
test('failed native speech switches once to local audio', async () => {
  const { transport, sources, resolve } = setup(); let utterance;
  global.SpeechSynthesisUtterance = class {};
  window.SpeechSynthesisUtterance = global.SpeechSynthesisUtterance;
  window.speechSynthesis = { cancel() {}, getVoices: () => [], speak: value => { utterance = value; } };
  let ended = 0;
  transport.play({ text: 'new word', language: 'en-US' }, 1, () => ended++, assert.fail);
  utterance.onerror(); resolve(new ArrayBuffer(48)); await flush();
  assert.equal(sources.length, 1); sources[0].onended(); assert.equal(ended, 1);
});
