import vertexShader from '../shaders/common.vert.glsl?raw';
import fragmentShader from '../shaders/kaleidoscope.frag.glsl?raw';

export default {
  id: 'kaleidoscope',
  label: 'Caleidoscopio',
  category: 'transform',

  params: {
    segments: {
      type: 'int',
      label: 'Segmentos',
      min: 2,
      max: 24,
      default: 6,
      step: 1
    },
    zoom: {
      type: 'float',
      label: 'Zoom',
      min: 0.5,
      max: 3.0,
      default: 1.0,
      step: 0.05
    },
    rotation: {
      type: 'float',
      label: 'Rotación',
      min: 0.0,
      max: 6.28,
      default: 0.0,
      step: 0.05
    },
    palette: {
      type: 'palette',
      label: 'Paleta',
      default: ['#ff0066', '#ffcc00', '#00ffcc', '#6600ff'],
      minColors: 2,
      maxColors: 8
    }
  },

  renderer: 'glsl',
  vertexShader,
  fragmentShader,
  svgExportable: false
};
