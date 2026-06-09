/**
 * PerformanceClock — shared tempo engine for all performance effects.
 *
 * Manages BPM, beat phase, and playback state via rAF loop.
 * Provides tap-BPM with rolling average stabilization.
 *
 * TODO: throttle context updates (~30fps) when consumed by many components
 */

const TAP_HISTORY_MAX = 10;
const MIN_TAPS_FOR_AVG = 4;
const BEATS_PER_BAR = 4;
const BPM_MIN = 20;
const BPM_MAX = 300;

class PerformanceClock {
  constructor() {
    this.bpm = 128;
    this.isPlaying = true;     // start by default so FX can be activated immediately
    this.phase = 0;            // 0..1 within current beat
    this.currentBeat = 1;      // 1..BEATS_PER_BAR

    this.tapHistory = [];
    this.smoothedBpm = 128;

    this._lastTickTime = performance.now();
    this._rafId = null;
    this._listeners = new Set();
    this._boundTick = this._tick.bind(this);

    // Kick off the rAF loop immediately
    this._rafId = requestAnimationFrame(this._boundTick);
  }

  /** Interval of one beat in milliseconds */
  get beatInterval() {
    return 60000 / this.bpm;
  }

  /** Register a manual tap. Calculates BPM from history but does NOT auto-start. */
  tap() {
    const now = performance.now();

    // Debounce taps faster than 80ms
    if (this.tapHistory.length > 0 && now - this.tapHistory[this.tapHistory.length - 1] < 80) return;

    this.tapHistory.push(now);
    if (this.tapHistory.length > TAP_HISTORY_MAX) {
      this.tapHistory.shift();
    }

    // Calculate smoothed BPM from intervals (only with enough taps)
    if (this.tapHistory.length >= MIN_TAPS_FOR_AVG) {
      const intervals = [];
      for (let i = 1; i < this.tapHistory.length; i++) {
        intervals.push(this.tapHistory[i] - this.tapHistory[i - 1]);
      }

      // Only trim outliers when we have enough data points
      let trimmed = intervals;
      if (intervals.length >= 6) {
        intervals.sort((a, b) => a - b);
        const trim = Math.floor(intervals.length * 0.15);
        trimmed = intervals.slice(trim, intervals.length - trim);
      }

      if (trimmed.length > 0) {
        const avgInterval = trimmed.reduce((a, b) => a + b, 0) / trimmed.length;
        this.smoothedBpm = Math.max(BPM_MIN, Math.min(BPM_MAX, Math.round(60000 / avgInterval)));
        this.bpm = this.smoothedBpm;
      }
    }

    // Don't auto-start — user controls start/stop via the button
    this._notify();
  }

  /** Start the clock from beat 1 */
  start() {
    if (this.isPlaying) return;
    this.isPlaying = true;
    this._lastTickTime = performance.now();
    this.phase = 0;
    this.currentBeat = 1;
    this._tick();
    this._notify();
  }

  /** Stop the clock and reset phase/beat */
  stop() {
    if (!this.isPlaying) return;
    this.isPlaying = false;
    if (this._rafId) {
      cancelAnimationFrame(this._rafId);
      this._rafId = null;
    }
    this.phase = 0;
    this.currentBeat = 0;
    this._notify();
  }

  /** Toggle play/stop */
  toggle() {
    if (this.isPlaying) this.stop();
    else this.start();
  }

  /** Set BPM manually (e.g. from number input). Clears tap history. */
  setBpm(bpm) {
    const newBpm = Math.max(BPM_MIN, Math.min(BPM_MAX, Math.round(bpm)));
    if (newBpm === this.bpm) return;

    // Preserve phase continuity by adjusting last tick time
    const oldInterval = this.beatInterval;
    this.bpm = newBpm;
    this.smoothedBpm = this.bpm;

    if (this.isPlaying) {
      const now = performance.now();
      const currentPhase = (now - this._lastTickTime) / oldInterval;
      this._lastTickTime = now - currentPhase * this.beatInterval;
    }

    // Clear tap history so new taps don't mix with old data
    this.clearTaps();
    this._notify();
  }

  /** Reset tap history */
  clearTaps() {
    this.tapHistory = [];
  }

  /** Subscribe to clock state updates. Returns unsubscribe fn. */
  subscribe(listener) {
    this._listeners.add(listener);
    listener(this.getState()); // fire current state immediately
    return () => this._listeners.delete(listener);
  }

  _tick() {
    if (!this.isPlaying) return;

    const now = performance.now();
    const elapsed = now - this._lastTickTime;
    const interval = this.beatInterval;

    if (elapsed >= interval) {
      const beatsPassed = Math.floor(elapsed / interval);
      this.currentBeat = ((this.currentBeat - 1 + beatsPassed) % BEATS_PER_BAR) + 1;
      this._lastTickTime += beatsPassed * interval;
    }

    this.phase = Math.min(1, (now - this._lastTickTime) / interval);
    this._notify();
    this._rafId = requestAnimationFrame(this._boundTick);
  }

  _notify() {
    const state = this.getState();
    this._listeners.forEach(fn => fn(state));
  }

  getState() {
    return {
      bpm: this.bpm,
      currentBeat: this.currentBeat,
      phase: this.phase,
      isPlaying: this.isPlaying,
      displayBpm: this.smoothedBpm,
    };
  }

  dispose() {
    this.stop();
    this._listeners.clear();
    this.tapHistory = [];
  }
}

// ── Singleton accessor ──
let _globalClock = null;

export function getClock() {
  if (!_globalClock) _globalClock = new PerformanceClock();
  return _globalClock;
}

export default PerformanceClock;
