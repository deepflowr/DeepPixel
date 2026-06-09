import PerformanceEffect from './PerformanceEffect';

/**
 * BeatZoomEffect — pulses a zoom on each trigger.
 * Draws the canvas scaled from center, then clips.
 */

export default class BeatZoomEffect extends PerformanceEffect {
  constructor() {
    super('beat-zoom', 'BEAT ZOOM');
    this._currentScale = 1;
  }

  update(clockState) {
    super.update(clockState);

    if (this._shouldTrigger) {
      // Each beat, kick the zoom. Scale depends on amount.
      this._currentScale = 1 + this.amount * 0.25;
    }

    // Decay back to 1.0
    if (this._currentScale > 1.005) {
      this._currentScale += (1 - this._currentScale) * 0.15;
    } else {
      this._currentScale = 1;
    }
  }

  apply(ctx, w, h) {
    if (this._currentScale <= 1.005) return;

    // Capture current canvas into a temp canvas, then redraw with scale.
    // NOTE: putImageData() ignores canvas transforms, so we use drawImage().
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = w;
    tempCanvas.height = h;
    const tempCtx = tempCanvas.getContext('2d');
    tempCtx.drawImage(ctx.canvas, 0, 0);

    ctx.clearRect(0, 0, w, h);
    ctx.save();
    ctx.translate(w / 2, h / 2);
    ctx.scale(this._currentScale, this._currentScale);
    ctx.translate(-w / 2, -h / 2);
    ctx.drawImage(tempCanvas, 0, 0);
    ctx.restore();
  }

  reset() {
    super.reset();
    this._currentScale = 1;
  }
}
