/**
 * ProceduralSource - generates real-time animated canvas textures
 * for use as VJ input sources. Designed to provide rich detail
 * at multiple scales so effects (dithering, halftone, glitch, etc.)
 * have texture to work with.
 */

class ProceduralSource {
  constructor() {
    this.canvas = document.createElement('canvas');
    this.canvas.width = 640;
    this.canvas.height = 360;
    this.ctx = this.canvas.getContext('2d');
    this.imageData = null;
    this.pixelData = null;
    this.type = 'test-pattern';
    this.startTime = performance.now() / 1000;
  }

  get time() {
    return (performance.now() / 1000) - this.startTime;
  }

  setType(type) {
    this.type = type;
    this.startTime = performance.now() / 1000;
  }

  setSize(w, h) {
    this.canvas.width = w;
    this.canvas.height = h;
    this.imageData = null;
    this.pixelData = null;
  }

  update() {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;

    switch (this.type) {
      case 'test-pattern': this.renderTestPattern(ctx, w, h); break;
      case 'crt-texture':  this.renderCRTTexture(ctx, w, h);  break;
      case 'moire':        this.renderMoire(ctx, w, h);       break;
    }

    return this.canvas;
  }

  // ─── PATRÓN DE PRUEBA (Test Pattern) ──────────────────────
  // Inspired by classic SMPTE color bars + oscilloscope sweep.
  // Full luminance range + fine detail for all effects.
  renderTestPattern(ctx, w, h) {
    const t = this.time;

    // ── Background ──
    ctx.fillStyle = '#111';
    ctx.fillRect(0, 0, w, h);

    // ── Color bars (top 35%) ──
    const barH = h * 0.35;
    const barW = w / 7;
    const colors = [
      '#ffffff', '#ffff00', '#00ffff', '#00ff00',
      '#ff00ff', '#ff0000', '#0000ff'
    ];
    colors.forEach((c, i) => {
      ctx.fillStyle = c;
      ctx.fillRect(i * barW, 0, barW, barH);
    });

    // ── Luminance gradient ramp (35%–55%) ──
    const rampY = barH;
    const rampH = h * 0.20;
    for (let x = 0; x < w; x++) {
      const lum = (x / w);
      const v = Math.floor(lum * 255);
      ctx.fillStyle = `rgb(${v},${v},${v})`;
      ctx.fillRect(x, rampY, 1, rampH);
    }

    // ── Fine checkerboard pattern (55%–70%) ──
    const checkY = rampY + rampH;
    const checkH = h * 0.15;
    const gridSize = Math.max(2, Math.floor(w / 80));
    for (let y = 0; y < checkH; y++) {
      for (let x = 0; x < w; x++) {
        const cx = Math.floor(x / gridSize);
        const cy = Math.floor(y / gridSize);
        const bright = (cx + cy) % 2 === 0 ? 220 : 40;
        ctx.fillStyle = `rgb(${bright},${bright},${bright})`;
        ctx.fillRect(x, checkY + y, 1, 1);
      }
    }

    // ── Color sweep bars (70%–85%) with fine stripes ──
    const sweepY = checkY + checkH;
    const sweepH = h * 0.15;
    for (let x = 0; x < w; x++) {
      const hue = (x / w + t * 0.03) % 1.0;
      const stripe = Math.sin(x * 0.3) > 0 ? 1.0 : 0.85;
      const rgb = this.hslToRgb(hue, 0.9, 0.5 * stripe);
      ctx.fillStyle = `rgb(${rgb[0]},${rgb[1]},${rgb[2]})`;
      ctx.fillRect(x, sweepY, 1, sweepH);
    }

    // ── Oscilloscope sweep line ──
    const sweepX = ((t * 80) % (w + 120)) - 60;
    ctx.globalCompositeOperation = 'screen';
    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    ctx.fillRect(sweepX, 0, 3, h);
    ctx.globalCompositeOperation = 'source-over';

    // ── Fine noise overlay (subtle, full frame) ──
    const imageData = ctx.getImageData(0, 0, w, h);
    const data = imageData.data;
    for (let i = 0; i < data.length; i += 4) {
      const noise = (Math.random() - 0.5) * 12;
      data[i]     = Math.max(0, Math.min(255, data[i]     + noise));
      data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + noise));
      data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + noise));
    }
    ctx.putImageData(imageData, 0, 0);
  }

  // ─── TEXTURA CRT (CRT / Analog Texture) ────────────────────
  // Per-pixel animated noise with VHS tracking bands,
  // scanline interference, and color fringing.
  // Highest-frequency content — ideal for dithering.
  renderCRTTexture(ctx, w, h) {
    const t = this.time;

    // Create or reuse a pixel buffer
    if (!this.imageData || this.imageData.width !== w || this.imageData.height !== h) {
      this.imageData = ctx.createImageData(w, h);
      this.pixelData = this.imageData.data;
    }

    const data = this.pixelData;
    const len = w * h;

    // Per-pixel animated noise with subtle color drift
    for (let i = 0; i < len; i++) {
      const px = i * 4;
      const x = i % w;
      const y = Math.floor(i / w);

      // 3D hash for temporal noise (xyz = x, y, t)
      const seed = x * 12.9898 + y * 78.233 + t * 41.931;
      const n = this.hash(seed);
      const base = Math.floor(n * 200 + 28); // 28–228 range

      // Color fringing — subtle hue shift per pixel
      const hueOffset = this.hash(seed + 1.7) * 0.15 - 0.075;
      const rOffset = Math.floor(hueOffset * 40);
      const bOffset = Math.floor(-hueOffset * 40);

      data[px]     = Math.max(0, Math.min(255, base + rOffset));
      data[px + 1] = Math.max(0, Math.min(255, base));
      data[px + 2] = Math.max(0, Math.min(255, base + bOffset));
      data[px + 3] = 255;
    }

    // ── VHS tracking bands ──
    const bandCount = 4 + Math.floor(this.hash(t * 0.1) * 3);
    for (let b = 0; b < bandCount; b++) {
      let bandY = ((b * 67 + t * 40) % (h + 60)) - 30;
      const bandH = 1 + Math.floor(this.hash(b * 3.7 + t * 0.2) * 6);
      const brightness = Math.floor(this.hash(b * 9.1 + t * 0.5) * 60) + 30;

      for (let row = 0; row < bandH; row++) {
        const yy = Math.floor(bandY + row);
        if (yy < 0 || yy >= h) continue;
        for (let xx = 0; xx < w; xx++) {
          const idx = (yy * w + xx) * 4;
          const drift = (xx + Math.floor(t * 100) % 40) % w;
          const driftIdx = (yy * w + drift) * 4;
          data[idx]     = Math.min(255, data[driftIdx]     + brightness);
          data[idx + 1] = Math.min(255, data[driftIdx + 1] + brightness * 0.5);
          data[idx + 2] = Math.min(255, data[driftIdx + 2] + brightness * 0.3);
        }
        // Shift next band row horizontally for tearing effect
        bandY += 1;
      }
    }

    ctx.putImageData(this.imageData, 0, 0);

    // ── Scanline overlay ──
    ctx.fillStyle = 'rgba(0,0,0,0.08)';
    for (let y = 1; y < h; y += 3) {
      ctx.fillRect(0, y, w, 1);
    }

    // ── Chromatic aberration streaks ──
    ctx.globalCompositeOperation = 'screen';
    const streakY = ((t * 25) % (h + 80)) - 40;
    ctx.fillStyle = 'rgba(0,200,255,0.03)';
    ctx.fillRect(0, streakY, w, 2);
    ctx.fillStyle = 'rgba(255,60,60,0.03)';
    ctx.fillRect(0, streakY + 3, w, 1);
    ctx.globalCompositeOperation = 'source-over';
  }

  // ─── MOIRÉ GEOMÉTRICO (Moire / Geometric) ─────────────────
  // Concentric circles, rotating grid, and radial gradients
  // that create beautiful interference patterns with dithering.
  // Uses ImageData for pixel-level rendering (fast path).
  renderMoire(ctx, w, h) {
    const t = this.time;
    const cx = w / 2;
    const cy = h / 2;
    const maxR = Math.sqrt(cx * cx + cy * cy);

    // Create or reuse an ImageData buffer for pixel manipulation
    if (!this.imageData || this.imageData.width !== w || this.imageData.height !== h) {
      this.imageData = ctx.createImageData(w, h);
      this.pixelData = this.imageData.data;
    }

    const data = this.pixelData;
    const ringSpacing = 12 + 4 * Math.sin(t * 0.2);

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const idx = (y * w + x) * 4;
        const dx = x - cx;
        const dy = y - cy;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const angle = Math.atan2(dy, dx);

        // Radial moire pattern + rotating spoke pattern
        const ringVal   = Math.sin(dist * (Math.PI * 2 / ringSpacing) - t * 2.0);
        const spokeVal  = Math.sin((angle + t * 0.5) * 16.0);
        const falloff   = 1.0 - (dist / maxR) * 0.3;
        let val = (ringVal * 0.5 + spokeVal * 0.3) * falloff;

        const brightness = Math.floor((val * 0.5 + 0.5) * 220 + 20);
        const hueShift = Math.sin(angle * 3 + t * 0.3) * 0.3 + 0.5;

        data[idx]     = Math.min(255, brightness + Math.floor(hueShift * 20));
        data[idx + 1] = brightness;
        data[idx + 2] = Math.min(255, brightness + Math.floor((1 - hueShift) * 20));
        data[idx + 3] = 255;
      }
    }

    ctx.putImageData(this.imageData, 0, 0);

    // ── Grid overlay (canvas strokes, fast) ──
    const gridSize = 40 + 20 * Math.sin(t * 0.15);
    ctx.strokeStyle = 'rgba(255,255,255,0.06)';
    ctx.lineWidth = 1;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(t * 0.1);
    const gridExtent = Math.max(w, h) * 0.8;
    for (let i = -gridExtent; i < gridExtent; i += gridSize) {
      ctx.beginPath();
      ctx.moveTo(i, -gridExtent);
      ctx.lineTo(i, gridExtent);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(-gridExtent, i);
      ctx.lineTo(gridExtent, i);
      ctx.stroke();
    }
    ctx.restore();

    // ── Glowing center hotspot ──
    const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, maxR * 0.35);
    grad.addColorStop(0, 'rgba(255,180,80,0.06)');
    grad.addColorStop(0.5, 'rgba(255,100,50,0.03)');
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
  }

  // Simple hash function for deterministic pseudo-random values
  hash(seed) {
    const x = Math.sin(seed) * 43758.5453;
    return x - Math.floor(x);
  }

  hslToRgb(h, s, l) {
    let r, g, b;
    if (s === 0) {
      r = g = b = l;
    } else {
      const hue2rgb = function(p, q, t) {
        if (t < 0) t += 1;
        if (t > 1) t -= 1;
        if (t < 1/6) return p + (q - p) * 6 * t;
        if (t < 1/2) return q;
        if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
        return p;
      };
      const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      const p = 2 * l - q;
      r = hue2rgb(p, q, h + 1/3);
      g = hue2rgb(p, q, h);
      b = hue2rgb(p, q, h - 1/3);
    }
    return [r * 255, g * 255, b * 255];
  }

  dispose() {
    const ctx = this.ctx;
    const canvas = this.canvas;
    if (ctx && canvas) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
    this.imageData = null;
    this.pixelData = null;
  }
}

export default ProceduralSource;
