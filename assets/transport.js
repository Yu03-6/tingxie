class SpeechTransport {
  constructor() { this.audio = new Audio(); this.audio.preload = 'auto'; this.token = 0; this.watchdog = null; this.utterance = null; }
  stop() {
    this.token++; clearTimeout(this.watchdog);
    this.audio.onended = null; this.audio.onerror = null; this.audio.pause();
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    this.utterance = null;
  }
  play(item, rate, onEnd, onError) {
    this.stop(); const token = this.token;
    const fail = message => { if (token === this.token) { clearTimeout(this.watchdog); onError(message); } };
    if (item.audio) {
      this.audio.src = item.audio; this.audio.playbackRate = rate;
      this.audio.onended = () => { if (token === this.token) onEnd(); };
      this.audio.onerror = () => fail('音频未加载成功，请检查网络后点击重试。');
      this.audio.play().catch(() => fail('浏览器未允许播放，请点击重试，并检查媒体音量。'));
      return;
    }
    if (!('speechSynthesis' in window) || !window.SpeechSynthesisUtterance) {
      fail('当前浏览器不支持这个自定义词的语音合成。可使用已配音教材词，或在支持系统语音的浏览器打开。'); return;
    }
    const utterance = new SpeechSynthesisUtterance(item.text);
    const language = item.language || (/[\u3400-\u9fff]/u.test(item.text) ? 'zh-CN' : 'en-US');
    const voices = window.speechSynthesis.getVoices();
    const voice = voices.find(v => v.lang.toLowerCase() === language.toLowerCase()) || voices.find(v => v.lang.startsWith(language.split('-')[0]));
    if (voice) utterance.voice = voice;
    utterance.lang = language; utterance.rate = rate; this.utterance = utterance;
    utterance.onstart = () => clearTimeout(this.watchdog);
    utterance.onend = () => { if (token === this.token) { clearTimeout(this.watchdog); this.utterance = null; onEnd(); } };
    utterance.onerror = () => fail('系统语音未能播放。Android 微信可能缺少语音引擎，可使用已配音词条或在系统浏览器打开。');
    this.watchdog = setTimeout(() => fail('系统语音没有响应。请使用已配音词条，或换用支持系统语音的浏览器。'), 8000);
    window.speechSynthesis.speak(utterance);
  }
}
