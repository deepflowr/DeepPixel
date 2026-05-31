import vertexShader from '../shaders/common.vert.glsl?raw';
import fragmentShader from '../shaders/clustered-dot.frag.glsl?raw';

export default {
  id: 'clustered-dot',
  label: 'Clustered Dot',
  category: 'dither',

  params: {
    dotSize: {
      type: 'int',
      label: 'Trama',
      min: 2,
      max: 20,
      default: 6,
      step: 1
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
