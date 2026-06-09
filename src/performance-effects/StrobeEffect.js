import PerformanceEffect from './PerformanceEffect';

/**
 * StrobeEffect — flashes the canvas white on each trigger.
 * Intensity (amount): 0 = subtle flash, 1 = full white blast.
 */

export default class StrobeEffect extends PerformanceEffect {
  constructor() {
    super('strobe', 'STROBE');
    this._flashAlpha = 0;
  }

  update(clockState) {
    super.update(clockState);

    if (this._shouldTrigger) {
      // Start a new flash
      this._flashAlpha = Math.max(0.15, this.amount);
    }

    // Flash decays exponentially each frame
    if (this._flashAlpha > 0.005) {
      this._flashAlpha *= 0.82;
    } else {
      this._flashAlpha = 0;
    }
  }

  apply(ctx, w, h) {
    if (this._flashAlpha <= 0) return;

    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = `rgba(255, 255, 255, ${this._flashAlpha})`;
    ctx.fillRect(0, 0, w, h);
  }

  reset() {
    super.reset();
    this._flashAlpha = 0;
  }
}
