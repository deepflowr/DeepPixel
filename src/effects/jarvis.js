import vertexShader from '../shaders/common.vert.glsl?raw';
import fragmentShader from '../shaders/jarvis.frag.glsl?raw';

export default {
  id: 'jarvis',
  label: 'ZX Spectrum',
  category: 'retro',

  params: {
    pixelSize: {
      type: 'int',
      label: 'Pixelado',
      min: 2,
      max: 16,
      default: 4,
      step: 1
    },
    dither: {
      type: 'float',
      label: 'Dither',
      min: 0.0,
      max: 1.0,
      default: 1.0,
      step: 0.02
    },
    gamma: {
      type: 'float',
      label: 'Gamma',
      min: 0.5,
      max: 3.0,
      default: 1.0,
      step: 0.05
    },
    palette: {
      type: 'palette',
      label: 'Paleta',
      default: ['#000000', '#ffffff'],
      minColors: 2,
      maxColors: 8
    }
  },

  renderer: 'glsl',
  vertexShader,
  fragmentShader,
  svgExportable: false
};
