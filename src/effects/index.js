import bayerDither from './bayer-dither';
import scanlines from './scanlines';
import floydSteinberg from './floyd-steinberg';
import halftone from './halftone';
import risograph from './risograph';
import glitch from './glitch';

// Registry of all available effects in DeepPixel
export const AVAILABLE_EFFECTS = [
  bayerDither,
  scanlines,
  floydSteinberg,
  halftone,
  risograph,
  glitch
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
