import vertexShader from '../shaders/common.vert.glsl?raw';
import fragmentShader from '../shaders/stucki.frag.glsl?raw';

export default {
  id: 'stucki',
  label: 'Flowy',
  category: 'feedback',

  params: {
    speed: {
      type: 'float',
      label: 'Velocidad',
      min: 0.0,
      max: 5.0,
      default: 1.0,
      step: 0.1
    },
    zoom: {
      type: 'float',
      label: 'Zoom',
      min: 0.0,
      max: 1.0,
      default: 0.5,
      step: 0.02
    },
    rotation: {
      type: 'float',
      label: 'Rotación',
      min: 0.0,
      max: 2.0,
      default: 1.0,
      step: 0.05
    },
    mix: {
      type: 'float',
      label: 'Mezcla',
      min: 0.01,
      max: 1.0,
      default: 0.15,
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
  svgExportable: false
};
