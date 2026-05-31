import * as THREE from 'three';

const PASSTHROUGH_FRAG = `
uniform sampler2D tDiffuse;
varying vec2 vUv;
void main() {
    gl_FragColor = texture2D(tDiffuse, vUv);
}
`;

class EffectPipeline {
  constructor(renderer) {
    this.renderer = renderer;
    this.effects = [];
    
    this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    this.scene = new THREE.Scene();
    this.geometry = new THREE.PlaneGeometry(2, 2);
    this.mesh = null;
    
    this.renderTarget1 = null;
    this.renderTarget2 = null;
    this.width = 0;
    this.height = 0;
    
    // CPU processing canvas
    this.offscreenCanvas = null;
    this.offscreenCtx = null;
    this.cpuTexture = null;
    
    this.passthroughMaterial = new THREE.ShaderMaterial({
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: PASSTHROUGH_FRAG,
      uniforms: {
        tDiffuse: { value: null }
      },
      depthWrite: false,
      depthTest: false
    });
    
    this.materialsCache = new Map();
  }

  setSize(width, height) {
    if (this.width === width && this.height === height) return;
    
    this.width = width;
    this.height = height;
    
    this.disposeRenderTargets();
    
    const options = {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      format: THREE.RGBAFormat,
      type: THREE.UnsignedByteType
    };
    
    this.renderTarget1 = new THREE.WebGLRenderTarget(width, height, options);
    this.renderTarget2 = new THREE.WebGLRenderTarget(width, height, options);
  }

  setEffectsChain(newEffectsChain) {
    this.effects = newEffectsChain;
  }

  getEffectMaterial(effectConfig, vertexShader, fragmentShader) {
    const cacheKey = effectConfig.id;
    if (this.materialsCache.has(cacheKey)) {
      return this.materialsCache.get(cacheKey);
    }
    
    const uniforms = {
      tDiffuse: { value: null },
      uResolution: { value: new THREE.Vector2(this.width, this.height) },
      uTime: { value: 0.0 }
    };
    
    Object.keys(effectConfig.params).forEach(paramKey => {
      const paramSpec = effectConfig.params[paramKey];
      const initialVal = effectConfig.activeParams && effectConfig.activeParams[paramKey] !== undefined 
        ? effectConfig.activeParams[paramKey] 
        : paramSpec.default;
        
      if (paramSpec.type === 'color-pair') {
        uniforms[`uColor1`] = { value: new THREE.Color(initialVal[0]) };
        uniforms[`uColor2`] = { value: new THREE.Color(initialVal[1]) };
      } else if (paramSpec.type === 'color') {
        uniforms[`u${paramKey.charAt(0).toUpperCase() + paramKey.slice(1)}`] = { value: new THREE.Color(initialVal) };
      } else {
        uniforms[`u${paramKey.charAt(0).toUpperCase() + paramKey.slice(1)}`] = { value: initialVal };
      }
    });
    
    const material = new THREE.ShaderMaterial({
      vertexShader: vertexShader,
      fragmentShader: fragmentShader,
      uniforms: uniforms,
      depthWrite: false,
      depthTest: false
    });
    
    this.materialsCache.set(cacheKey, material);
    return material;
  }

  updateEffectParam(effectId, paramKey, val) {
    const material = this.materialsCache.get(effectId);
    if (!material) return;
    
    const uniformName = `u${paramKey.charAt(0).toUpperCase() + paramKey.slice(1)}`;
    
    if (material.uniforms[uniformName]) {
      material.uniforms[uniformName].value = val;
    } else if (paramKey === 'palette') {
      if (material.uniforms['uColor1']) material.uniforms['uColor1'].value.set(val[0]);
      if (material.uniforms['uColor2']) material.uniforms['uColor2'].value.set(val[1]);
    } else if (uniformName === 'uColor') {
      if (material.uniforms['uColor']) material.uniforms['uColor'].value.set(val);
    }
  }

  // CPU effect execution
  runCPUEffect(effect, inputTexture) {
    if (!this.offscreenCanvas) {
      this.offscreenCanvas = document.createElement('canvas');
      this.offscreenCtx = this.offscreenCanvas.getContext('2d');
    }

    // Try to draw from original image/video elements to avoid GPU sync block
    const img = inputTexture.image || this.renderer.domElement;
    if (!img) return inputTexture;

    const pixelSize = Number(effect.activeParams.pixelSize) || 1;
    
    // Sub-sampled canvas resolution matching dither level
    const sourceW = img.width || img.videoWidth || this.width;
    const sourceH = img.height || img.videoHeight || this.height;
    
    const procW = Math.max(16, Math.floor(sourceW / pixelSize));
    const procH = Math.max(16, Math.floor(sourceH / pixelSize));

    if (this.offscreenCanvas.width !== procW || this.offscreenCanvas.height !== procH) {
      this.offscreenCanvas.width = procW;
      this.offscreenCanvas.height = procH;
    }

    // Draw frame buffer
    this.offscreenCtx.drawImage(img, 0, 0, procW, procH);

    // Process on CPU
    const imgData = this.offscreenCtx.getImageData(0, 0, procW, procH);
    const processedData = effect.processFn(imgData, effect.activeParams);
    this.offscreenCtx.putImageData(processedData, 0, 0);

    // Load back to GPU as sharp CanvasTexture
    if (!this.cpuTexture) {
      this.cpuTexture = new THREE.CanvasTexture(this.offscreenCanvas);
      this.cpuTexture.minFilter = THREE.NearestFilter;
      this.cpuTexture.magFilter = THREE.NearestFilter;
    } else {
      this.cpuTexture.image = this.offscreenCanvas;
      this.cpuTexture.needsUpdate = true;
    }

    return this.cpuTexture;
  }

  render(inputTexture, time = 0.0) {
    if (!inputTexture) return;
    
    const totalEffects = this.effects.length;
    
    if (totalEffects === 0) {
      this.renderQuad(this.passthroughMaterial, inputTexture, null, true);
      return;
    }
    
    let currentInput = inputTexture;
    let readTarget = this.renderTarget1;
    let writeTarget = this.renderTarget2;
    
    for (let i = 0; i < totalEffects; i++) {
      const effect = this.effects[i];
      const isLast = (i === totalEffects - 1);
      
      if (effect.renderer === 'cpu') {
        // Run CPU shader process
        currentInput = this.runCPUEffect(effect, currentInput);
        
        // If it is the last step, render it to the screen via passthrough
        if (isLast) {
          this.renderQuad(this.passthroughMaterial, currentInput, null, true);
        }
      } else {
        // GPU Shader execution
        const material = this.getEffectMaterial(effect, effect.vertexShader, effect.fragmentShader);
        
        if (material.uniforms.uTime) material.uniforms.uTime.value = time;
        if (material.uniforms.uResolution) {
          material.uniforms.uResolution.value.set(this.width, this.height);
        }
        
        const target = isLast ? null : writeTarget;
        const isSource = (currentInput === inputTexture || (this.cpuTexture && currentInput === this.cpuTexture));
        
        this.renderQuad(material, currentInput, target, isSource);
        
        if (!isLast) {
          currentInput = writeTarget.texture;
          const temp = readTarget;
          readTarget = writeTarget;
          writeTarget = temp;
        }
      }
    }
  }

  renderQuad(material, inputTexture, renderTarget, applyAspect = false) {
    if (material.uniforms.tDiffuse) {
      material.uniforms.tDiffuse.value = inputTexture;
    }
    
    this.scene.clear();
    
    if (this.mesh) {
      this.mesh.geometry.dispose();
    }
    
    this.mesh = new THREE.Mesh(this.geometry, material);
    
    // Apply aspect ratio scale to mesh vertices
    if (applyAspect && this.textureAspect) {
      const canvasAspect = this.width / this.height;
      if (this.textureAspect > canvasAspect) {
        this.mesh.scale.y = canvasAspect / this.textureAspect;
      } else {
        this.mesh.scale.x = this.textureAspect / canvasAspect;
      }
    }
    
    this.scene.add(this.mesh);
    
    this.renderer.setRenderTarget(renderTarget);
    this.renderer.render(this.scene, this.camera);
  }

  disposeRenderTargets() {
    if (this.renderTarget1) {
      this.renderTarget1.dispose();
      this.renderTarget1 = null;
    }
    if (this.renderTarget2) {
      this.renderTarget2.dispose();
      this.renderTarget2 = null;
    }
  }

  dispose() {
    this.disposeRenderTargets();
    this.geometry.dispose();
    if (this.mesh) {
      this.mesh.geometry.dispose();
    }
    
    this.passthroughMaterial.dispose();
    this.materialsCache.forEach(material => {
      material.dispose();
    });
    this.materialsCache.clear();
    
    if (this.cpuTexture) {
      this.cpuTexture.dispose();
      this.cpuTexture = null;
    }
    this.offscreenCanvas = null;
    this.offscreenCtx = null;
  }
}

export default EffectPipeline;
