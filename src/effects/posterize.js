import vertexShader from '../shaders/common.vert.glsl?raw';
import fragmentShader from '../shaders/posterize.frag.glsl?raw';

export default {
  id: 'posterize',
  label: 'Posterizar',
  category: 'tone',

  params: {
    steps: {
      type: 'int',
      label: 'Pasos',
      min: 2,
      max: 32,
      default: 6,
      step: 1
    },
    palette: {
      type: 'palette',
      label: 'Paleta',
      default: ['#ffff00', '#ff00ff'],
      minColors: 2,
      maxColors: 8
    }
  },

  renderer: 'glsl',
  vertexShader,
  fragmentShader,
  svgExportable: true
};
