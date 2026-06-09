import PerformanceEffect from './PerformanceEffect';

/**
 * ShakeEffect — displaces the canvas randomly on each trigger.
 * Amount controls intensity (pixel offset).
 */

export default class ShakeEffect extends PerformanceEffect {
  constructor() {
    super('shake', 'SHAKE');
    this._offsetX = 0;
    this._offsetY = 0;
    this._shakeDecay = 0;
  }

  update(clockState) {
    super.update(clockState);

    if (this._shouldTrigger) {
      // Kick a new shake with random direction
      const intensity = 4 + this.amount * 20; // 4–24 px
      const angle = Math.random() * Math.PI * 2;
      this._offsetX = Math.cos(angle) * intensity;
      this._offsetY = Math.sin(angle) * intensity;
      this._shakeDecay = 1;
    }

    // Decay shake over time
    if (this._shakeDecay > 0.01) {
      this._shakeDecay *= 0.85;
      this._offsetX *= 0.85;
      this._offsetY *= 0.85;
    } else {
      this._offsetX = 0;
      this._offsetY = 0;
      this._shakeDecay = 0;
    }
  }

  apply(ctx, w, h) {
    if (Math.abs(this._offsetX) < 0.5 && Math.abs(this._offsetY) < 0.5) return;

    // Shift canvas content via temp canvas, fill exposed edges with black
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = w;
    tempCanvas.height = h;
    const tempCtx = tempCanvas.getContext('2d');
    tempCtx.drawImage(ctx.canvas, 0, 0);

    ctx.clearRect(0, 0, w, h);
    ctx.drawImage(tempCanvas, this._offsetX, this._offsetY);

    // Fill exposed edges with black
    ctx.fillStyle = '#000';
    if (this._offsetX > 0) ctx.fillRect(0, 0, this._offsetX, h);
    else if (this._offsetX < 0) ctx.fillRect(w + this._offsetX, 0, -this._offsetX, h);
    if (this._offsetY > 0) ctx.fillRect(0, 0, w, this._offsetY);
    else if (this._offsetY < 0) ctx.fillRect(0, h + this._offsetY, w, -this._offsetY);
  }

  reset() {
    super.reset();
    this._offsetX = 0;
    this._offsetY = 0;
    this._shakeDecay = 0;
  }
}
