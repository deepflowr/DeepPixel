import React, { useRef } from 'react';

// Selected aesthetic high-contrast public image URLs
export const STOCK_SAMPLES = [
  {
    id: 'brutalist-concrete',
    label: 'Hormigón',
    url: 'https://images.unsplash.com/photo-1600585154526-990dced4db0d?q=80&w=600&auto=format&fit=crop',
    description: 'Sombras duras y ángulos de hormigón brutalista'
  },
  {
    id: 'retro-tech',
    label: 'CRT Macro',
    url: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?q=80&w=600&auto=format&fit=crop',
    description: 'Equipos y cables retro con texturas analógicas'
  },
  {
    id: 'contrast-tunnel',
    label: 'Silueta',
    url: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?q=80&w=600&auto=format&fit=crop',
    description: 'Contraluz extremo en túnel retroiluminado'
  }
];

const ExportPanel = ({ 
  mode = 'input', // 'input' | 'export'
  inputManager, 
  activeSource, 
  onSourceChange, 
  onExportPNG,
  onExportSVG,
  svgExportable = false,
  activeParams,
  activeEffectId,
  onImportPreset
}) => {
  const fileInputRef = useRef(null);
  const presetInputRef = useRef(null);

  // Handle uploading static files (images or video)
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
      alert('Formato de archivo no soportado. Sube una imagen o video compatible.');
    }
  };

  // Set one of our custom stocks
  const handleSelectSample = async (sample) => {
    await inputManager.setImage(sample.url);
    onSourceChange('image', `Muestra: ${sample.label}`);
  };

  // Activate webcam stream
  const handleActivateWebcam = async () => {
    try {
      await inputManager.setCamera();
      onSourceChange('camera', 'Cámara Web');
    } catch (e) {
      alert('No se pudo acceder a la cámara. Revisa los permisos de tu navegador.');
    }
  };

  // Export complete session state to JSON
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

  // Import JSON preset session
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
        {/* 1. INPUT SOURCES SECTION */}
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

        {/* 2. PRE-LOADED TEMPLATE GALLERY */}
        <div>
          <label className="fader-label-row" style={{ display: 'block', marginBottom: '8px' }}>
            IMÁGENES DE MUESTRA
          </label>
          <div className="sample-grid">
            {STOCK_SAMPLES.map((sample) => (
              <div 
                key={sample.id}
                className={`sample-thumbnail ${activeSource === 'image' && inputManager.imageElement && inputManager.imageElement.src === sample.url ? 'active' : ''}`}
                style={{ backgroundImage: `url(${sample.url})` }}
                title={sample.description}
                onClick={() => handleSelectSample(sample)}
              >
                <div className="sample-thumbnail-label">{sample.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Otherwise: mode === 'export'
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
