import { getClock } from '../core/PerformanceClock';
import StrobeEffect from './StrobeEffect';
import BeatZoomEffect from './BeatZoomEffect';
import ShakeEffect from './ShakeEffect';
import WobbleEffect from './WobbleEffect';

/**
 * PerformanceStore — centralized state for all performance effects.
 *
 * - Owns the effect instances
 * - processFrame(canvas) is called from Preview's render loop after shaders
 * - toJSON() serializes full state for WebSocket sync
 */

const DIVISION_OPTIONS = [
  { label: '1/4', value: 0.25 },
  { label: '1/2', value: 0.5 },
  { label: '1',   value: 1 },
  { label: '2',   value: 2 },
  { label: '4',   value: 4 },
  { label: '8',   value: 8 },
];

class PerformanceStore {
  constructor() {
    this.clock = getClock();
    this.effects = [
      new StrobeEffect(),
      new BeatZoomEffect(),
      new ShakeEffect(),
      new WobbleEffect(),
    ];
  }

  /** Called every frame from Preview's render loop (after shaders) */
  processFrame(webglCanvas, overlayCanvas) {
    if (!webglCanvas || !overlayCanvas) return;

    const clockState = this.clock.getState();

    // Update all effects with current clock
    this.effects.forEach(e => e.update(clockState));

    // Sync overlay canvas size with WebGL canvas
    const w = webglCanvas.width;
    const h = webglCanvas.height;
    if (overlayCanvas.width !== w || overlayCanvas.height !== h) {
      overlayCanvas.width = w;
      overlayCanvas.height = h;
    }

    // Get 2D context of the overlay canvas
    const ctx = overlayCanvas.getContext('2d');
    if (!ctx) return;

    // Always copy WebGL frame as base (keep overlay in sync for viewer export)
    ctx.clearRect(0, 0, w, h);
    ctx.drawImage(webglCanvas, 0, 0, w, h);

    // Quick check: any effect active?
    const hasActive = this.effects.some(e => e.enabled || e.isHeld);
    if (!hasActive) return;

    // Apply each active effect in order
    ctx.save();
    this.effects.forEach(e => {
      if (e.enabled || e.isHeld) {
        e.apply(ctx, w, h);
      }
    });
    ctx.restore();

    // Post-frame cleanup
    this.effects.forEach(e => e.postFrame());
  }

  /** Get an effect by id */
  get(id) {
    return this.effects.find(e => e.id === id);
  }

  /** Toggle an effect on/off */
  toggle(id) {
    const eff = this.get(id);
    if (eff) eff.enabled = !eff.enabled;
  }

  /** Set hold state (mousedown/mouseup on HOLD button) */
  setHold(id, held) {
    const eff = this.get(id);
    if (eff) eff.isHeld = held;
  }

  /** Set amount for an effect */
  setAmount(id, val) {
    const eff = this.get(id);
    if (eff) eff.amount = Math.max(0, Math.min(1, val));
  }

  /** Set division for an effect */
  setDivision(id, val) {
    const eff = this.get(id);
    if (eff) eff.division = val;
  }

  /** Reset all effects */
  resetAll() {
    this.effects.forEach(e => e.reset());
  }

  /** Full state snapshot — ready for WebSocket sync */
  toJSON() {
    return {
      bpm: this.clock.bpm,
      isPlaying: this.clock.isPlaying,
      effects: this.effects.map(e => e.toJSON()),
    };
  }

  /** Restore from JSON snapshot */
  fromJSON(json) {
    if (json.bpm) this.clock.setBpm(json.bpm);
    if (json.isPlaying !== undefined) {
      if (json.isPlaying) this.clock.start();
      else this.clock.stop();
    }
    if (json.effects) {
      json.effects.forEach(s => {
        const eff = this.get(s.id);
        if (eff) eff.fromJSON(s);
      });
    }
  }
}

// ── Singleton accessor ──
let _globalStore = null;

export function getPerformanceStore() {
  if (!_globalStore) _globalStore = new PerformanceStore();
  return _globalStore;
}

export { DIVISION_OPTIONS };
export default PerformanceStore;
