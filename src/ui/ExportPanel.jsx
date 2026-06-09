import React, { useRef } from 'react';

// Procedural source definitions for VJing
export const PROC_SOURCES = [
  {
    id: 'neon-city',
    label: 'Neon City',
    description: 'Ciudad cyberpunk neon con grid, sol y edificios. Shader GLSL en tiempo real.'
  },
  {
    id: 'wireframe',
    label: 'Wireframe 3D',
    description: 'Malla alámbrica 3D verde con perspectiva warp y oscilación. Shader GLSL en tiempo real.'
  },
  {
    id: 'plasma',
    label: 'Plasma Retrowave',
    description: 'Plasma retro con paleta Amiga RGB444, pixel art animado. Shader GLSL en tiempo real.'
  }
];

const ExportPanel = ({ 
  mode = 'input',
  inputManager, 
  activeSource, 
  onSourceChange,
  onProceduralSource,
  onExportPNG,
  onExportSVG,
  svgExportable = false,
  activeParams,
  activeEffectId,
  onImportPreset
}) => {
  const fileInputRef = useRef(null);
  const presetInputRef = useRef(null);

  // Handle uploading video files
  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.type.startsWith('image/')) {
      await inputManager.setImage(file);
      onSourceChange('image', file.name);
    } else if (file.type.startsWith('video/')) {
      await inputManager.setVideo(file);
      onSourceChange('video', file.name);
    } else {
      alert('Formato de archivo no soportado. Subí un video o imagen compatible.');
    }
  };

  // Set procedural animated source
  const handleSelectProcedural = (source) => {
    onProceduralSource(source.id);
    onSourceChange('procedural', `Procedural: ${source.label}`);
  };

  // Activate webcam stream
  const handleActivateWebcam = async () => {
    try {
      await inputManager.setCamera();
      onSourceChange('camera', 'Cámara Web');
    } catch (e) {
      // Error handled by inputManager.onError
    }
  };

  // Export session state to JSON
  const handleExportJSON = () => {
    const presetData = {
      version: '1.0',
      timestamp: Date.now(),
      preset: {
        effectId: activeEffectId,
        params: activeParams
      }
    };

    const blob = new Blob([JSON.stringify(presetData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `deeppixel-preset-${activeEffectId}-${Date.now()}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Import JSON preset
  const handleImportJSONClick = () => {
    if (presetInputRef.current) {
      presetInputRef.current.click();
    }
  };

  const handleImportJSONChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target.result);
        if (data.version && data.preset) {
          onImportPreset(data.preset.effectId, data.preset.params);
        } else {
          alert('Archivo JSON no compatible con el formato de presets de DeepPixel.');
        }
      } catch (err) {
        alert('Error al parsear el preset de JSON.');
      }
    };
    reader.readAsText(file);
  };

  if (mode === 'input') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {/* 1. INPUT SOURCE BUTTONS */}
        <div>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
            <button 
              className={`heavy-btn ${activeSource === 'camera' ? 'active' : ''}`}
              style={{ flex: 1, fontSize: '0.75rem' }}
              onClick={handleActivateWebcam}
            >
              [ CÁMARA ]
            </button>
            
            <button 
              className="heavy-btn"
              style={{ flex: 1, fontSize: '0.75rem' }}
              onClick={() => fileInputRef.current && fileInputRef.current.click()}
            >
              [ SUBIR FILE ]
            </button>
          </div>

          <input 
            ref={fileInputRef}
            type="file" 
            accept="image/*,video/*"
            className="hidden-file-input"
            onChange={handleFileChange}
          />
        </div>

        {/* 2. PROCEDURAL GENERATIVE SOURCES (VJing) */}
        <div>
          <label className="fader-label-row" style={{ display: 'block', marginBottom: '8px' }}>
            GENERADORES EN VIVO
          </label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {PROC_SOURCES.map((source) => (
              <button
                key={source.id}
                className={`heavy-btn ${activeSource === 'procedural' && inputManager.activeTexture && inputManager.proceduralSource?.type === source.id ? 'active' : ''}`}
                style={{ width: '100%', justifyContent: 'flex-start', fontSize: '0.75rem', gap: '8px' }}
                onClick={() => handleSelectProcedural(source)}
                title={source.description}
              >
                <span className={`status-led ${activeSource === 'procedural' ? 'orange' : ''}`} style={{ width: '6px', height: '6px' }} />
                <span>{source.label.toUpperCase()}</span>
                <span style={{ marginLeft: 'auto', fontSize: '0.55rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                  VJ
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // mode === 'export'
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <input 
        ref={presetInputRef}
        type="file" 
        accept=".json"
        className="hidden-file-input"
        onChange={handleImportJSONChange}
      />
      
      <button 
        className="heavy-btn active"
        style={{ width: '100%', padding: '12px', fontSize: '0.85rem', marginBottom: '4px' }}
        onClick={onExportPNG}
      >
        [ EXPORTAR PNG RASTER ]
      </button>

      {svgExportable && (
        <button 
          className="heavy-btn active"
          style={{ 
            width: '100%', 
            padding: '12px', 
            fontSize: '0.85rem', 
            marginBottom: '4px',
            borderColor: 'var(--accent-orange)',
            color: 'var(--accent-orange)'
          }}
          onClick={onExportSVG}
        >
          [ EXPORTAR SVG VECTOR ]
        </button>
      )}

      <div style={{ display: 'flex', gap: '8px' }}>
        <button 
          className="heavy-btn"
          style={{ flex: 1, padding: '8px', fontSize: '0.7rem' }}
          onClick={handleExportJSON}
        >
          [ EXPORT PRESET ]
        </button>
        
        <button 
          className="heavy-btn"
          style={{ flex: 1, padding: '8px', fontSize: '0.7rem' }}
          onClick={handleImportJSONClick}
        >
          [ IMPORT PRESET ]
        </button>
      </div>
    </div>
  );
};

export default ExportPanel;
