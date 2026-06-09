import vertexShader from '../shaders/common.vert.glsl?raw';
import fragmentShader from '../shaders/scanlines.frag.glsl?raw';

export default {
  id: 'scanlines',
  label: 'CRT NTSC',
  category: 'retro',

  params: {
    brightness: {
      type: 'float',
      label: 'Brillo',
      min: 0.0,
      max: 2.0,
      default: 1.1,
      step: 0.05
    },
    saturation: {
      type: 'float',
      label: 'Saturación',
      min: 0.0,
      max: 1.5,
      default: 0.6,
      step: 0.05
    },
    blur: {
      type: 'float',
      label: 'Blur',
      min: 0.0,
      max: 0.95,
      default: 0.5,
      step: 0.05
    },
    scanFlicker: {
      type: 'float',
      label: 'Flicker',
      min: 0.0,
      max: 1.0,
      default: 0.33,
      step: 0.05
    },
    subcarrier: {
      type: 'float',
      label: 'Subportadora',
      min: 0.0,
      max: 5.0,
      default: 2.1,
      step: 0.1
    },
    interference: {
      type: 'float',
      label: 'Interferencia',
      min: 0.0,
      max: 3.0,
      default: 0.5,
      step: 0.1
    },
    fishEye: {
      type: 'float',
      label: 'Ojo de Pez',
      min: 0.0,
      max: 0.5,
      default: 0.12,
      step: 0.01
    },
    vignette: {
      type: 'float',
      label: 'Viñeta',
      min: 0.0,
      max: 1.0,
      default: 0.7,
      step: 0.05
    }
  },

  renderer: 'glsl',
  vertexShader,
  fragmentShader,
  svgExportable: false
};
