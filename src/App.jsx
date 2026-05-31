import React, { useState, useEffect, useRef } from 'react';
import InputManager from './core/InputManager';
import EffectPipeline from './core/EffectPipeline';
import ExportManager from './core/ExportManager';
import Preview from './ui/Preview';
import Controls from './ui/Controls';
import EffectSelector from './ui/EffectSelector';
import ExportPanel, { STOCK_SAMPLES } from './ui/ExportPanel';
import { AVAILABLE_EFFECTS, getEffectById, getDefaultParams } from './effects';

function App() {
  // 1. Core instances persisted in refs
  const inputManagerRef = useRef(null);
  const pipelineRef = useRef(null);
  
  if (!inputManagerRef.current) {
    inputManagerRef.current = new InputManager();
  }
  if (!pipelineRef.current) {
    pipelineRef.current = new EffectPipeline();
  }

  const inputManager = inputManagerRef.current;
  const pipeline = pipelineRef.current;

  // 2. React States
  const [activeEffectId, setActiveEffectId] = useState('bayer-dither');
  const [effectsChain, setEffectsChain] = useState(() => {
    // Generate initial active/bypass state for all available effects
    const initial = {};
    AVAILABLE_EFFECTS.forEach(eff => {
      initial[eff.id] = {
        enabled: eff.id === 'bayer-dither', // Enable bayer-dither by default
        activeParams: getDefaultParams(eff)
      };
    });
    return initial;
  });
  
  const [activeSource, setActiveSource] = useState('image');
  const [activeSourceName, setActiveSourceName] = useState('Muestra: Hormigón');
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const [appReady, setAppReady] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const [showWelcomeHint, setShowWelcomeHint] = useState(true);

  // 3. Initialize default settings and preloaded template image
  useEffect(() => {
    const initApp = async () => {
      // Sync initial active chain states to pipeline
      updatePipelineChain(effectsChain);

      // Wire up error handler
      inputManager.onError = (msg) => {
        setErrorMessage(msg);
        // Auto-dismiss after 6 seconds
        setTimeout(() => setErrorMessage(null), 6000);
      };

      // Load default concrete brutalist image
      try {
        const defaultSample = STOCK_SAMPLES[0];
        await inputManager.setImage(defaultSample.url);
      } catch (e) {
        console.warn('Could not load default image:', e);
      }
      
      setAppReady(true);
    };

    initApp();

    return () => {
      inputManager.dispose();
      pipeline.dispose();
    };
  }, []);

  // Update pipeline chain helper
  const updatePipelineChain = (chainState) => {
    const chain = AVAILABLE_EFFECTS
      .filter(eff => chainState[eff.id].enabled)
      .map(eff => ({
        ...eff,
        enabled: true,
        activeParams: chainState[eff.id].activeParams
      }));
    pipeline.setEffectsChain(chain);
  };

  // 4. Interactive Callbacks

  // Focus on a specific effect channel to edit parameters
  const handleSelectEffect = (effectId) => {
    setActiveEffectId(effectId);
  };

  // Toggle effect bypass/activation on GPU render chain
  const handleToggleEffect = (effectId) => {
    setEffectsChain(prev => {
      const next = {
        ...prev,
        [effectId]: {
          ...prev[effectId],
          enabled: !prev[effectId].enabled
        }
      };
      
      // Update pipeline render sequence
      updatePipelineChain(next);
      return next;
    });
  };

  // Handle fader/slider changes
  const handleParamChange = (paramKey, val) => {
    setEffectsChain(prev => {
      const nextParams = {
        ...prev[activeEffectId].activeParams,
        [paramKey]: val
      };
      
      const next = {
        ...prev,
        [activeEffectId]: {
          ...prev[activeEffectId],
          activeParams: nextParams
        }
      };

      // Direct sync to shader uniforms (extremely performant!)
      pipeline.updateEffectParam(activeEffectId, paramKey, val);
      
      // Sync complete chain configurations
      updatePipelineChain(next);
      return next;
    });
  };

  // Handle source updates
  const handleSourceChange = (sourceType, sourceName) => {
    setActiveSource(sourceType);
    setActiveSourceName(sourceName);
    setIsVideoPlaying(sourceType === 'camera' || sourceType === 'video');
    setShowWelcomeHint(false);
    setErrorMessage(null); // Clear errors on successful source change
  };

  // Toggle video playback loop
  const handleTogglePlay = () => {
    const playing = inputManager.togglePlayback();
    setIsVideoPlaying(playing);
  };

  // Export frame buffer to PNG file
  const handleExportPNG = () => {
    if (!pipeline.renderer) {
      alert('Error: El visualizador WebGL no está activo.');
      return;
    }
    
    const canvas = pipeline.renderer.domElement;
    if (!canvas) return;

    const url = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.href = url;
    link.download = `deeppixel-render-${Date.now()}.png`;
    link.click();
  };

  // Export frame buffer to optimized SVG vector paths
  const handleExportSVG = () => {
    if (!pipeline.renderer) {
      alert('Error: El visualizador WebGL no está activo.');
      return;
    }
    
    const canvas = pipeline.renderer.domElement;
    if (!canvas) return;

    try {
      const svgString = ExportManager.exportSVG(canvas, activeParams);
      const blob = new Blob([svgString], { type: 'image/svg+xml' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `deeppixel-vector-${Date.now()}.svg`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('SVG export error:', err);
      alert('Error al generar el SVG. Intenta con una resolución menor.');
    }
  };

  // Import JSON preset configurations
  const handleImportPreset = (effectId, params) => {
    setEffectsChain(prev => {
      const next = {
        ...prev,
        [effectId]: {
          enabled: true, // enable it automatically on load
          activeParams: params
        }
      };

      // Focus on loaded effect
      setActiveEffectId(effectId);
      
      // Sync loaded uniforms to GPU
      Object.keys(params).forEach(key => {
        pipeline.updateEffectParam(effectId, key, params[key]);
      });

      updatePipelineChain(next);
      return next;
    });
  };

  const activeEffect = getEffectById(activeEffectId);
  const activeParams = effectsChain[activeEffectId]?.activeParams || {};

  if (!appReady) {
    return (
      <div style={{
        height: '100vh',
        width: '100vw',
        backgroundColor: '#111112',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        fontFamily: 'var(--font-mono)',
        color: '#ff6b00',
        textTransform: 'uppercase',
        letterSpacing: '0.2em'
      }}>
        [ Inicializando DeepPixel Analog Processing System... ]
      </div>
    );
  }

  return (
    <>
      {/* 1. APP HEADER */}
      <header className="app-header">
        <div className="logo-container">
          <div className="logo-text">
            DEEPPIXEL
            <span className="logo-badge">v1.0 BETA [ANALOG]</span>
          </div>
        </div>
        <div className="header-status">
          <div className="source-indicator">
            <span>SOURCE:</span>
            <span className="source-name">
              {activeSourceName.toUpperCase()}
            </span>
            <span className={`status-led ${activeSource !== 'none' ? 'orange' : 'red'}`} />
          </div>
        </div>
      </header>

      {/* 2. MAIN SYSTEM LAYOUT */}
      <main className="app-container">
        
        {/* Sidebar Controls */}
        <aside className="control-sidebar">
          
          {/* Module 1: Input source selection */}
          <section className="panel-module">
            <h2 className="panel-module-title">
              [ FUENTE DE ENTRADA ]
              <span className="active-indicator" />
            </h2>
            <ExportPanel 
              mode="input"
              inputManager={inputManager}
              activeSource={activeSource}
              onSourceChange={handleSourceChange}
              activeParams={activeParams}
              activeEffectId={activeEffectId}
              onImportPreset={handleImportPreset}
            />
          </section>

          {/* Module 2: Effect channel toggling and bypass */}
          <section className="panel-module">
            <h2 className="panel-module-title">
              [ CANAL DE EFECTO ]
              <span className="active-indicator" />
            </h2>
            <EffectSelector 
              activeEffectId={activeEffectId}
              effectsChain={effectsChain}
              onSelectEffect={handleSelectEffect}
              onToggleEffect={handleToggleEffect}
            />
          </section>

          {/* Module 3: Slider parameter adjusters */}
          <section className="panel-module" style={{ flex: 1 }}>
            <h2 className="panel-module-title">
              [ CONTROLES DE CANAL ]
              <span className="active-indicator" />
            </h2>
            <Controls 
              activeEffect={activeEffect}
              activeParams={activeParams}
              onParamChange={handleParamChange}
              isEnabled={effectsChain[activeEffectId]?.enabled || false}
              onEnableEffect={() => handleToggleEffect(activeEffectId)}
            />
          </section>

          {/* Module 4: Output saving options */}
          <section className="panel-module">
            <h2 className="panel-module-title">
              [ EMISIÓN Y EXPORTACIÓN ]
              <span className="active-indicator" />
            </h2>
            <ExportPanel 
              mode="export"
              inputManager={inputManager}
              activeSource={activeSource}
              onSourceChange={handleSourceChange}
              onExportPNG={handleExportPNG}
              onExportSVG={handleExportSVG}
              svgExportable={activeEffect?.svgExportable || false}
              activeParams={activeParams}
              activeEffectId={activeEffectId}
              onImportPreset={handleImportPreset}
            />
          </section>

        </aside>

        {/* Real-time Render Viewport */}
        <section style={{ flex: 1, height: '100%', position: 'relative' }}>
          <Preview 
            inputManager={inputManager}
            pipeline={pipeline}
            isVideoPlaying={isVideoPlaying}
            onTogglePlay={handleTogglePlay}
          />
        </section>

      </main>

      {/* Error notification toast */}
      {errorMessage && (
        <div className="error-toast" onClick={() => setErrorMessage(null)}>
          <span className="error-toast-icon">⚠</span>
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Welcome hint overlay (fades out on first interaction) */}
      {showWelcomeHint && (
        <div className="welcome-hint">
          <span>Seleccioná una imagen de muestra, subí un archivo, o activá la cámara para empezar</span>
        </div>
      )}
    </>
  );
}

export default App;
