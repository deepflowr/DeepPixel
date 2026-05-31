import vertexShader from '../shaders/common.vert.glsl?raw';
import fragmentShader from '../shaders/glitch.frag.glsl?raw';

export default {
  id: 'glitch',
  label: 'Glitch',
  category: 'destroy',

  params: {
    intensity: {
      type: 'float',
      label: 'Intensidad',
      min: 0,
      max: 1,
      default: 0.3,
      step: 0.02
    },
    blockSize: {
      type: 'float',
      label: 'Bloques',
      min: 0.01,
      max: 0.2,
      default: 0.05,
      step: 0.005
    },
    rgbShift: {
      type: 'float',
      label: 'Shift RGB',
      min: 0,
      max: 0.05,
      default: 0.01,
      step: 0.001
    },
    speed: {
      type: 'float',
      label: 'Velocidad',
      min: 0.5,
      max: 10,
      default: 3,
      step: 0.5
    },
    scanDistortion: {
      type: 'float',
      label: 'Distorsión VHS',
      min: 0,
      max: 1,
      default: 0.2,
      step: 0.02
    }
  },

  renderer: 'glsl',
  vertexShader,
  fragmentShader,
  svgExportable: false
};
