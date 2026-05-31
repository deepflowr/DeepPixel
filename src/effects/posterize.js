import vertexShader from '../shaders/common.vert.glsl?raw';
import fragmentShader from '../shaders/posterize.frag.glsl?raw';

export default {
  id: 'posterize',
  label: 'Posterización',
  category: 'tone',

  params: {
    levels: {
      type: 'int',
      label: 'Niveles',
      min: 2,
      max: 16,
      default: 4,
      step: 1
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
