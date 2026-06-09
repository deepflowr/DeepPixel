/**
 * ProceduralSource - generates real-time animated canvas textures
 * for use as VJ input sources. Designed to provide rich detail
 * at multiple scales so effects (dithering, halftone, glitch, etc.)
 * have texture to work with.
 */

// Vite raw imports of shader sources — inlined at build time
import neonCitySrc from '../shaders/neon-city.frag.glsl?raw';
import wireframeSrc from '../shaders/wireframe.frag.glsl?raw';
import plasmaSrc from '../shaders/plasma.frag.glsl?raw';

class ProceduralSource {
  constructor() {
    this.canvas = document.createElement('canvas');
    this.canvas.width = 640;
    this.canvas.height = 360;
    this.ctx = this.canvas.getContext('2d');
    this.imageData = null;
    this.pixelData = null;
    this.type = 'neon-city';
    this.startTime = performance.now() / 1000;

    // WebGL2 shader renderer cache
    this._gl = null;
    this._glCanvas = null;
    this._glProgram = null;
    this._glVao = null;
    this._shaderSrc = null;
  }

  get time() {
    return (performance.now() / 1000) - this.startTime;
  }

  setType(type) {
    this.type = type;
    this.startTime = performance.now() / 1000;
  }

  setSize(w, h) {
    this.canvas.width = w;
    this.canvas.height = h;
    this.imageData = null;
    this.pixelData = null;
    // Reset WebGL cache so it's recreated at new size
    this._glCanvas = null;
    this._gl = null;
  }

  update() {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;

    switch (this.type) {
      case 'neon-city':  this.renderNeonCity(ctx, w, h); break;
      case 'wireframe':  this.renderWireframe(ctx, w, h); break;
      case 'plasma':     this.renderPlasma(ctx, w, h);    break;
    }

    return this.canvas;
  }

  /**
   * Initialize WebGL2 renderer for a given shader source.
   * If the shader source changed, it disposes and recompiles.
   */
  _initWebGL2(w, h, shaderSrc) {
    // Check if we need to recreate the context (size or shader change)
    const needsResize = !this._glCanvas || this._glCanvas.width !== w || this._glCanvas.height !== h;
    const needsRecompile = shaderSrc && shaderSrc !== this._shaderSrc;

    if (this._gl && this._glProgram && !needsResize && !needsRecompile) {
      return true;
    }

    // Dispose old resources if needed
    if (needsRecompile && this._gl) {
      if (this._glProgram) this._gl.deleteProgram(this._glProgram);
      this._glProgram = null;
    }

    if (needsResize || !this._glCanvas) {
      this._glCanvas = document.createElement('canvas');
      this._glCanvas.width = w;
      this._glCanvas.height = h;
      // Force context recreation on resize
      this._gl = null;
      this._glProgram = null;
    }

    if (!this._gl) {
      const gl = this._glCanvas.getContext('webgl2', {
        alpha: false,
        antialias: false,
        preserveDrawingBuffer: true,
        depth: false,
        stencil: false
      });
      if (!gl) {
        console.warn('[ProceduralSource] WebGL2 not available');
        return false;
      }
      this._gl = gl;
    }

    const gl = this._gl;
    this._shaderSrc = shaderSrc;

    // Vertex shader: full-screen quad
    const vsSrc = `#version 300 es
      in vec2 aPosition;
      out vec2 vUv;
      void main() {
        vUv = aPosition * 0.5 + 0.5;
        gl_Position = vec4(aPosition, 0.0, 1.0);
      }
    `;

    const vs = this._compileShader(gl, gl.VERTEX_SHADER, vsSrc);
    const fs = this._compileShader(gl, gl.FRAGMENT_SHADER, shaderSrc);
    if (!vs || !fs) return false;

    const program = gl.createProgram();
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.warn('[ProceduralSource] Shader link error:', gl.getProgramInfoLog(program));
      return false;
    }
    this._glProgram = program;

    // Full-screen quad: 2 triangles = 6 vertices
    const positions = new Float32Array([
      -1, -1,   1, -1,   -1,  1,
      -1,  1,   1, -1,    1,  1
    ]);

    const vao = gl.createVertexArray();
    gl.bindVertexArray(vao);
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);
    const posLoc = gl.getAttribLocation(program, 'aPosition');
    gl.enableVertexAttribArray(posLoc);
    gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);
    gl.bindVertexArray(null);
    this._glVao = vao;

    return true;
  }

  _compileShader(gl, type, src) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, src);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      console.warn('[ProceduralSource] Shader compile error:', gl.getShaderInfoLog(shader));
      gl.deleteShader(shader);
      return null;
    }
    return shader;
  }

  /**
   * Render GLSL shader → readPixels → putImageData on the 2D canvas.
   */
  _renderGLSLShader(ctx, w, h) {
    const gl = this._gl;
    if (!gl || !this._glProgram) {
      ctx.fillStyle = '#1a0033';
      ctx.fillRect(0, 0, w, h);
      return;
    }

    const program = this._glProgram;
    gl.useProgram(program);
    gl.bindVertexArray(this._glVao);

    const iTimeLoc = gl.getUniformLocation(program, 'iTime');
    const iResLoc = gl.getUniformLocation(program, 'iResolution');
    if (iTimeLoc) gl.uniform1f(iTimeLoc, this.time);
    if (iResLoc) gl.uniform2f(iResLoc, w, h);

    gl.viewport(0, 0, w, h);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
    gl.bindVertexArray(null);

    // Read pixels and copy to 2D canvas (flip Y)
    const pixels = new Uint8Array(w * h * 4);
    gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, pixels);

    const imageData = ctx.createImageData(w, h);
    const dst = imageData.data;
    for (let y = 0; y < h; y++) {
      const srcRow = (h - 1 - y) * w * 4;
      const dstRow = y * w * 4;
      for (let x = 0; x < w * 4; x++) {
        dst[dstRow + x] = pixels[srcRow + x];
      }
    }
    ctx.putImageData(imageData, 0, 0);
  }

  /**
   * Generic WebGL2 shader renderer — renders a given shader source to the 2D canvas.
   */
  _renderShader(ctx, w, h, shaderSrc) {
    if (!this._initWebGL2(w, h, shaderSrc)) {
      ctx.fillStyle = '#0a0a0a';
      ctx.fillRect(0, 0, w, h);
      return;
    }
    this._renderGLSLShader(ctx, w, h);
  }

  // ─── NEON CITY ──────────────────────────────────────────
  // Cyberpunk neon cityscape rendered via WebGL2 shader.
  renderNeonCity(ctx, w, h) {
    this._renderShader(ctx, w, h, neonCitySrc);
  }

  // ─── WIREFRAME ──────────────────────────────────────────
  // 3D green wireframe lattice with perspective warp.
  renderWireframe(ctx, w, h) {
    this._renderShader(ctx, w, h, wireframeSrc);
  }

  // ─── PLASMA ─────────────────────────────────────────────
  // Retro plasma with Amiga RGB444 palette, pixel art aesthetic.
  renderPlasma(ctx, w, h) {
    this._renderShader(ctx, w, h, plasmaSrc);
  }

  dispose() {
    const ctx = this.ctx;
    const canvas = this.canvas;
    if (ctx && canvas) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
    this.imageData = null;
    this.pixelData = null;
  }
}

export default ProceduralSource;
