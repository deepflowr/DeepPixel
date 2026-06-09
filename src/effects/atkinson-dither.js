import vertexShader from '../shaders/common.vert.glsl?raw';
import fragmentShader from '../shaders/atkinson-dither.frag.glsl?raw';

export default {
  id: 'atkinson-dither',
  label: 'Dither Atkinson',
  category: 'dither',

  params: {
    scale: {
      type: 'int',
      label: 'Escala',
      min: 1,
      max: 16,
      default: 1,
      step: 1
    },
    threshold: {
      type: 'float',
      label: 'Umbral',
      min: 0.0,
      max: 1.0,
      default: 0.5,
      step: 0.01
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
