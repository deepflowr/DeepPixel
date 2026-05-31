import vertexShader from '../shaders/common.vert.glsl?raw';
import fragmentShader from '../shaders/halftone.frag.glsl?raw';

export default {
  id: 'halftone',
  label: 'Halftone',
  category: 'print',

  params: {
    dotSize: {
      type: 'int',
      label: 'Tamaño Punto',
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
    angle: {
      type: 'float',
      label: 'Ángulo Trama',
      min: 0.0,
      max: 6.28,
      default: 0.78,
      step: 0.05
    },
    hue: {
      type: 'float',
      label: 'Tono (Hue)',
      min: 0.0,
      max: 1.0,
      default: 0.0,
      step: 0.01
    },
    saturation: {
      type: 'float',
      label: 'Saturación',
      min: 0.0,
      max: 1.0,
      default: 0.0,
      step: 0.01
    }
  },

  renderer: 'glsl',
  vertexShader,
  fragmentShader,
  svgExportable: true
};
