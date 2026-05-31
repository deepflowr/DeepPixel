class ExportManager {
  // Translate raster canvas buffer to clean optimized vector SVG
  static exportSVG(canvas, activeParams) {
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = canvas.width;
    tempCanvas.height = canvas.height;
    
    const tempCtx = tempCanvas.getContext('2d');
    tempCtx.drawImage(canvas, 0, 0);
    
    const imgData = tempCtx.getImageData(0, 0, canvas.width, canvas.height);
    const { width, height, data } = imgData;

    // Retrieve active colors based on HSL parameters schema
    const hue = activeParams.hue !== undefined ? activeParams.hue : 0.0;
    const saturation = activeParams.saturation !== undefined ? activeParams.saturation : 0.0;

    const hue2rgb = (p, q, t) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1/6) return p + (q - p) * 6 * t;
      if (t < 1/2) return q;
      if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
      return p;
    };

    const hslToHex = (h, s, l) => {
      if (s === 0) {
        const val = Math.round(l * 255).toString(16).padStart(2, '0');
        return `#${val}${val}${val}`;
      }
      const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      const p = 2 * l - q;
      const r = Math.round(hue2rgb(p, q, h + 1/3) * 255).toString(16).padStart(2, '0');
      const g = Math.round(hue2rgb(p, q, h) * 255).toString(16).padStart(2, '0');
      const b = Math.round(hue2rgb(p, q, h - 1/3) * 255).toString(16).padStart(2, '0');
      return `#${r}${g}${b}`;
    };

    const lightnessFg = 0.90 - (saturation * 0.40);
    const hexBg = hslToHex(hue, saturation, 0.01);
    const hexFg = hslToHex(hue, saturation, lightnessFg);

    let pathData = '';
    
    // Horizontal row run-length grouping to minimize SVG nodes
    for (let y = 0; y < height; y++) {
      let inRun = false;
      let runStart = 0;

      for (let x = 0; x < width; x++) {
        const idx = (x + y * width) * 4;
        const r = data[idx];
        const g = data[idx + 1];
        const b = data[idx + 2];
        
        // Luminance check to separate background from foreground pixels
        const isForeground = (r * 0.299 + g * 0.587 + b * 0.114) > 127.5;

        if (isForeground) {
          if (!inRun) {
            inRun = true;
            runStart = x;
          }
        } else {
          if (inRun) {
            inRun = false;
            const runLen = x - runStart;
            pathData += `M${runStart},${y}h${runLen}v1h-${runLen}z `;
          }
        }
      }
      
      if (inRun) {
        const runLen = width - runStart;
        pathData += `M${runStart},${y}h${runLen}v1h-${runLen}z `;
      }
    }

    // Build the clean vector file
    const svgString = `<?xml version="1.0" encoding="UTF-8" standalone="no"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">
  <rect width="${width}" height="${height}" fill="${hexBg}" />
  <path d="${pathData.trim()}" fill="${hexFg}" shape-rendering="crispEdges" />
</svg>
`.trim();

    return svgString;
  }
}

export default ExportManager;
