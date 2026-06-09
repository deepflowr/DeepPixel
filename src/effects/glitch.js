import vertexShader from '../shaders/common.vert.glsl?raw';
import fragmentShader from '../shaders/glitch.frag.glsl?raw';

export default {
  id: 'glitch',
  label: 'VHS',
  category: 'destroy',

  params: {
    intensity: {
      type: 'float',
      label: 'Intensidad',
      min: 0,
      max: 1,
      default: 0.5,
      step: 0.02
    },
    cellSize: {
      type: 'float',
      label: 'Tamaño Bloque',
      min: 0.01,
      max: 0.3,
      default: 0.08,
      step: 0.005
    },
    speed: {
      type: 'float',
      label: 'Velocidad',
      min: 0.5,
      max: 10,
      default: 3,
      step: 0.5
    },
    rgbShift: {
      type: 'float',
      label: 'Separación RGB',
      min: 0,
      max: 1,
      default: 0.5,
      step: 0.02
    },
    palette: {
      type: 'palette',
      label: 'Paleta',
      default: ['#000811', '#0a2647', '#1a3a6b', '#4a7fc7'],
      minColors: 2,
      maxColors: 8
    }
  },

  renderer: 'glsl',
  vertexShader,
  fragmentShader,
  svgExportable: false
};
