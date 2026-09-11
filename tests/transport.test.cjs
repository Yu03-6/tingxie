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
test('a synchronous native speech exception uses local speech instead of leaving playback stuck', async () => {
  const { transport, sources, resolve } = setup();
  global.SpeechSynthesisUtterance = class {};
  window.SpeechSynthesisUtterance = global.SpeechSynthesisUtterance;
  window.speechSynthesis = { cancel() {}, getVoices: () => [], speak() { throw new Error('Speech engine unavailable'); } };
  assert.doesNotThrow(() => transport.play({ text: 'hello', language: 'en-US' }, 1, () => {}, assert.fail));
  resolve(new ArrayBuffer(48)); await flush();
  assert.equal(sources.length, 1);
  transport.stop();
});

test('stopping an MP3 download aborts it without reporting an error', async () => {
  const { transport, sources } = setup();
  const originalFetch = global.fetch; let signal; let errors = 0;
  global.fetch = (_, options) => { signal = options?.signal; return new Promise(() => {}); };
  try {
    transport.play({ audio: 'audio.mp3' }, 1, assert.fail, () => errors++);
    transport.stop(); await flush();
    assert.equal(signal?.aborted, true);
    assert.equal(errors, 0); assert.equal(sources.length, 0);
  } finally { global.fetch = originalFetch; transport.stop(); }
});

test('a stalled MP3 download times out once and ignores late data', async () => {
  const { transport, sources } = setup();
  const originalFetch = global.fetch, originalSet = global.setTimeout, originalClear = global.clearTimeout;
  let timeout, finish, signal; const errors = [];
  global.setTimeout = fn => { timeout = fn; return 1; }; global.clearTimeout = () => {};
  global.fetch = (_, options) => { signal = options?.signal; return new Promise(resolve => { finish = resolve; }); };
  try {
    transport.play({ audio: 'audio.mp3' }, 1, assert.fail, message => errors.push(message));
    assert.equal(typeof timeout, 'function'); timeout();
    assert.equal(signal.aborted, true); assert.equal(errors.length, 1);
    assert.match(errors[0], /超时/);
    finish({ ok: true, arrayBuffer: async () => new ArrayBuffer(48) }); await flush();
    assert.equal(sources.length, 0);
  } finally { transport.stop(); global.fetch = originalFetch; global.setTimeout = originalSet; global.clearTimeout = originalClear; }
});
