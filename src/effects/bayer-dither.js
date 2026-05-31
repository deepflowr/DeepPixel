import vertexShader from '../shaders/common.vert.glsl?raw';
import fragmentShader from '../shaders/bayer.frag.glsl?raw';

export default {
  id: 'bayer-dither',
  label: 'Dither Bayer',
  category: 'dither',
  
  params: {
    threshold: {
      type: 'float',
      label: 'Umbral',
      min: 0.0,
      max: 1.0,
      default: 0.5,
      step: 0.01
    },
    matrixSize: {
      type: 'select',
      label: 'Tamaño Matriz',
      options: [2, 4, 8],
      default: 4
    },
    pixelSize: {
      type: 'int',
      label: 'Pixelado',
      min: 1,
      max: 16,
      default: 1,
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
      default: 0.0, // Pure black & white by default!
      step: 0.01
    }
  },
  
  renderer: 'glsl',
  vertexShader,
  fragmentShader,
  svgExportable: true
};
