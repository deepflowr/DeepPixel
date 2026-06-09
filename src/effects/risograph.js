import vertexShader from '../shaders/common.vert.glsl?raw';
import fragmentShader from '../shaders/risograph.frag.glsl?raw';

export default {
  id: 'risograph',
  label: 'Risograph',
  category: 'print',

  params: {
    offsetX: {
      type: 'float',
      label: 'Offset X',
      min: -20,
      max: 20,
      default: 3,
      step: 0.5
    },
    offsetY: {
      type: 'float',
      label: 'Offset Y',
      min: -20,
      max: 20,
      default: -2,
      step: 0.5
    },
    grain: {
      type: 'float',
      label: 'Grano Papel',
      min: 0,
      max: 1,
      default: 0.3,
      step: 0.02
    },
    split: {
      type: 'float',
      label: 'División Tonal',
      min: 0.2,
      max: 0.8,
      default: 0.45,
      step: 0.02
    },
    palette: {
      type: 'palette',
      label: 'Paleta',
      default: ['#1a1a2e', '#e94560'],
      minColors: 2,
      maxColors: 2
    }
  },

  renderer: 'glsl',
  vertexShader,
  fragmentShader,
  svgExportable: false
};
