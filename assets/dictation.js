/* One playback session owns its transport, timers, and completion callbacks. */
class DictationEngine {
  constructor(transport, notify = () => {}, clock = {}) {
    this.transport = transport;
    this.notify = notify;
    this.clock = { now: () => Date.now(), set: (fn, ms) => setTimeout(fn, ms), clear: id => clearTimeout(id), ...clock };
    this.status = 'idle'; this.epoch = 0; this.items = []; this.timer = null;
  }
  snapshot() { return { status: this.status, index: this.index || 0, round: this.round || 1, repetition: this.repetition || 1, total: this.items.length, message: this.message || '', spokenCount: this.spokenCount || 0, skippedCount: this.skippedCount || 0 }; }
  emit() { this.notify(this.snapshot()); }
  clearTimer() { if (this.timer !== null) this.clock.clear(this.timer); this.timer = null; }
  invalidate() { this.epoch++; this.clearTimer(); this.transport.stop(); }
  start(items, config) {
    this.invalidate(); this.items = [...items]; this.config = config;
    this.index = 0; this.round = 1; this.repetition = 1; this.message = ''; this.spokenCount = 0; this.skippedCount = 0;
    if (!items.length) { this.status = 'idle'; this.emit(); return; }
    this.play();
  }
  play() {
    this.status = 'speaking'; this.message = ''; const token = ++this.epoch; this.emit();
    this.transport.play(this.items[this.index], this.config.rate, () => {
      if (token !== this.epoch || this.status !== 'speaking') return;
      this.spokenCount++; this.advance();
    }, message => {
      if (token !== this.epoch) return;
      this.clearTimer(); this.status = 'error'; this.message = message; this.emit();
    });
  }
  advance() {
    let delay = this.config.repeatGap;
    if (this.repetition < this.config.repeat) this.repetition++;
    else {
      this.repetition = 1; delay = this.config.itemGap;
      if (this.index + 1 < this.items.length) this.index++;
      else if (this.round < this.config.rounds) { this.round++; this.index = 0; }
      else { this.status = 'completed'; this.emit(); return; }
    }
    this.wait(delay * 1000);
  }
  wait(ms) {
    this.status = 'waiting'; this.remaining = ms; this.deadline = this.clock.now() + ms; this.emit();
    const token = this.epoch;
    this.timer = this.clock.set(() => { this.timer = null; if (token === this.epoch && this.status === 'waiting') this.play(); }, ms);
  }
  pause() {
    if (!['speaking', 'waiting'].includes(this.status)) return;
    this.pausedFrom = this.status;
    if (this.status === 'waiting') { this.remaining = Math.max(0, this.deadline - this.clock.now()); this.clearTimer(); }
    else { this.epoch++; this.transport.stop(); }
    this.status = 'paused'; this.emit();
  }
  resume() { if (this.status !== 'paused') return; this.pausedFrom === 'waiting' ? this.wait(this.remaining) : this.play(); }
  retry() { if (this.items.length) { this.invalidate(); this.play(); } }
  seek(index) {
    if (!Number.isInteger(index) || index < 0 || index >= this.items.length || !['speaking', 'waiting', 'paused', 'error', 'completed'].includes(this.status)) return;
    this.invalidate(); this.index = index; this.repetition = 1; this.play();
  }
  skip() {
    if (!this.items.length || ['completed','stopped','idle'].includes(this.status)) return;
    const paused = this.status === 'paused'; this.invalidate(); this.repetition = 1; this.skippedCount++;
    if (this.index + 1 < this.items.length) this.index++;
    else if (this.round < this.config.rounds) { this.round++; this.index = 0; }
    else { this.status = 'completed'; this.emit(); return; }
    if (paused) { this.status = 'paused'; this.pausedFrom = 'speaking'; this.emit(); } else this.play();
  }
  stop() { this.invalidate(); this.index = 0; this.round = 1; this.repetition = 1; this.message = ''; this.status = 'stopped'; this.emit(); }
}
if (typeof module !== 'undefined') module.exports = { DictationEngine };
