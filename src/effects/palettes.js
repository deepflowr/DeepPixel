/**
 * Predefined color palettes for multi-color dithering.
 * Each palette has a name and an array of hex colors.
 * All palettes are 2-8 colors.
 */

export const PRESET_PALETTES = [
  {
    id: 'bw',
    name: 'Monocromo',
    colors: ['#000000', '#ffffff']
  },
  {
    id: 'bw-heavy',
    name: 'Contraste Alto',
    colors: ['#0a0a0a', '#f0f0f0']
  },
  {
    id: 'sepia',
    name: 'Sepia Vintage',
    colors: ['#2b1a0e', '#6b4c2a', '#a67c52', '#e8d5b7', '#fff8ef']
  },
  {
    id: 'retro-green',
    name: 'Terminal Verde',
    colors: ['#001100', '#003300', '#005500', '#009900', '#00cc00', '#00ff00']
  },
  {
    id: 'retro-amber',
    name: 'Terminal Ámbar',
    colors: ['#1a0e00', '#3d2200', '#663800', '#995500', '#cc7700', '#ffaa00', '#ffcc44', '#ffee88']
  },
  {
    id: 'cmyk',
    name: 'CMYK Print',
    colors: ['#00aeef', '#ec008c', '#fff200', '#000000', '#ffffff']
  },
  {
    id: 'gameboy',
    name: 'Gameboy',
    colors: ['#0f380f', '#306230', '#8bac0f', '#9bbc0f']
  },
  {
    id: 'neon',
    name: 'Neon Nights',
    colors: ['#0d0221', '#3c096c', '#9d4edd', '#c77dff', '#e0aaff']
  },
  {
    id: 'sunset',
    name: 'Sunset',
    colors: ['#1a0a2e', '#4a1942', '#893168', '#e05d5d', '#f2a65a', '#ffd166']
  },
  {
    id: 'ocean',
    name: 'Océano',
    colors: ['#001233', '#001845', '#023e7d', '#0353a4', '#468faf', '#7ddfcc']
  },
  {
    id: 'fire',
    name: 'Fuego',
    colors: ['#1a0000', '#4a0000', '#8a1c00', '#cc4400', '#ff7700', '#ffaa33', '#ffdd66']
  },
  {
    id: 'vaporwave',
    name: 'Vaporwave',
    colors: ['#0b0b45', '#2d1b69', '#6b2fa0', '#b14ebf', '#f77fbe', '#fbc0cb', '#fcf6bd']
  },
  {
    id: 'retro-4',
    name: 'Retro 4-bit',
    colors: ['#080705', '#40434e', '#702632', '#912f40', '#c4a29e', '#e3d6ca', '#f4f0e6']
  },
  {
    id: 'duotone-red',
    name: 'Duotone Rojo',
    colors: ['#1a0000', '#4d0000', '#800000', '#cc0000', '#ff3333', '#ff8080', '#ffcccc']
  },
  {
    id: 'duotone-blue',
    name: 'Duotone Azul',
    colors: ['#00001a', '#00004d', '#000080', '#0000cc', '#3333ff', '#8080ff', '#ccccff']
  }
];

export const getPaletteById = (id) => {
  return PRESET_PALETTES.find(p => p.id === id) || null;
};

/**
 * Converts an RGB hex string to an HSL object.
 * Used for palette color manipulation.
 */
export function hexToRgb(hex) {
  hex = hex.replace('#', '');
  if (hex.length === 3) hex = hex.split('').map(c => c + c).join('');
  const r = parseInt(hex.substring(0, 2), 16) / 255;
  const g = parseInt(hex.substring(2, 4), 16) / 255;
  const b = parseInt(hex.substring(4, 6), 16) / 255;
  return { r, g, b };
}

export function rgbToHex(r, g, b) {
  const toHex = (v) => Math.round(v * 255).toString(16).padStart(2, '0');
  return '#' + toHex(r) + toHex(g) + toHex(b);
}

/**
 * Extract a color palette from an HTML canvas/image source using
 * a simplified median-cut color quantization.
 * Returns an array of up to `maxColors` hex strings, sorted by frequency.
 */
export function extractPaletteFromSource(source, maxColors = 8) {
  // source must be an HTMLCanvasElement, HTMLImageElement, or HTMLVideoElement
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  // Determine dimensions
  let w, h;
  if (source instanceof HTMLVideoElement) {
    w = source.videoWidth || 320;
    h = source.videoHeight || 240;
  } else if (source instanceof HTMLImageElement) {
    w = source.naturalWidth || source.width || 320;
    h = source.naturalHeight || source.height || 240;
  } else if (source instanceof HTMLCanvasElement) {
    w = source.width;
    h = source.height;
  } else {
    return null;
  }

  // Downsample to small size for performance
  const sampleSize = 64;
  const ratio = Math.min(1, sampleSize / Math.max(w, h));
  canvas.width = Math.max(2, Math.floor(w * ratio));
  canvas.height = Math.max(2, Math.floor(h * ratio));

  try {
    ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
  } catch (e) {
    return null;
  }

  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;
  const pixelCount = canvas.width * canvas.height;

  // ── Step 1: bucket pixels into an RGB color cube (uniform quantization) ──
  // Use 4x4x4 buckets for speed (64 buckets)
  const bucketSize = 64; // 256 / 4
  const buckets = new Map();

  for (let i = 0; i < pixelCount; i++) {
    const idx = i * 4;
    const r = data[idx];
    const g = data[idx + 1];
    const b = data[idx + 2];

    // Skip very dark / very bright to avoid noise
    const lum = r * 0.299 + g * 0.587 + b * 0.114;
    if (lum < 8 || lum > 248) continue;

    const bucketKey = (
      Math.floor(r / bucketSize) * 100 +
      Math.floor(g / bucketSize) * 10 +
      Math.floor(b / bucketSize)
    );

    if (buckets.has(bucketKey)) {
      const entry = buckets.get(bucketKey);
      entry.r += r;
      entry.g += g;
      entry.b += b;
      entry.count++;
    } else {
      buckets.set(bucketKey, { r, g, b, count: 1 });
    }
  }

  // ── Step 2: sort buckets by frequency, pick top N ──
  const sorted = Array.from(buckets.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, maxColors);

  // ── Step 3: compute average color per bucket and convert to hex ──
  const palette = sorted.map(entry => {
    const r = Math.round(entry.r / entry.count);
    const g = Math.round(entry.g / entry.count);
    const b = Math.round(entry.b / entry.count);
    const toHex = (v) => v.toString(16).padStart(2, '0');
    return '#' + toHex(r) + toHex(g) + toHex(b);
  });

  // Ensure min 2 colors
  if (palette.length < 2) {
    palette.push('#808080');
  }

  return palette;
}
