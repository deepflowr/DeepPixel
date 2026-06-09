import React, { useState, useEffect, useRef, useCallback } from 'react';
import InputManager from '../core/InputManager';
import EffectPipeline from '../core/EffectPipeline';
import ProceduralSource from '../core/ProceduralSource';
import Preview from '../ui/Preview';
import EffectInfo from '../ui/EffectInfo';
import PerformanceEffects from '../ui/PerformanceEffects';
import { PerformanceProvider } from '../core/PerformanceContext';
import { PROC_SOURCES } from '../ui/ExportPanel';
import { AVAILABLE_EFFECTS, getEffectById, getDefaultParams } from '../effects';
import { connect, sendFrame } from '../utils/websocket';

const ControlPage = () => {
  // 1. Core instances
  const inputManagerRef = useRef(null);
  const pipelineRef = useRef(null);
  const proceduralSourceRef = useRef(null);
  const fileInputRef = useRef(null);
  const presetInputRef = useRef(null);

  if (!inputManagerRef.current) inputManagerRef.current = new InputManager();
  if (!pipelineRef.current) pipelineRef.current = new EffectPipeline();
  if (!proceduralSourceRef.current) proceduralSourceRef.current = new ProceduralSource();

  const inputManager = inputManagerRef.current;
  const pipeline = pipelineRef.current;
  const proceduralSource = proceduralSourceRef.current;

  // 2. State
  const [effectOrder] = useState(() => AVAILABLE_EFFECTS.map(eff => eff.id));
  const [effectsChain, setEffectsChain] = useState(() => {
    const initial = {};
    AVAILABLE_EFFECTS.forEach(eff => {
      initial[eff.id] = {
        enabled: eff.id === 'scanlines',
        activeParams: getDefaultParams(eff)
      };
    });
    return initial;
  });

  const [activeSource, setActiveSource] = useState('procedural');
  const [activeSourceName, setActiveSourceName] = useState('Procedural: Barras de Prueba');
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const [appReady, setAppReady] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);

  const lastFrameTimeRef = useRef(0);
  const downsampleCanvasRef = useRef(null);

  const wsRef = useRef(null);
  const [sessionId, setSessionId] = useState(null);
  const [wsConnected, setWsConnected] = useState(false);
  const [viewerLink, setViewerLink] = useState(null);
  const [viewerLinkCopied, setViewerLinkCopied] = useState(false);
  const [viewerCount, setViewerCount] = useState(0);
  const [showHelp, setShowHelp] = useState(false);

  // ── Color mode ──
  // 'original' → el shader muestra los colores originales de la fuente (passthrough)
  // 'palette'  → todos los efectos usan la paleta definida abajo
  // RANDOM es una ACCIÓN que genera colores aleatorios y cambia a 'palette'
  const [colorMode, setColorMode] = useState('original');
  const [globalPalette, setGlobalPalette] = useState(['#000000', '#ffffff', '#ff6b00', '#00ff66']);

  const updatePipelineChain = (order, chainState, mode = colorMode, palette = globalPalette) => {
    const chain = order
      .filter(id => chainState[id].enabled)
      .map(id => ({
        ...getEffectById(id),
        enabled: true,
        activeParams: chainState[id].activeParams
      }));

    const usePalette = (mode === 'palette');

    // Apply palette override only in 'palette' mode
    if (usePalette && palette && palette.length >= 2) {
      chain.forEach(eff => {
        eff.activeParams = { ...eff.activeParams, palette: [...palette] };
      });
    }
    pipeline.setEffectsChain(chain);
    // Sync pipeline flags
    pipeline.useGlobalPalette = usePalette;
    pipeline.useOriginalColors = (mode === 'original');
    if (palette && palette.length >= 2) {
      pipeline.globalPalette = palette;
    }
  };

  // 3. Init
  useEffect(() => {
    const initApp = async () => {
      updatePipelineChain(effectOrder, effectsChain);

      inputManager.onError = (msg) => {
        setErrorMessage(msg);
        setTimeout(() => setErrorMessage(null), 6000);
      };

      try {
        await inputManager.setProceduralSource(proceduralSource, PROC_SOURCES[0].id);
      } catch (e) {
        console.warn('Could not initialize procedural source:', e);
      }

      setAppReady(true);
    };

    initApp();

    // ── WebSocket: connect as controller ──
    let ws = null;
    connect('controller').then(result => {
      ws = result.ws;
      wsRef.current = result.ws;

      // sessionId comes directly from the resolved promise
      if (result.sessionId) {
        setSessionId(result.sessionId);
      }
      setWsConnected(true);

      result.ws.addEventListener('message', (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.type === 'viewer-connected') {
            setViewerCount(msg.count);
          } else if (msg.type === 'viewer-disconnected') {
            setViewerCount(msg.count);
          }
        } catch (_) {}
      });
    }).catch(err => {
      console.warn('[WS] Could not connect:', err.message);
      setWsConnected(false);
    });

    return () => {
      if (ws) ws.close();
      inputManager.dispose();
      pipeline.dispose();
      proceduralSource.dispose();
    };
  }, []);

  // Keep pipeline in sync with color mode / palette changes
  useEffect(() => {
    updatePipelineChain(effectOrder, effectsChain);
  }, [colorMode, globalPalette]);

  // 4. Callbacks
  const handleToggleEffect = (effectId) => {
    setEffectsChain(prev => {
      const becomingEnabled = !prev[effectId].enabled;
      const next = {
        ...prev,
        [effectId]: { ...prev[effectId], enabled: becomingEnabled }
      };
      updatePipelineChain(effectOrder, next);
      return next;
    });
  };

  const handleParamChange = (effectId, paramKey, val) => {
    setEffectsChain(prev => {
      const nextParams = { ...prev[effectId].activeParams, [paramKey]: val };
      const next = {
        ...prev,
        [effectId]: { ...prev[effectId], activeParams: nextParams }
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
    setErrorMessage(null);
  };

  const handleProceduralSource = async (type) => {
    try {
      await inputManager.setProceduralSource(proceduralSource, type);
      const src = PROC_SOURCES.find(s => s.id === type);
      handleSourceChange('procedural', `Procedural: ${src?.label || type}`);
    } catch (e) { console.warn(e); }
  };

  const handleTogglePlay = () => {
    setIsVideoPlaying(inputManager.togglePlayback());
  };

  const handleActivateWebcam = async () => {
    try {
      await inputManager.setCamera();
      handleSourceChange('camera', 'Cámara Web');
    } catch (e) { /* */ }
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

  const handleExportPNG = () => {
    if (!pipeline.renderer) return;
    const canvas = pipeline.renderer.domElement;
    if (!canvas) return;
    const link = document.createElement('a');
    link.href = canvas.toDataURL('image/png');
    link.download = `deeppixel-${Date.now()}.png`;
    link.click();
  };

  const handleExportPreset = () => {
    const presetData = {
      version: '1.0',
      timestamp: Date.now(),
      effectsChain,
      effectOrder,
      globalPalette,
      colorMode,
      activeSource,
      activeSourceName
    };
    const blob = new Blob([JSON.stringify(presetData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `deeppixel-preset-${Date.now()}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleImportPreset = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target.result);
        if (data.version && data.effectsChain) {
          setEffectsChain(data.effectsChain);
          if (data.globalPalette) setGlobalPalette(data.globalPalette);            if (data.colorMode) {
            // Normalize legacy 'global' → 'palette'
            const mode = data.colorMode === 'global' ? 'palette' : data.colorMode;
            setColorMode(mode);
            updatePipelineChain(data.effectOrder || effectOrder, data.effectsChain, mode, data.globalPalette || globalPalette);
          } else {
            // Legacy preset compatibility
            const legacyMode = (data.useGlobalPalette !== false) ? 'palette' : 'original';
            setColorMode(legacyMode);
            updatePipelineChain(data.effectOrder || effectOrder, data.effectsChain, legacyMode, data.globalPalette || globalPalette);
          }
        } else {
          alert('Archivo JSON no compatible con DeepPixel.');
        }
      } catch (err) {
        alert('Error al leer el preset: ' + err.message);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const sendOutputFrame = useCallback((canvas) => {
    const now = Date.now();
    // Throttle to ~15 fps (every 66ms)
    if (now - lastFrameTimeRef.current < 66) return;
    lastFrameTimeRef.current = now;
    if (wsRef.current) {
      sendFrame(wsRef.current, canvas);
    }
  }, []);

  const baseUrl = window.location.origin + import.meta.env.BASE_URL;
  const host = window.location.hostname || 'localhost';
  // In dev, WS runs on port 3001; in production, same port as the page
  const wsParam = import.meta.env.DEV ? `ws=${host}:3001` : '';

  const buildViewerUrl = (sid) => {
    let url = `${baseUrl}viewer?session=${sid}`;
    if (wsParam) url += `&${wsParam}`;
    return url;
  };

  // When session arrives after a link was already generated (without session),
  // auto-update the link with the session ID
  useEffect(() => {
    if (sessionId && viewerLink && !viewerLink.includes('session=')) {
      setViewerLink(buildViewerUrl(sessionId));
    }
  }, [sessionId]);

  // Viewer link
  const handleGenerateViewerLink = () => {
    if (sessionId) {
      setViewerLink(buildViewerUrl(sessionId));
    } else {
      // Without session, generate a basic link (viewer will show connecting)
      let url = `${baseUrl}viewer`;
      if (wsParam) url += `?${wsParam}`;
      setViewerLink(url);
    }
    setViewerLinkCopied(false);
  };

  const handleCopyViewerLink = () => {
    if (viewerLink) {
      navigator.clipboard.writeText(viewerLink).then(() => {
        setViewerLinkCopied(true);
        setTimeout(() => setViewerLinkCopied(false), 2000);
      }).catch(() => {
        const ta = document.createElement('textarea');
        ta.value = viewerLink;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
        setViewerLinkCopied(true);
        setTimeout(() => setViewerLinkCopied(false), 2000);
      });
    }
  };

  // ── Color mode handlers ──
  const handleColorMode = (mode) => {
    setColorMode(mode);
    updatePipelineChain(effectOrder, effectsChain, mode, globalPalette);
  };

  const handleRandomPalette = () => {
    // Generate random colors → set them in the swatches → switch to 'palette' mode
    const colors = [];
    const count = globalPalette.length;
    for (let i = 0; i < count; i++) {
      const r = Math.floor(Math.random() * 200 + 30);
      const g = Math.floor(Math.random() * 200 + 30);
      const b = Math.floor(Math.random() * 200 + 30);
      const hex = '#' + [r,g,b].map(c => c.toString(16).padStart(2,'0')).join('');
      colors.push(hex);
    }
    setGlobalPalette(colors);
    setColorMode('palette');
    updatePipelineChain(effectOrder, effectsChain, 'palette', colors);
  };

  const handleGlobalPaletteChange = (index, newHex) => {
    const next = [...globalPalette];
    next[index] = newHex;
    setGlobalPalette(next);
    // Auto-switch to 'palette' if editing colors while in 'original'
    if (colorMode === 'original') {
      setColorMode('palette');
      updatePipelineChain(effectOrder, effectsChain, 'palette', next);
    } else {
      updatePipelineChain(effectOrder, effectsChain, colorMode, next);
    }
  };

  // Palette is fixed at 4 colors — reorder via drag in the UI

  // Loading
  if (!appReady) {
    return (
      <div className="ctrl-loading">
        <div className="ctrl-loading-text">[ Inicializando DeepPixel... ]</div>
        <div className="ctrl-loading-bar"><div className="ctrl-loading-bar-fill" /></div>
      </div>
    );
  }

  const enabledCount = effectOrder.filter(id => effectsChain[id]?.enabled).length;

  return (
    <PerformanceProvider>
    <div className="ctrl-root">
      {/* ═══ MAIN LAYOUT — NO TOPBAR ═══ */}
      <div className="ctrl-main">
        {/* ─── LEFT: Effects Grid 4×4 ─── */}
        <div className="ctrl-grid-panel">
          <div className="ctrl-grid-header">
            <div className="ctrl-grid-header-left">
              <span className="ctrl-logo">DEEPPIXEL</span>
              <span className="ctrl-grid-hint">activá efectos con los toggle &bull; ajustá sliders &bull; proyectá con VIEWER LINK</span>
            </div>
            <div className="ctrl-grid-header-right">
              <button className="ctrl-help-btn" onClick={() => setShowHelp(true)} title="Ayuda">?</button>
            </div>
          </div>
          <div className="ctrl-effects-bar">
            <span className="ctrl-effects-label">EFFECTS</span>
            <span className="ctrl-led ctrl-led-xs" data-color="green" />
            <span className="ctrl-effects-count">{enabledCount}/{effectOrder.length}</span>
          </div>
          <div className="ctrl-grid">
            {effectOrder.map((effectId) => {
              const effect = getEffectById(effectId);
              if (!effect) return null;
              const isEnabled = effectsChain[effectId]?.enabled || false;
              const activeParams = effectsChain[effectId]?.activeParams || {};

              // Non-palette params only
              const displayParams = Object.entries(effect.params || {})
                .filter(([key, spec]) => spec.type !== 'palette');

              return (
                <div key={effectId} className={`ctrl-grid-cell ${isEnabled ? 'cell-on' : 'cell-off'}`}>
                  {/* Cell header: name + toggle */}
                  <div className="ctrl-cell-header">
                    <span className="ctrl-cell-name">{effect.label.toUpperCase()}</span>
                    <EffectInfo effect={effect} isEnabled={isEnabled} />
                    <button
                      className={`ctrl-cell-toggle ${isEnabled ? 'toggle-on' : 'toggle-off'}`}
                      onClick={() => handleToggleEffect(effectId)}
                      title={isEnabled ? 'Desactivar' : 'Activar'}
                    >
                      <span className="ctrl-toggle-knob" />
                    </button>
                  </div>

                  {/* Params — always visible, only highlight when enabled */}
                  {displayParams.length > 0 ? (
                    <div className="ctrl-cell-params">
                      {displayParams.map(([key, spec]) => {
                        const val = activeParams[key] !== undefined ? activeParams[key] : spec.default;
                        if (spec.type === 'float' || spec.type === 'int') {
                          return (
                            <div key={key} className="ctrl-cell-param">
                              <span className="ctrl-cell-param-label">{spec.label}</span>
                              <div className="ctrl-cell-param-row">
                                <input
                                  type="range"
                                  className="ctrl-cell-slider"
                                  min={spec.min}
                                  max={spec.max}
                                  step={spec.step || (spec.type === 'int' ? 1 : 0.01)}
                                  value={val}
                                  onChange={(e) => {
                                    const v = spec.type === 'int' ? parseInt(e.target.value, 10) : parseFloat(e.target.value);
                                    handleParamChange(effectId, key, v);
                                  }}
                                />
                                <span className="ctrl-cell-param-val">{val}</span>
                              </div>
                            </div>
                          );
                        }
                        if (spec.type === 'select') {
                          const options = spec.options;
                          const idx = options.indexOf(val);
                          const curIdx = idx !== -1 ? idx : 0;
                          return (
                            <div key={key} className="ctrl-cell-param">
                              <span className="ctrl-cell-param-label">{spec.label}</span>
                              <div className="ctrl-cell-param-row">
                                <input
                                  type="range"
                                  className="ctrl-cell-slider"
                                  min={0}
                                  max={options.length - 1}
                                  step={1}
                                  value={curIdx}
                                  onChange={(e) => handleParamChange(effectId, key, options[parseInt(e.target.value, 10)])}
                                />
                                <span className="ctrl-cell-param-val">{val}</span>
                              </div>
                            </div>
                          );
                        }
                        return null;
                      })}
                    </div>
                  ) : (
                    <div className="ctrl-cell-empty">sin parámetros</div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* ─── RIGHT SIDEBAR: Preview → Source → Palette → Viewer → Export ─── */}
        <div className="ctrl-rightbar">
          {/* Preview — fixed 16:9 at top */}
          <div className="ctrl-preview-box">
            <div className="ctrl-preview-header">
              <span className="ctrl-preview-label">PREVIEW</span>
              <span className="ctrl-led ctrl-led-xs" data-color="green" />
            </div>
            <div className="ctrl-preview-wrap">
              <Preview
                inputManager={inputManager}
                pipeline={pipeline}
                isVideoPlaying={isVideoPlaying}
                onTogglePlay={handleTogglePlay}
                onOutputFrame={sendOutputFrame}
              />
            </div>
          </div>

          {/* Source Controls */}
          <div className="ctrl-section">
            <div className="ctrl-section-header">
              <span className="ctrl-section-label">SOURCE</span>
              <span className="ctrl-led ctrl-led-xs" data-color={activeSource !== 'none' ? 'green' : 'red'} />
              <span className="ctrl-section-status">{activeSourceName.toUpperCase()}</span>
            </div>
            <div className="ctrl-section-body ctrl-source-body">
              <div className="ctrl-source-row">
                <button className={`ctrl-btn-side ${activeSource === 'camera' ? 'active' : ''}`} onClick={handleActivateWebcam}>
                  <span className="ctrl-led ctrl-led-xs" data-color={activeSource === 'camera' ? 'green' : 'off'} />
                  CÁMARA
                </button>
                <button className="ctrl-btn-side" onClick={() => fileInputRef.current?.click()}>
                  ARCHIVO
                </button>
                <input ref={fileInputRef} type="file" accept="image/*,video/*" className="ctrl-hidden" onChange={handleFileUpload} />
              </div>
              <span className="ctrl-source-label">o elegí una muestra</span>
              <div className="ctrl-source-row">
                {PROC_SOURCES.map(s => (
                  <button
                    key={s.id}
                    className={`ctrl-btn-side proc ${activeSource === 'procedural' && inputManager.proceduralSource?.type === s.id ? 'active' : ''}`}
                    onClick={() => handleProceduralSource(s.id)}
                    title={s.description}
                  >
                    {s.label === 'Neon City' ? 'NEON' : s.label === 'Wireframe 3D' ? 'WIRE' : 'PLASMA'}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Palette Section: Mode Toggle + Color Editor */}
          <div className="ctrl-section">
            <div className="ctrl-section-header">
              <span className="ctrl-section-label">PALETA</span>
              <span className="ctrl-section-count">{globalPalette.length} colores</span>
            </div>
            <div className="ctrl-section-body">
              {/* Color mode selector */}
              <div className="ctrl-source-row" style={{ marginBottom: '6px' }}>
                <button
                  className={`ctrl-btn-mode ${colorMode === 'original' ? 'active' : ''}`}
                  onClick={() => handleColorMode('original')}
                  title="Colores originales de la imagen"
                >
                  <span className="ctrl-led ctrl-led-xs" data-color={colorMode === 'original' ? 'green' : 'off'} />
                  ORIGINAL
                </button>
                <button
                  className={`ctrl-btn-mode ${colorMode === 'palette' ? 'active' : ''}`}
                  onClick={() => handleColorMode('palette')}
                  title="Usar los colores de abajo"
                >
                  <span className="ctrl-led ctrl-led-xs" data-color={colorMode === 'palette' ? 'green' : 'off'} />
                  PALETA
                </button>
              </div>

              {/* Color swatches — 4 fijos, drag para reordenar */}
              <div className="ctrl-palette-colors">
                {globalPalette.map((hex, i) => (
                  <div
                    key={i}
                    className="ctrl-palette-slot"
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData('text/plain', i.toString());
                      e.dataTransfer.effectAllowed = 'move';
                    }}
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.dataTransfer.dropEffect = 'move';
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      const fromIdx = parseInt(e.dataTransfer.getData('text/plain'), 10);
                      if (fromIdx === i) return;
                      const next = [...globalPalette];
                      const temp = next[fromIdx];
                      next[fromIdx] = next[i];
                      next[i] = temp;
                      setGlobalPalette(next);
                      if (colorMode === 'palette') {
                        updatePipelineChain(effectOrder, effectsChain, colorMode, next);
                      }
                    }}
                  >
                    <div className="ctrl-palette-swatch-wrap">
                      <input type="color" className="ctrl-palette-input" value={hex}
                        onChange={(e) => handleGlobalPaletteChange(i, e.target.value)} />
                      <span className="ctrl-palette-swatch" style={{ backgroundColor: hex }} />
                    </div>
                    <input className="ctrl-palette-hex" type="text" value={hex.toUpperCase()}
                      onChange={(e) => handleGlobalPaletteChange(i, e.target.value)} maxLength={7} />
                  </div>
                ))}
                <div className="ctrl-palette-actions">
                  <button
                    className="ctrl-btn-mode"
                    onClick={handleRandomPalette}
                    title="Generar paleta aleatoria"
                    style={{ flex: 'none', fontSize: '0.6rem', height: '28px', padding: '4px 10px' }}
                  >
                    <span className="ctrl-led ctrl-led-xs" data-color="off" />
                    RANDOM
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Viewer Link */}
          <div className="ctrl-section">
            <div className="ctrl-section-header">
              <span className="ctrl-section-label">VIEWER LINK</span>
              <span className="ctrl-led ctrl-led-xs" data-color={wsConnected ? 'green' : 'red'} />
              {viewerCount > 0 && (
                <span className="ctrl-section-count">{viewerCount} viewer{viewerCount > 1 ? 's' : ''}</span>
              )}
            </div>
            <div className="ctrl-section-body">
              {!wsConnected && !sessionId && (
                <span className="ctrl-source-label" style={{ color: '#ff6b00', marginBottom: 0 }}>esperando servidor...</span>
              )}
              <button className="ctrl-btn-generate" onClick={handleGenerateViewerLink}>
                <span className="ctrl-led ctrl-led-xs" data-color="orange" />
                {viewerLink ? 'REGENERAR' : 'GENERAR LINK'}
              </button>
              {viewerLink && (
                <div className="ctrl-viewer-link-row">
                  <code className="ctrl-viewer-link-text">{viewerLink}</code>
                  <button className={`ctrl-btn-copy ${viewerLinkCopied ? 'copied' : ''}`} onClick={handleCopyViewerLink}>
                    {viewerLinkCopied ? '✓' : 'COPY'}
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Export (PNG + Presets) */}
          <div className="ctrl-section">
            <div className="ctrl-section-header">
              <span className="ctrl-section-label">EXPORT</span>
            </div>
            <div className="ctrl-section-body">
              <button className="ctrl-btn-side" onClick={handleExportPNG} style={{ width: '100%', justifyContent: 'center' }}>
                ⬇ PNG
              </button>
              <div className="ctrl-source-row">
                <button className="ctrl-btn-side" onClick={handleExportPreset} style={{ flex: 1 }}>
                  GUARDAR PRESET
                </button>
                <button className="ctrl-btn-side" onClick={() => presetInputRef.current?.click()} style={{ flex: 1 }}>
                  CARGAR PRESET
                </button>
                <input ref={presetInputRef} type="file" accept=".json" className="ctrl-hidden" onChange={handleImportPreset} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── PERFORMANCE FX BAR — full-width at bottom ── */}
      <PerformanceEffects />

      {errorMessage && (
        <div className="ctrl-toast" onClick={() => setErrorMessage(null)}>
          <span className="ctrl-toast-icon">⚠</span>
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Help Modal */}
      {showHelp && (
        <div className="ctrl-modal-overlay" onClick={() => setShowHelp(false)}>
          <div className="ctrl-modal" onClick={(e) => e.stopPropagation()}>
            <div className="ctrl-modal-header">
              <span className="ctrl-modal-title">CÓMO USAR DEEPPIXEL</span>
              <button className="ctrl-modal-close" onClick={() => setShowHelp(false)}>✕</button>
            </div>
            <div className="ctrl-modal-body">
              <div className="ctrl-modal-step">
                <span className="ctrl-modal-step-num">1</span>
                <div>
                  <strong>Elegí una fuente</strong>
                  <p>Usá CÁMARA, SUBÍ un archivo, o seleccioná un generador VJ (NEON / WIRE / PLASMA) en el panel SOURCE.</p>
                </div>
              </div>
              <div className="ctrl-modal-step">
                <span className="ctrl-modal-step-num">2</span>
                <div>
                  <strong>Activá efectos</strong>
                  <p>Usá los toggle switches naranjas para prender o apagar cada efecto. Ajustá los sliders para modificar parámetros en tiempo real.</p>
                </div>
              </div>
              <div className="ctrl-modal-step">
                <span className="ctrl-modal-step-num">3</span>
                <div>
                  <strong>Personalizá la paleta</strong>
                  <p>Cambiá los colores de la PALETA GLOBAL. Usá RND para generar una paleta aleatoria al instante.</p>
                </div>
              </div>
              <div className="ctrl-modal-step">
                <span className="ctrl-modal-step-num">4</span>
                <div>
                  <strong>Proyectá con el Viewer</strong>
                  <p>Generá un VIEWER LINK y abrilo en otra pantalla o dispositivo para ver la señal en vivo, sin interfaz, a pantalla completa.</p>
                </div>
              </div>
              <div className="ctrl-modal-step">
                <span className="ctrl-modal-step-num">5</span>
                <div>
                  <strong>Performance FX en vivo</strong>
                  <p>Usá los controles de la barra PERFORMANCE (abajo) para agregar post-procesamiento en tiempo real: STROBE, BEAT ZOOM, SHAKE y WOBBLE. Ajustá AMOUNT y DIV (división rítmica). Usá TAP para marcar el BPM o ingresalo manualmente.</p>
                </div>
              </div>
              <div className="ctrl-modal-step">
                <span className="ctrl-modal-step-num">6</span>
                <div>
                  <strong>Exportá</strong>
                  <p>Descargá el frame actual como PNG desde el botón EXPORT.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
    </PerformanceProvider>
  );
};

export default ControlPage;
