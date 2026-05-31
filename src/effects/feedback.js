import vertexShader from '../shaders/common.vert.glsl?raw';
import fragmentShader from '../shaders/feedback.frag.glsl?raw';

export default {
  id: 'feedback',
  label: 'Feedback (Delay)',
  category: 'feedback',

  params: {
    feedback: {
      type: 'float',
      label: 'Feedback',
      min: 0.0,
      max: 1.0,
      default: 0.75,
      step: 0.01
    },
    decay: {
      type: 'float',
      label: 'Decaimiento',
      min: 0.5,
      max: 1.0,
      default: 0.95,
      step: 0.005
    },
    mix: {
      type: 'float',
      label: 'Mezcla',
      min: 0.0,
      max: 1.0,
      default: 0.6,
      step: 0.01
    },
    hue: {
      type: 'float',
      label: 'Tono',
      min: 0.0,
      max: 1.0,
      default: 0.0,
      step: 0.005
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
  svgExportable: false
};
