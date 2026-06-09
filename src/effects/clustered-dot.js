import vertexShader from '../shaders/common.vert.glsl?raw';
import fragmentShader from '../shaders/clustered-dot.frag.glsl?raw';

export default {
  id: 'clustered-dot',
  label: 'ASCII Art',
  category: 'retro',

  params: {
    blockSize: {
      type: 'int',
      label: 'Bloque',
      min: 4,
      max: 32,
      default: 8,
      step: 1
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
