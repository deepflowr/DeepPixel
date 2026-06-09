import vertexShader from '../shaders/common.vert.glsl?raw';
import fragmentShader from '../shaders/feedback.frag.glsl?raw';

export default {
  id: 'feedback',
  label: 'Feedback',
  category: 'feedback',

  params: {
    feedback: {
      type: 'float',
      label: 'Feedback',
      min: 0.0,
      max: 1.0,
      default: 0.9,
      step: 0.02
    },
    decay: {
      type: 'float',
      label: 'Decaimiento',
      min: 0.5,
      max: 1.0,
      default: 0.99,
      step: 0.005
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
