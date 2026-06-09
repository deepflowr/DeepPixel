import PerformanceEffect from './PerformanceEffect';

/**
 * WobbleEffect — sinusoidal wave distortion on each trigger.
 * Amount controls amplitude, division controls frequency of wobble kicks.
 */

export default class WobbleEffect extends PerformanceEffect {
  constructor() {
    super('wobble', 'WOBBLE');
    this._amplitude = 0;
    this._phase = 0;
  }

  update(clockState) {
    super.update(clockState);

    if (this._shouldTrigger) {
      // Kick wobble amplitude based on amount
      this._amplitude = 2 + this.amount * 12; // 2–14 px
    }

    // Wobble oscillates while amplitude > 0
    if (this._amplitude > 0.5) {
      this._phase += 0.15;
      this._amplitude *= 0.97;
    } else {
      this._amplitude = 0;
      this._phase = 0;
    }
  }

  apply(ctx, w, h) {
    if (this._amplitude < 0.5) return;

    const amp = this._amplitude;
    const phase = this._phase;

    // Scroll-based wobble: displace rows with a sine wave
    const imgData = ctx.getImageData(0, 0, w, h);
    const output = ctx.createImageData(w, h);
    const src = imgData.data;
    const dst = output.data;

    for (let y = 0; y < h; y++) {
      const shift = Math.sin(y * 0.05 + phase) * amp;
      const srcRow = y * w * 4;
      for (let x = 0; x < w; x++) {
        const srcX = Math.max(0, Math.min(w - 1, x + shift));
        const srcIdx = srcRow + Math.floor(srcX) * 4;
        const dstIdx = srcRow + x * 4;
        dst[dstIdx]     = src[srcIdx];
        dst[dstIdx + 1] = src[srcIdx + 1];
        dst[dstIdx + 2] = src[srcIdx + 2];
        dst[dstIdx + 3] = src[srcIdx + 3];
      }
    }

    ctx.putImageData(output, 0, 0);
  }

  reset() {
    super.reset();
    this._amplitude = 0;
    this._phase = 0;
  }
}
