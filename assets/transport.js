class SpeechTransport {
  constructor() {
    this.audio = new Audio(); this.audio.preload = 'auto'; this.token = 0;
    this.watchdog = null; this.fetchController = null; this.utterance = null; this.local = new LocalSpeech();
    this.cache = new Map(); this.context = null; this.source = null;
  }
  unlock() {
    const Context = window.AudioContext || window.webkitAudioContext;
    if (!Context) return;
    if (!this.context || this.context.state === 'closed') this.context = new Context();
    if (this.context.state === 'suspended') this.context.resume().catch(() => {});
  }
  stop() {
    this.token++; clearTimeout(this.watchdog);
    this.fetchController?.abort(); this.fetchController = null;
    if (this.utterance) this.utterance.onstart = this.utterance.onend = this.utterance.onerror = null;
    this.audio.onended = null; this.audio.onerror = null; this.audio.pause();
    if (this.source) { this.source.onended = null; try { this.source.stop(); } catch {} this.source.disconnect(); this.source = null; }
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    this.utterance = null;
  }
  async playBuffer(buffer, rate, token, onEnd) {
    const decoded = await this.context.decodeAudioData(buffer.slice(0));
    if (token !== this.token) return;
    if (this.context.state !== 'running') throw new Error('浏览器暂停了声音，请点击重试以启用播放。');
    this.source = this.context.createBufferSource(); this.source.buffer = decoded;
    this.source.playbackRate.value = rate; this.source.connect(this.context.destination);
    this.source.onended = () => { if (token === this.token) onEnd(); };
    this.source.start();
  }
  play(item, rate, onEnd, onError) {
    this.stop(); this.unlock(); const token = this.token;
    let settled = false;
    const end = () => { if (!settled && token === this.token) { settled = true; clearTimeout(this.watchdog); onEnd(); } };
    const fail = message => { if (!settled && token === this.token) { settled = true; clearTimeout(this.watchdog); onError(message); } };
    const local = async () => {
      clearTimeout(this.watchdog);
      if (token !== this.token) return;
      if ('speechSynthesis' in window) window.speechSynthesis.cancel();
      try {
        const key = `${item.language}:${item.text}`;
        let buffer = this.cache.get(key);
        if (!buffer) {
          buffer = await this.local.synthesize(item);
          if (this.cache.size >= 100) this.cache.delete(this.cache.keys().next().value);
          this.cache.set(key, buffer);
        }
        if (token !== this.token) return;
        if (!this.context) throw new Error('当前浏览器不支持本地语音播放，请在系统浏览器打开。');
        await this.playBuffer(buffer, rate, token, end);
      } catch (error) { fail(error.message || '语音生成失败，请重试。'); }
    };
    if (item.audio) {
      if (this.context) {
        const controller = new AbortController(); this.fetchController = controller;
        this.watchdog = setTimeout(() => { controller.abort(); fail('音频加载超时，请检查网络后点击重试。'); }, 30000);
        fetch(item.audio, { signal: controller.signal }).then(response => {
          if (!response.ok) throw new Error('音频未加载成功，请检查网络后点击重试。');
          return response.arrayBuffer();
        }).then(buffer => {
          if (token !== this.token || settled) return;
          clearTimeout(this.watchdog); this.fetchController = null;
          return this.playBuffer(buffer, rate, token, end);
        }).catch(error => fail(error.message));
      } else {
        this.audio.src = item.audio; this.audio.playbackRate = rate;
        this.audio.onended = end; this.audio.onerror = () => fail('音频未加载成功，请检查网络后点击重试。');
        this.audio.play().catch(() => fail('浏览器未允许播放，请点击重试，并检查媒体音量。'));
      }
      return;
    }
    const preferLocal = item.voiceMode === 'local' || (/Android/i.test(navigator.userAgent) && /MicroMessenger/i.test(navigator.userAgent));
    if (preferLocal || !('speechSynthesis' in window) || !window.SpeechSynthesisUtterance) { local(); return; }
    const utterance = new SpeechSynthesisUtterance(item.text);
    const language = item.language || (/[\u3400-\u9fff]/u.test(item.text) ? 'zh-CN' : 'en-US');
    const voices = window.speechSynthesis.getVoices();
    const voice = voices.find(v => v.lang.toLowerCase() === language.toLowerCase()) || voices.find(v => v.lang.startsWith(language.split('-')[0]));
    if (voice) utterance.voice = voice;
    utterance.lang = language; utterance.rate = rate; this.utterance = utterance;
    let fallingBack = false;
    const fallback = () => { if (fallingBack || token !== this.token) return; fallingBack = true; utterance.onend = null; utterance.onerror = null; local(); };
    utterance.onstart = () => { if (token === this.token) clearTimeout(this.watchdog); };
    utterance.onend = () => { this.utterance = null; end(); };
    utterance.onerror = fallback;
    this.watchdog = setTimeout(fallback, 5000);
    try { window.speechSynthesis.speak(utterance); } catch { fallback(); }
  }
}
if (typeof module !== 'undefined') module.exports = { SpeechTransport };
