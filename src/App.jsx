import React, { useState, useEffect, useRef } from 'react';
import InputManager from './core/InputManager';
import EffectPipeline from './core/EffectPipeline';
import ExportManager from './core/ExportManager';
import ProceduralSource from './core/ProceduralSource';
import Preview from './ui/Preview';
import EffectSelector from './ui/EffectSelector';
import { PROC_SOURCES } from './ui/ExportPanel';
import { AVAILABLE_EFFECTS, getEffectById, getDefaultParams } from './effects';
import { extractPaletteFromSource } from './effects/palettes';

function App() {
  // 0. Output mode: ?output en URL → solo canvas, sin UI
  const urlParams = new URLSearchParams(window.location.search);
  const outputMode = urlParams.has('output');

  // 1. Core instances persisted in refs
  const inputManagerRef = useRef(null);
  const pipelineRef = useRef(null);
  const proceduralSourceRef = useRef(null);
  const fileInputRef = useRef(null);
  const presetInputRef = useRef(null);

  if (!inputManagerRef.current) {
    inputManagerRef.current = new InputManager();
  }
  if (!pipelineRef.current) {
    pipelineRef.current = new EffectPipeline();
  }
  if (!proceduralSourceRef.current) {
    proceduralSourceRef.current = new ProceduralSource();
  }

  const inputManager = inputManagerRef.current;
  const pipeline = pipelineRef.current;
  const proceduralSource = proceduralSourceRef.current;

  // 2. React States
  const [effectOrder, setEffectOrder] = useState(() =>
    AVAILABLE_EFFECTS.map(eff => eff.id)
  );
  const [effectsChain, setEffectsChain] = useState(() => {
    const initial = {};
    AVAILABLE_EFFECTS.forEach(eff => {
      initial[eff.id] = {
        enabled: eff.id === 'bayer-dither',
        activeParams: getDefaultParams(eff)
      };
    });
    return initial;
  });
  const [expandedEffects, setExpandedEffects] = useState(() => ({}));

  const [activeSource, setActiveSource] = useState('procedural');
  const [activeSourceName, setActiveSourceName] = useState('Procedural: Barras de Prueba');
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const [appReady, setAppReady] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const [showWelcomeHint, setShowWelcomeHint] = useState(true);
  const outputWindowRef = useRef(null);
  const outputCheckRef = useRef(null);
  const [outputWindowOpen, setOutputWindowOpen] = useState(false);
  const lastOutputFrameTimeRef = useRef(0);
  const downsampleCanvasRef = useRef(null);

  // ── Global palette state ──
  const [useGlobalPalette, setUseGlobalPalette] = useState(false);
  const [globalPalette, setGlobalPalette] = useState(['#000000', '#ffffff']);

  const updatePipelineChain = (order, chainState) => {
    const chain = order
      .filter(id => chainState[id].enabled)
      .map(id => ({
        ...getEffectById(id),
        enabled: true,
        activeParams: chainState[id].activeParams
      }));
    pipeline.setEffectsChain(chain);
  };

  // 3. Initialize
  useEffect(() => {
    const initApp = async () => {
      updatePipelineChain(effectOrder, effectsChain);

      const prevOnError = inputManager.onError;
      inputManager.onError = (msg) => {
        setErrorMessage(msg);
        setTimeout(() => setErrorMessage(null), 6000);
      };

      try {
        const defaultSource = PROC_SOURCES[0];
        await inputManager.setProceduralSource(proceduralSource, defaultSource.id);
      } catch (e) {
        console.warn('Could not initialize procedural source:', e);
      }

      setAppReady(true);

      return () => {
        inputManager.onError = prevOnError;
      };
    };

    const cleanupFn = initApp();

    return () => {
      // Clean up output window
      if (outputCheckRef.current) clearInterval(outputCheckRef.current);
      if (outputWindowRef.current && !outputWindowRef.current.closed) {
        outputWindowRef.current.close();
      }
      inputManager.dispose();
      pipeline.dispose();
      proceduralSource.dispose();
      cleanupFn.then(cb => { if (cb) cb(); });
    };
  }, []);

  // 4. Callbacks

  // ── Global palette handlers ──
  const handleToggleGlobalPalette = () => {
    const next = !useGlobalPalette;
    setUseGlobalPalette(next);
    pipeline.setGlobalPalette(globalPalette, next);
    if (!next) {
      // Restore individual effect palettes by triggering a chain update
      updatePipelineChain(effectOrder, effectsChain);
    }
  };

  const handleGlobalPaletteChange = (newPalette) => {
    setGlobalPalette(newPalette);
    pipeline.setGlobalPalette(newPalette, useGlobalPalette);
  };

  const handleToggleEffect = (effectId) => {
    const currentlyEnabled = effectsChain[effectId]?.enabled;
    const becomingEnabled = !currentlyEnabled;

    // Auto-expand on enable, auto-collapse on disable
    setExpandedEffects(prev => ({
      ...prev,
      [effectId]: becomingEnabled
    }));

    // Auto-sort: enabled effects on top, disabled on bottom
    setEffectOrder(prev => {
      // Move the toggled effect to its new position
      const idx = prev.indexOf(effectId);
      if (idx === -1) return prev;

      const rest = prev.filter(id => id !== effectId);

      if (becomingEnabled) {
        // Move to the end of the enabled section (before the first disabled)
        const firstDisabled = rest.findIndex(id => !effectsChain[id]?.enabled);
        const insertAt = firstDisabled === -1 ? rest.length : firstDisabled;
        rest.splice(insertAt, 0, effectId);
      } else {
        // Move to the start of the disabled section (after the last enabled)
        const lastEnabled = rest
          .map((id, i) => effectsChain[id]?.enabled ? i : -1)
          .filter(i => i !== -1);
        const insertAt = lastEnabled.length > 0 ? lastEnabled[lastEnabled.length - 1] + 1 : 0;
        rest.splice(insertAt, 0, effectId);
      }

      const newOrder = rest;

      // Update effects chain with new state
      setEffectsChain(prevChain => {
        const next = {
          ...prevChain,
          [effectId]: {
            ...prevChain[effectId],
            enabled: becomingEnabled
          }
        };
        updatePipelineChain(newOrder, next);
        return next;
      });

      return newOrder;
    });
  };

  const handleToggleExpand = (effectId) => {
    setExpandedEffects(prev => ({
      ...prev,
      [effectId]: !prev[effectId]
    }));
  };

  const handleMoveEffect = (effectId, direction) => {
    setEffectOrder(prev => {
      const idx = prev.indexOf(effectId);
      if (idx === -1) return prev;
      if (direction === 'up' && idx === 0) return prev;
      if (direction === 'down' && idx === prev.length - 1) return prev;

      const next = [...prev];
      const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
      [next[idx], next[swapIdx]] = [next[swapIdx], next[idx]];

      setEffectsChain(chainState => {
        updatePipelineChain(next, chainState);
        return chainState;
      });

      return next;
    });
  };

  const handleParamChange = (effectId, paramKey, val) => {
    setEffectsChain(prev => {
      const nextParams = {
        ...prev[effectId].activeParams,
        [paramKey]: val
      };
      const next = {
        ...prev,
        [effectId]: {
          ...prev[effectId],
          activeParams: nextParams
        }
      };
      pipeline.updateEffectParam(effectId, paramKey, val);
      updatePipelineChain(effectOrder, next);
      return next;
    });
  };

  const handleSourceChange = (sourceType, sourceName) => {
    setActiveSource(sourceType);
    setActiveSourceName(sourceName);
    setIsVideoPlaying(sourceType === 'camera' || sourceType === 'video');
    setShowWelcomeHint(false);
    setErrorMessage(null);
  };

  const handleProceduralSource = async (type) => {
    try {
      await inputManager.setProceduralSource(proceduralSource, type);
      const src = PROC_SOURCES.find(s => s.id === type);
      handleSourceChange('procedural', `Procedural: ${src?.label || type}`);
    } catch (e) {
      console.warn('Error setting procedural source:', e);
    }
  };

  const handleTogglePlay = () => {
    const playing = inputManager.togglePlayback();
    setIsVideoPlaying(playing);
  };

  // ── Output window (popup con SOLO el canvas, sin chrome del navegador) ──
  const handleToggleOutputWindow = () => {
    if (outputWindowRef.current && !outputWindowRef.current.closed) {
      // Cerrar ventana
      outputWindowRef.current.close();
      outputWindowRef.current = null;
      setOutputWindowOpen(false);
    } else {
      // Abrir ventana popup sin NINGÚN elemento de navegador
      // Las features vacías "" o con todos en no fuerzan popup minimalista
      const popup = window.open('', 'DeepPixel Output',
        'width=1280,height=720,toolbar=no,menubar=no,location=no,personalbar=no,status=no,titlebar=no,scrollbars=no,resizable=yes');
      if (!popup) {
        setErrorMessage('El navegador bloqueó la ventana emergente. Permite popups para DeepPixel.');
        return;
      }

      // Maximizar ventana para que ocupe casi toda la pantalla
      try {
        popup.moveTo(0, 0);
        popup.resizeTo(screen.availWidth, screen.availHeight);
        popup.focus();
      } catch (e) { /* algunos browsers restringen moveTo/resizeTo */ }

      // Escribir HTML ultra-mínimo: canvas puro, 0 chrome, 0 UI
      popup.document.write(`<!DOCTYPE html>
<html>
<head>
<title>DeepPixel Output</title>
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  html, body {
    width:100%; height:100%;
    background:#000;
    overflow:hidden;
  }
  body {
    display:flex;
    justify-content:center;
    align-items:center;
  }
  canvas {
    display:block;
    width:100%;
    height:100%;
    object-fit:cover;
  }
  #hint {
    position:fixed; bottom:24px; left:50%; transform:translateX(-50%);
    font-family:monospace; font-size:13px; color:rgba(255,255,255,0.25);
    background:rgba(0,0,0,0.5); padding:6px 14px; border-radius:4px;
    pointer-events:none; user-select:none;
    transition:opacity 2s;
  }
</style>
</head>
<body>
<canvas id="c"></canvas>
<div id="hint">Doble click = pantalla completa &bull; ESC = cerrar</div>
<script>
var canvas = document.getElementById('c');
var ctx = canvas.getContext('2d');
var pending = false;
var hintEl = document.getElementById('hint');

// Ocultar hint después de 4 segundos
setTimeout(function() { hintEl.style.opacity = '0'; }, 4000);

// Auto-fullscreen al cargar (requiere gesto de usuario, pero a veces funciona)
setTimeout(function() {
  document.body.requestFullscreen().catch(function(){});
}, 500);

// Recibir frames via postMessage
window.addEventListener('message', function(e) {
  if (e.data && e.data._type === 'frame' && e.data.bitmap) {
    if (pending) { e.data.bitmap.close(); return; }
    pending = true;
    var bmp = e.data.bitmap;
    canvas.width = bmp.width;
    canvas.height = bmp.height;
    ctx.drawImage(bmp, 0, 0);
    bmp.close();
    pending = false;
  }
});

// Doble click = pantalla completa / salir
document.addEventListener('dblclick', function() {
  if (!document.fullscreenElement) {
    document.body.requestFullscreen().catch(function(){});
  } else {
    document.exitFullscreen().catch(function(){});
  }
});

// ESC = cerrar ventana (solo si no está en fullscreen)
document.addEventListener('keydown', function(e) {
  if (e.key === 'Escape') {
    if (!document.fullscreenElement) window.close();
  }
});
<\/script>
</body>
</html>`);
      popup.document.close();
      outputWindowRef.current = popup;
      setOutputWindowOpen(true);

      // Limpiar intervalo anterior
      if (outputCheckRef.current) clearInterval(outputCheckRef.current);
      // Detectar cierre manual de la ventana
      const checkClosed = setInterval(() => {
        if (popup.closed) {
          clearInterval(checkClosed);
          outputCheckRef.current = null;
          outputWindowRef.current = null;
          setOutputWindowOpen(false);
        }
      }, 1000);
      outputCheckRef.current = checkClosed;
    }
  };

  // Send frame to output window (called by Preview after each render)
  // Throttled a ~30fps y con resolución reducida para evitar GPU readback caro
  const sendOutputFrame = (canvas) => {
    const win = outputWindowRef.current;
    if (!win || win.closed) return;

    // Throttle: máximo ~30fps (33ms entre frames)
    const now = performance.now();
    if (now - lastOutputFrameTimeRef.current < 33) return;
    lastOutputFrameTimeRef.current = now;

    try {
      // Downsample a mitad de resolución para reducir el readback de GPU
      let sourceCanvas = canvas;
      const w = canvas.width;
      const h = canvas.height;
      if (w > 640 || h > 480) {
        if (!downsampleCanvasRef.current) {
          downsampleCanvasRef.current = document.createElement('canvas');
        }
        const sw = Math.round(w / 2);
        const sh = Math.round(h / 2);
        downsampleCanvasRef.current.width = sw;
        downsampleCanvasRef.current.height = sh;
        const ctx = downsampleCanvasRef.current.getContext('2d');
        ctx.drawImage(canvas, 0, 0, sw, sh);
        sourceCanvas = downsampleCanvasRef.current;
      }

      createImageBitmap(sourceCanvas).then(bitmap => {
        if (!win.closed) {
          win.postMessage({ _type: 'frame', bitmap }, '*', [bitmap]);
        } else {
          bitmap.close();
        }
      }).catch(() => {});
    } catch (e) {
      // Silently fail if createImageBitmap is not supported
    }
  };

  // ── Source handlers (header) ──
  const handleActivateWebcam = async () => {
    try {
      await inputManager.setCamera();
      handleSourceChange('camera', 'Cámara Web');
    } catch (e) { /* handled by onError */ }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.type.startsWith('image/')) {
      await inputManager.setImage(file);
      handleSourceChange('image', file.name);
    } else if (file.type.startsWith('video/')) {
      await inputManager.setVideo(file);
      handleSourceChange('video', file.name);
    } else {
      alert('Formato no soportado.');
    }
  };

  // ── Export handlers (header) ──
  const handleExportPNG = () => {
    if (!pipeline.renderer) return;
    const canvas = pipeline.renderer.domElement;
    if (!canvas) return;
    const url = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.href = url;
    link.download = `deeppixel-${Date.now()}.png`;
    link.click();
  };

  const handleExportSVG = () => {
    if (!pipeline.renderer) return;
    const canvas = pipeline.renderer.domElement;
    if (!canvas) return;
    try {
      const svgString = ExportManager.exportSVG(canvas, {});
      const blob = new Blob([svgString], { type: 'image/svg+xml' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `deeppixel-vector-${Date.now()}.svg`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('SVG export error:', err);
    }
  };

  const handleExportPreset = () => {
    const firstEnabled = effectOrder
      .filter(id => effectsChain[id]?.enabled)
      .map(id => ({ id, params: effectsChain[id].activeParams }))[0];
    if (!firstEnabled) return;
    const presetData = { version: '1.0', timestamp: Date.now(), preset: { effectId: firstEnabled.id, params: firstEnabled.params } };
    const blob = new Blob([JSON.stringify(presetData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `deeppixel-preset-${Date.now()}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleImportPreset = (effectId, params) => {
    setEffectsChain(prev => {
      const next = {
        ...prev,
        [effectId]: { enabled: true, activeParams: params }
      };
      Object.keys(params).forEach(key => pipeline.updateEffectParam(effectId, key, params[key]));
      updatePipelineChain(effectOrder, next);
      return next;
    });
    setExpandedEffects(prev => ({ ...prev, [effectId]: true }));
  };

  const handleImportPresetFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target.result);
        if (data.version && data.preset) handleImportPreset(data.preset.effectId, data.preset.params);
        else alert('Formato de preset inválido.');
      } catch { alert('Error al leer el preset.'); }
    };
    reader.readAsText(file);
  };

  const firstEnabledEffect = effectOrder
    .filter(id => effectsChain[id]?.enabled)
    .map(id => ({ id, params: effectsChain[id].activeParams }))[0];

  // ── Pantalla de carga ──
  if (!appReady) {
    return (
      <div style={{
        height: '100vh', width: '100vw', backgroundColor: '#111112',
        display: 'flex', justifyContent: 'center', alignItems: 'center',
        fontFamily: 'var(--font-mono)', color: '#ff6b00',
        textTransform: 'uppercase', letterSpacing: '0.2em'
      }}>
        [ Inicializando DeepPixel... ]
      </div>
    );
  }

  // ── Modo output (?output) — solo el canvas, sin header ni sidebar ──
  if (outputMode) {
    return (
      <div className="output-mode-fullscreen">
        <Preview
          inputManager={inputManager}
          pipeline={pipeline}
          isVideoPlaying={isVideoPlaying}
          onTogglePlay={handleTogglePlay}
          onOutputFrame={sendOutputFrame}
          showOverlays={false}
        />
      </div>
    );
  }

  return (
    <>
      {/* ═══════════ HEADER COMPACTO ═══════════ */}
      <header className="app-header-vj">
        {/* Logo */}
        <div className="header-logo">DEEPPIXEL</div>

        {/* Source & Export Controls */}
        <div className="header-controls">
          {/* ── FUENTE label ── */}
          <span className="header-section-label">FUENTE</span>
          {/* ── Source: Camera + Upload + Procedural row ── */}
          <div className="header-source-row">
            <button className="hbtn" onClick={handleActivateWebcam}
              data-active={activeSource === 'camera'}>
              ◉ CÁMARA
            </button>
            <button className="hbtn" onClick={() => fileInputRef.current?.click()}>
              ⤒ SUBIR
            </button>
            <input ref={fileInputRef} type="file" accept="image/*,video/*" className="hidden-file-input" onChange={handleFileUpload} />

            <span className="header-divider" />

            {PROC_SOURCES.map(s => (
              <button key={s.id} className={`hbtn hbtn-proc ${activeSource === 'procedural' && inputManager.proceduralSource?.type === s.id ? 'active' : ''}`}
                onClick={() => handleProceduralSource(s.id)} title={s.description}>
                {s.label === 'Barras de Prueba' ? '▦' : s.label === 'Textura CRT' ? '≡' : '◎'} {s.label === 'Barras de Prueba' ? 'BARRAS' : s.label === 'Textura CRT' ? 'CRT' : 'MOIRÉ'}
              </button>
            ))}
          </div>

          <span className="header-section-label">PALETA</span>
          {/* ── Global palette toggle ── */}
          <div className="header-global-palette">
            <button
              className={`hbtn ${useGlobalPalette ? 'active' : ''}`}
              onClick={handleToggleGlobalPalette}
              title="Activar paleta global — unifica todos los efectos bajo una misma paleta"
            >
              {useGlobalPalette ? '◉ GLOBAL' : '◯ GLOBAL'}
            </button>
          </div>

          <span className="header-section-label">EXPORT</span>
          {/* ── Export buttons ── */}
          <div className="header-export-row">
            <button className="hbtn" onClick={handleExportPNG} title="Exportar PNG">
              ⬇ PNG
            </button>
            {firstEnabledEffect && (
              <button className="hbtn" onClick={handleExportSVG} title="Exportar SVG">
                ⬇ SVG
              </button>
            )}
            <span className="header-divider" />
            <button className="hbtn" onClick={handleExportPreset} title="Exportar preset JSON">
              ☰ PRESET
            </button>
            <button className="hbtn" onClick={() => presetInputRef.current?.click()} title="Importar preset JSON">
              ☷ IMP.
            </button>
            <input ref={presetInputRef} type="file" accept=".json" className="hidden-file-input" onChange={handleImportPresetFile} />
            <span className="header-divider" />
            <button className={`hbtn ${outputWindowOpen ? 'active' : ''}`} onClick={handleToggleOutputWindow} title="Ventana de output — abre una ventana separada con solo el canvas">
              {outputWindowOpen ? '◉ OUTPUT' : '◇ OUTPUT'}
            </button>
          </div>
        </div>

        {/* Source status */}
        <div className="header-status-vj">
          <span className={`status-led ${activeSource !== 'none' ? 'orange' : 'red'}`} />
          <span className="header-source-label">{activeSourceName.toUpperCase()}</span>
        </div>
      </header>

      {/* ═══════════ MAIN LAYOUT ═══════════ */}
      <main className="app-container-vj">

        {/* Sidebar: ONLY effects */}
        <aside className="sidebar-vj">
          <div className="sidebar-header-vj">
            <span className="sidebar-title">CADENA DE EFECTOS</span>
            <span className="sidebar-count">
              {effectOrder.filter(id => effectsChain[id]?.enabled).length}/{effectOrder.length}
            </span>
            <div className="sidebar-actions">
              <button className="sidebar-btn" onClick={() => {
                const all = {}; AVAILABLE_EFFECTS.forEach(eff => { all[eff.id] = true; }); setExpandedEffects(all);
              }}>[+]</button>
              <button className="sidebar-btn" onClick={() => setExpandedEffects({})}>[−]</button>
            </div>
          </div>

          <div className="sidebar-effects">
            <EffectSelector
              effectsChain={effectsChain}
              effectOrder={effectOrder}              expandedEffects={expandedEffects}
                onToggleEffect={handleToggleEffect}
                onToggleExpand={handleToggleExpand}
                onMoveEffect={handleMoveEffect}
                onParamChange={handleParamChange}
                onExtractPalette={(effectId, paramKey) => {
                  // Grab pixel data from the current source
                  const src = inputManager.getTexture();
                  if (!src) return;
                  const img = src.image || src;
                  if (img instanceof HTMLCanvasElement || img instanceof HTMLImageElement || img instanceof HTMLVideoElement) {
                    const palette = extractPaletteFromSource(img, 8);
                    if (palette) {
                      handleParamChange(effectId, paramKey, palette);
                    }
                  } else if (img instanceof HTMLCanvasElement === false && src.source?.data) {
                    try {
                      const offscreen = document.createElement('canvas');
                      offscreen.width = src.source.data.width || 64;
                      offscreen.height = src.source.data.height || 64;
                      const ctx = offscreen.getContext('2d');
                      const imgData = new ImageData(
                        new Uint8ClampedArray(src.source.data),
                        offscreen.width,
                        offscreen.height
                      );
                      ctx.putImageData(imgData, 0, 0);
                      const palette = extractPaletteFromSource(offscreen, 8);
                      if (palette) handleParamChange(effectId, paramKey, palette);
                    } catch (e) {
                      console.warn('Could not extract palette from data texture', e);
                    }
                  }
                }}
                getEffectById={getEffectById}
                onCollapseAll={() => setExpandedEffects({})}
                onExpandAll={() => {
                  const all = {}; AVAILABLE_EFFECTS.forEach(eff => { all[eff.id] = true; }); setExpandedEffects(all);
                }}
                globalPalette={globalPalette}
                useGlobalPalette={useGlobalPalette}
                onGlobalPaletteChange={handleGlobalPaletteChange}
            />
          </div>
        </aside>

        {/* Preview */}
        <section className="viewport-vj">
          <Preview
            inputManager={inputManager}
            pipeline={pipeline}
            isVideoPlaying={isVideoPlaying}
            onTogglePlay={handleTogglePlay}
            onOutputFrame={sendOutputFrame}
          />
        </section>

      </main>

      {errorMessage && (
        <div className="error-toast" onClick={() => setErrorMessage(null)}>
          <span className="error-toast-icon">⚠</span>
          <span>{errorMessage}</span>
        </div>
      )}

      {showWelcomeHint && (
        <div className="welcome-hint">
          <span>Elegí un generador VJ, subí video, o activá la cámara para empezar</span>
        </div>
      )}
    </>
  );
}

export default App;
