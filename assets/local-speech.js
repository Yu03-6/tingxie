/* The independent speech worker returns PCM WAV messages. */
class LocalSpeech {
  constructor() { this.nextId = 0; this.pending = new Map(); this.ready = null; }
  initialize() {
    if (this.ready) return this.ready;
    this.ready = new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('语音组件加载超时，请检查网络后重试。')), 30000);
      this.worker = new Worker('assets/vendor/mespeak/mespeak-core.js');
      this.worker.onerror = () => {
        clearTimeout(timer); reject(new Error('本地语音组件无法加载。'));
        for (const job of this.pending.values()) { clearTimeout(job.timer); job.reject(new Error('本地语音合成失败。')); }
        this.pending.clear(); this.worker.terminate(); this.ready = null;
      };
      this.worker.onmessage = async ({ data }) => {
        if (data.rsp === 'ready') {
          try {
            await this.request('loadVoice', [new URL('assets/vendor/mespeak/voices/en/en-us.json', document.baseURI).href]);
            await this.request('loadVoice', [new URL('assets/vendor/mespeak/voices/zh.json', document.baseURI).href]);
            clearTimeout(timer); resolve();
          } catch (error) { clearTimeout(timer); reject(error); }
          return;
        }
        const job = this.pending.get(String(data.jobId));
        if (!job) return;
        this.pending.delete(String(data.jobId)); clearTimeout(job.timer);
        if (data.success === false) job.reject(new Error('语音字典加载失败。'));
        else job.resolve(data.audiodata || data.message);
      };
    }).catch(error => {
      this.worker?.terminate(); this.ready = null;
      for (const job of this.pending.values()) { clearTimeout(job.timer); job.reject(error); }
      this.pending.clear(); throw error;
    });
    return this.ready;
  }
  request(job, args) {
    return new Promise((resolve, reject) => {
      const id = String(++this.nextId);
      const timer = setTimeout(() => { this.pending.delete(id); reject(new Error('语音生成超时，请缩短当前内容后重试。')); }, 30000);
      this.pending.set(id, { resolve, reject, timer });
      this.worker.postMessage({ job, jobId: id, args });
    });
  }
  async synthesize(item) {
    await this.initialize();
    const chinese = item.language?.startsWith('zh');
    const text = chinese ? pinyinPro.pinyin(item.text, { toneType: 'num', nonZh: 'consecutive' }) : item.text;
    return this.request('speak', ['-w', 'wav.wav', '-a', '100', '-g', '1', '-p', '50', '-s', '155', '-b', '1', '-v', chinese ? 'zh' : 'en-us', '--path=/espeak', '--', text]);
  }
}
if (typeof module !== 'undefined') module.exports = { LocalSpeech };
