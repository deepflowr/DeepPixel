export default {
  id: 'atkinson-dither',
  label: 'Dither Atkinson',
  category: 'dither',

  params: {
    threshold: {
      type: 'float',
      label: 'Contraste',
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
    palette: {
      type: 'palette',
      label: 'Paleta',
      default: ['#000000', '#ffffff'],
      minColors: 2,
      maxColors: 8
    }
  },

  renderer: 'cpu',
  svgExportable: true,

  // Atkinson error diffusion — used in classic Macintosh
  // Diffuses error to 6 neighbors with equal weight (1/8 each)
  // Now supports multi-color palettes via nearest-luminance quantization
  processFn: (imageData, params) => {
    const w = imageData.width, h = imageData.height, data = imageData.data;
    const palette = params.palette || ['#000000', '#ffffff'];
    const hexToRgb = (hex) => {
      hex = hex.replace('#', '');
      if (hex.length === 3) hex = hex.split('').map(c => c + c).join('');
      return [
        parseInt(hex.substring(0, 2), 16) / 255,
        parseInt(hex.substring(2, 4), 16) / 255,
        parseInt(hex.substring(4, 6), 16) / 255
      ];
    };
    const paletteColors = palette.map(hex => hexToRgb(hex));
    const paletteSize = paletteColors.length;
    const paletteLums = paletteColors.map(c => c[0] * 0.299 + c[1] * 0.587 + c[2] * 0.114);

    const lums = new Float32Array(w * h);
    for (let i = 0; i < w * h; i++) {
      const idx = i * 4;
      lums[i] = data[idx] * 0.299 + data[idx+1] * 0.587 + data[idx+2] * 0.114;
    }

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const idx = x + y * w;
        const oldL = lums[idx];

        // Find nearest palette color by luminance
        let bestIdx = 0;
        let bestDist = Infinity;
        for (let p = 0; p < paletteSize; p++) {
          const dist = Math.abs(oldL - paletteLums[p] * 255);
          if (dist < bestDist) {
            bestDist = dist;
            bestIdx = p;
          }
        }
        const newL = paletteLums[bestIdx] * 255;
        const err = oldL - newL;
        const oneEighth = err * (1.0 / 8.0);

        // Atkinson distributes to 6 neighbors (all 1/8, remainder discarded)
        if (x + 1 < w) lums[(x + 1) + y * w] += oneEighth;
        if (x + 2 < w) lums[(x + 2) + y * w] += oneEighth;
        if (x - 1 >= 0 && y + 1 < h) lums[(x - 1) + (y + 1) * w] += oneEighth;
        if (y + 1 < h) lums[x + (y + 1) * w] += oneEighth;
        if (x + 1 < w && y + 1 < h) lums[(x + 1) + (y + 1) * w] += oneEighth;
        if (y + 2 < h) lums[x + (y + 2) * w] += oneEighth;

        const targetPixelIdx = idx * 4;
        const mappedColor = paletteColors[bestIdx];
        data[targetPixelIdx] = Math.round(mappedColor[0] * 255);
        data[targetPixelIdx + 1] = Math.round(mappedColor[1] * 255);
        data[targetPixelIdx + 2] = Math.round(mappedColor[2] * 255);
        data[targetPixelIdx + 3] = 255;
      }
    }
    return imageData;
  }
};
