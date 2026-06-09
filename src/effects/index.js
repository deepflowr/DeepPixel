import bayerDither from './bayer-dither';
import scanlines from './scanlines';
import floydSteinberg from './floyd-steinberg';
import halftone from './halftone';
import risograph from './risograph';
import glitch from './glitch';
import posterize from './posterize';
import kaleidoscope from './kaleidoscope';
import feedback from './feedback';
import cmykHalftone from './cmyk-halftone';
import atkinsonDither from './atkinson-dither';
import stucki from './stucki';
import jarvis from './jarvis';
import clusteredDot from './clustered-dot';
import brickDither from './brick-dither';

// Registry of all available effects in DeepPixel (15 effects, 4-column grid)
export const AVAILABLE_EFFECTS = [
  // ── Col 1: 4 short+medium ──
  floydSteinberg,
  stucki,
  posterize,
  atkinsonDither,

  // ── Col 2: 4 medium ──
  jarvis,
  scanlines,
  bayerDither,
  kaleidoscope,

  // ── Col 3: 5 medium+tall (clusteredDot, risograph, halftone, feedback, cmykHalftone) ──
  clusteredDot,
  risograph,
  halftone,
  feedback,
  cmykHalftone,

  // ── Col 4: 2 tall (glitch, brickDither) ──
  glitch,
  brickDither
];

export const getEffectById = (id) => {
  return AVAILABLE_EFFECTS.find(eff => eff.id === id);
};

export const getDefaultParams = (effect) => {
  const defaults = {};
  if (!effect || !effect.params) return defaults;
  
  Object.keys(effect.params).forEach(key => {
    defaults[key] = effect.params[key].default;
  });
  
  return defaults;
};
