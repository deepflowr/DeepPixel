import vertexShader from '../shaders/common.vert.glsl?raw';
import fragmentShader from '../shaders/scanlines.frag.glsl?raw';

export default {
  id: 'scanlines',
  label: 'Scanlines CRT',
  category: 'retro',
  
  params: {
    intensity: {
      type: 'float',
      label: 'Intensidad',
      min: 0.0,
      max: 1.0,
      default: 0.3,
      step: 0.02
    },
    spacing: {
      type: 'select',
      label: 'Espaciado',
      options: [2, 3, 4, 6, 8, 10, 12],
      default: 4
    }
  },
  
  renderer: 'glsl',
  vertexShader,
  fragmentShader,
  svgExportable: true
};
