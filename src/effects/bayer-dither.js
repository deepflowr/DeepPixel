import vertexShader from '../shaders/common.vert.glsl?raw';
import fragmentShader from '../shaders/bayer.frag.glsl?raw';

export default {
  id: 'bayer-dither',
  label: 'Dither Bayer',
  category: 'dither',

  params: {
    pixelSize: {
      type: 'int',
      label: 'Escala',
      min: 1,
      max: 32,
      default: 1,
      step: 1
    },
    gamma: {
      type: 'float',
      label: 'Gamma',
      min: 0.0,
      max: 1.0,
      default: 0.0,
      step: 0.05
    },
    contrast: {
      type: 'float',
      label: 'Contraste',
      min: 0.0,
      max: 1.0,
      default: 0.0,
      step: 0.02
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
  svgExportable: true
};
