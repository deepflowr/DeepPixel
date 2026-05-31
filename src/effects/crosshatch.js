import vertexShader from '../shaders/common.vert.glsl?raw';
import fragmentShader from '../shaders/crosshatch.frag.glsl?raw';

export default {
  id: 'crosshatch',
  label: 'Crosshatch',
  category: 'dither',

  params: {
    scale: {
      type: 'float',
      label: 'Escala',
      min: 2.0,
      max: 40.0,
      default: 12.0,
      step: 1.0
    },
    contrast: {
      type: 'float',
      label: 'Contraste',
      min: 0.0,
      max: 1.0,
      default: 0.5,
      step: 0.02
    },
    speed: {
      type: 'float',
      label: 'Velocidad',
      min: 0.0,
      max: 5.0,
      default: 0.5,
      step: 0.1
    },
    angle: {
      type: 'float',
      label: 'Ángulo',
      min: 0.0,
      max: 6.28,
      default: 0.0,
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
  svgExportable: true
};
