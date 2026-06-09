import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import ProceduralSource from '../core/ProceduralSource';
import EffectPipeline from '../core/EffectPipeline';

// ── Shared mini-renderer for effect previews (lazily created, kept alive) ──
// Single tiny renderer shared across all tooltips. 160×90 is cheap enough to
// keep alive for the app's lifetime — no ref-counting needed.
let _miniRenderer = null;
let _miniPipeline = null;
let _miniProcedural = null;
let _miniTexture = null;

function getOrCreateMiniRenderer() {
  if (_miniRenderer) {
    return { renderer: _miniRenderer, pipeline: _miniPipeline, texture: _miniTexture, procedural: _miniProcedural };
  }
  const canvas = document.createElement('canvas');
  canvas.width = 160;
  canvas.height = 90;
  _miniRenderer = new THREE.WebGLRenderer({
    canvas,
    antialias: false,
    alpha: false,
    preserveDrawingBuffer: true,
  });
  _miniRenderer.setSize(160, 90, false);
  _miniRenderer.setPixelRatio(1);

  _miniPipeline = new EffectPipeline(_miniRenderer);
  _miniPipeline.setSize(160, 90);
  _miniPipeline.textureAspect = 16 / 9;

  _miniProcedural = new ProceduralSource();
  _miniProcedural.setType('test-pattern');
  _miniProcedural.setSize(160, 90);
  _miniProcedural.update();

  _miniTexture = new THREE.CanvasTexture(_miniProcedural.canvas);
  _miniTexture.minFilter = THREE.LinearFilter;
  _miniTexture.magFilter = THREE.LinearFilter;

  return { renderer: _miniRenderer, pipeline: _miniPipeline, texture: _miniTexture, procedural: _miniProcedural };
}

// ── Generate a single effect preview ──
function generatePreview(effect) {
  const { renderer, pipeline, texture, procedural } = getOrCreateMiniRenderer();

  const effConfig = {
    ...effect,
    enabled: true,
    activeParams: effect.params
      ? Object.fromEntries(
          Object.entries(effect.params).map(([k, v]) => [k, v.default])
        )
      : {},
  };

  pipeline.setEffectsChain([effConfig]);

  procedural.update();
  texture.needsUpdate = true;
  try {
    pipeline.render(texture, Math.random() * 100);
    return renderer.domElement.toDataURL('image/png');
  } catch (err) {
    console.warn('[EffectInfo] Render error:', effect.id, err.message);
    return null;
  }
}

// ── Generate base (no effect) test pattern ──
function generateBasePreview() {
  const canvas = document.createElement('canvas');
  canvas.width = 160;
  canvas.height = 90;
  const ctx = canvas.getContext('2d');

  const barW = canvas.width / 7;
  const colors = ['#fff', '#ff0', '#0ff', '#0f0', '#f0f', '#f00', '#00f'];
  colors.forEach((c, i) => {
    ctx.fillStyle = c;
    ctx.fillRect(i * barW, 0, barW, canvas.height * 0.4);
  });

  for (let x = 0; x < canvas.width; x++) {
    const v = Math.floor((x / canvas.width) * 255);
    ctx.fillStyle = `rgb(${v},${v},${v})`;
    ctx.fillRect(x, canvas.height * 0.4, 1, canvas.height * 0.2);
  }

  const grid = 8;
  for (let y = 0; y < canvas.height * 0.4; y++) {
    for (let x = 0; x < canvas.width; x++) {
      const cx = Math.floor(x / grid);
      const cy = Math.floor(y / grid);
      const bright = (cx + cy) % 2 === 0 ? 200 : 30;
      ctx.fillStyle = `rgb(${bright},${bright},${bright})`;
      ctx.fillRect(x, canvas.height * 0.6 + y, 1, 1);
    }
  }

  ctx.strokeStyle = 'rgba(255,255,255,0.1)';
  ctx.lineWidth = 0.5;
  for (let x = 0; x < canvas.width; x += 20) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, canvas.height);
    ctx.stroke();
  }
  for (let y = 0; y < canvas.height; y += 20) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(canvas.width, y);
    ctx.stroke();
  }

  return canvas.toDataURL('image/png');
}

// ── Preview cache ──
const previewCache = new Map();

const EffectInfo = ({ effect, isEnabled }) => {
  const [previews, setPreviews] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!effect) return;

    const effId = effect.id;

    if (previewCache.has(effId)) {
      setPreviews(previewCache.get(effId));
      return;
    }

    setIsLoading(true);

    const raf = requestAnimationFrame(() => {
      try {
        const baseUrl = generateBasePreview();
        const withEffectUrl = generatePreview(effect);
        const data = { base: baseUrl, effect: withEffectUrl };
        previewCache.set(effId, data);
        setPreviews(data);
      } catch (err) {
        console.warn('[EffectInfo] Preview error:', effId, err.message);
      } finally {
        setIsLoading(false);
      }
    });

    return () => cancelAnimationFrame(raf);
  }, [effect]);

  return (
    <div className={`eff-info ${isEnabled ? 'eff-info-on' : ''}`}>
      {isLoading && (
        <div className="eff-info-loading">[ generando preview... ]</div>
      )}
      {previews && (
        <div className="eff-info-previews">
          <div className="eff-info-col">
            <span className="eff-info-col-label">BASE</span>
            <img className="eff-info-img" src={previews.base} alt="Base" />
          </div>
          <div className="eff-info-arrow">&rarr;</div>
          <div className="eff-info-col">
            <span className="eff-info-col-label">{effect.label.toUpperCase()}</span>
            <img className="eff-info-img" src={previews.effect} alt={effect.label} />
          </div>
        </div>
      )}
    </div>
  );
};

export default EffectInfo;
