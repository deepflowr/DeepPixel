import vertexShader from '../shaders/common.vert.glsl?raw';
import fragmentShader from '../shaders/cmyk-halftone.frag.glsl?raw';

export default {
  id: 'cmyk-halftone',
  label: 'CMYK Halftone',
  category: 'print',

  params: {
    dotSize: {
      type: 'float',
      label: 'Trama',
      min: 1.0,
      max: 20.0,
      default: 6.0,
      step: 0.5
    },
    speed: {
      type: 'float',
      label: 'Velocidad',
      min: 0.0,
      max: 5.0,
      default: 0.5,
      step: 0.1
    },
    contrast: {
      type: 'float',
      label: 'Contraste',
      min: 0.0,
      max: 1.0,
      default: 0.5,
      step: 0.02
    },
    angleC: {
      type: 'float',
      label: 'Ángulo Cyan',
      min: 0.0,
      max: 6.28,
      default: 0.26,
      step: 0.05
    },
    angleM: {
      type: 'float',
      label: 'Ángulo Magenta',
      min: 0.0,
      max: 6.28,
      default: 1.31,
      step: 0.05
    },
    angleY: {
      type: 'float',
      label: 'Ángulo Yellow',
      min: 0.0,
      max: 6.28,
      default: 0.0,
      step: 0.05
    },
    angleK: {
      type: 'float',
      label: 'Ángulo Black',
      min: 0.0,
      max: 6.28,
      default: 0.79,
      step: 0.05
    },
    palette: {
      type: 'palette',
      label: 'Paleta de Color',
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
