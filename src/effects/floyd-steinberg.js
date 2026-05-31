export default {
  id: 'floyd-steinberg',
  label: 'Dither Floyd-Steinberg',
  category: 'dither',
  
  params: {
    threshold: {
      type: 'float',
      label: 'Umbral',
      min: 0.0,
      max: 1.0,
      default: 0.5,
      step: 0.01
    },
    pixelSize: {
      type: 'select',
      label: 'Pixelado',
      options: [1, 2, 4, 8, 12, 16],
      default: 2
    },
    hue: {
      type: 'float',
      label: 'Tono (Hue)',
      min: 0.0,
      max: 1.0,
      default: 0.0,
      step: 0.01
    },
    saturation: {
      type: 'float',
      label: 'Saturación',
      min: 0.0,
      max: 1.0,
      default: 0.0,
      step: 0.01
    }
  },
  
  renderer: 'cpu',
  svgExportable: true,

  // CPU error diffusion processing function
  processFn: (imageData, params) => {
    const { w, h, data } = { w: imageData.width, h: imageData.height, data: imageData.data };
    
    const threshold = params.threshold !== undefined ? params.threshold * 255 : 127.5;
    const hue = params.hue !== undefined ? params.hue : 0.0;
    const saturation = params.saturation !== undefined ? params.saturation : 0.0;

    // Helper HSL-to-RGB function
    const hue2rgb = (p, q, t) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1/6) return p + (q - p) * 6 * t;
      if (t < 1/2) return q;
      if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
      return p;
    };

    const hsl2rgb = (h, s, l) => {
      if (s === 0) return [Math.round(l * 255), Math.round(l * 255), Math.round(l * 255)];
      const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      const p = 2 * l - q;
      const r = hue2rgb(p, q, h + 1/3);
      const g = hue2rgb(p, q, h);
      const b = hue2rgb(p, q, h - 1/3);
      return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
    };

    // Calculate background and foreground colors matching GPU shader
    const lightnessFg = 0.90 - (saturation * 0.40);
    const colorBg = hsl2rgb(hue, saturation, 0.01);
    const colorFg = hsl2rgb(hue, saturation, lightnessFg);

    // Keep a float luminance array for error propagation
    const lums = new Float32Array(w * h);
    for (let i = 0; i < w * h; i++) {
      const idx = i * 4;
      // standard luminance formula
      lums[i] = data[idx] * 0.299 + data[idx+1] * 0.587 + data[idx+2] * 0.114;
    }

    // Floyd-Steinberg Error Diffusion Loop
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const idx = x + y * w;
        const oldL = lums[idx];
        
        // Threshold decision
        const newL = oldL > threshold ? 255 : 0;
        const err = oldL - newL;
        
        // Propagate error to neighbors
        // Pixel to the right
        if (x + 1 < w) {
          lums[(x + 1) + y * w] += err * (7.0 / 16.0);
        }
        // Pixel below-left
        if (x - 1 >= 0 && y + 1 < h) {
          lums[(x - 1) + (y + 1) * w] += err * (3.0 / 16.0);
        }
        // Pixel below
        if (y + 1 < h) {
          lums[x + (y + 1) * w] += err * (5.0 / 16.0);
        }
        // Pixel below-right
        if (x + 1 < w && y + 1 < h) {
          lums[(x + 1) + (y + 1) * w] += err * (1.0 / 16.0);
        }

        // Apply dynamic HSL palette to the resulting output pixel
        const targetPixelIdx = idx * 4;
        const mappedColor = newL > 127.5 ? colorFg : colorBg;
        
        data[targetPixelIdx] = mappedColor[0];     // Red
        data[targetPixelIdx + 1] = mappedColor[1]; // Green
        data[targetPixelIdx + 2] = mappedColor[2]; // Blue
        data[targetPixelIdx + 3] = 255;            // Alpha
      }
    }

    return imageData;
  }
};
