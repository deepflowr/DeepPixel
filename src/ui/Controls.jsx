import React, { useState, useCallback, useRef } from 'react';
import { PRESET_PALETTES } from '../effects/palettes';

/**
 * Controls — renders parameter controls for a single effect.
 * Features:
 *   - Palette editor (presets + extract from source + individual color pickers)
 *   - Stepped slider for select-style params (no dropdowns)
 *   - Standard sliders for float/int params
 */
const Controls = ({ effect, activeParams, onParamChange, onExtractPalette }) => {

  if (!effect || !effect.params || Object.keys(effect.params).length === 0) {
    return (
      <div className="mono-label" style={{
        fontSize: '0.75rem',
        color: 'var(--text-muted)',
        textAlign: 'center',
        padding: '10px 0'
      }}>
        [ Sin parámetros ajustables ]
      </div>
    );
  }

  const hasPalette = Object.values(effect.params).some(p => p.type === 'palette');

  // ── Palette Editor ──
  const renderPaletteEditor = (paramKey, paramSpec) => {
    const colors = Array.isArray(activeParams[paramKey])
      ? activeParams[paramKey]
      : paramSpec.default || ['#000000', '#ffffff'];
    const minColors = paramSpec.minColors || 2;
    const maxColors = paramSpec.maxColors || 8;

    const handleColorChange = (index, newHex) => {
      const next = [...colors];
      next[index] = newHex;
      onParamChange(effect.id, paramKey, next);
    };

    const handleAddColor = () => {
      if (colors.length >= maxColors) return;
      onParamChange(effect.id, paramKey, [...colors, '#808080']);
    };

    const handleRemoveColor = () => {
      if (colors.length <= minColors) return;
      onParamChange(effect.id, paramKey, colors.slice(0, -1));
    };

    const handlePresetSelect = (presetColors) => {
      onParamChange(effect.id, paramKey, [...presetColors]);
    };

    // Check if current palette matches any preset
    const currentSerialized = JSON.stringify(colors);
    const activePresetId = PRESET_PALETTES.find(p =>
      p.colors.length === colors.length &&
      p.colors.every((c, i) => c.toLowerCase() === colors[i]?.toLowerCase())
    )?.id || null;

    return (
      <div key={paramKey} className="fader-group">
        <div className="fader-label-row">
          <span>{paramSpec.label.toUpperCase()}</span>
          <span className="fader-val">{colors.length} colores</span>
        </div>

        {/* Preset strip */}
        <div className="palette-preset-strip">
          {PRESET_PALETTES.slice(0, 8).map(preset => (
            <button
              key={preset.id}
              className={`palette-preset-btn ${activePresetId === preset.id ? 'active' : ''}`}
              onClick={() => handlePresetSelect(preset.colors)}
              title={preset.name}
            >
              {preset.colors.map((c, i) => (
                <span
                  key={i}
                  className="palette-micro-swatch"
                  style={{ backgroundColor: c }}
                />
              ))}
            </button>
          ))}
        </div>

        {/* More presets toggle */}
        <details className="palette-more-presets">
          <summary className="palette-more-summary">+ {PRESET_PALETTES.length - 8} paletas más</summary>
          <div className="palette-preset-strip">
            {PRESET_PALETTES.slice(8).map(preset => (
              <button
                key={preset.id}
                className={`palette-preset-btn ${activePresetId === preset.id ? 'active' : ''}`}
                onClick={() => handlePresetSelect(preset.colors)}
                title={preset.name}
              >
                {preset.colors.map((c, i) => (
                  <span key={i} className="palette-micro-swatch" style={{ backgroundColor: c }} />
                ))}
              </button>
            ))}
          </div>
        </details>

        {/* Color swatches with pickers */}
        <div className="palette-color-grid">
          {colors.map((hexColor, idx) => (
            <div key={idx} className="palette-color-slot">
              <div className="palette-color-swatch-wrapper">
                <input
                  type="color"
                  className="palette-color-input"
                  value={hexColor}
                  onChange={(e) => handleColorChange(idx, e.target.value)}
                />
                <span
                  className="palette-color-swatch"
                  style={{ backgroundColor: hexColor }}
                />
              </div>
              <input
                className="palette-hex-input"
                type="text"
                value={hexColor.toUpperCase()}
                onChange={(e) => handleColorChange(idx, e.target.value)}
                maxLength={7}
              />
            </div>
          ))}
        </div>

        {/* Add/Remove buttons */}
        <div className="palette-actions">
          <button
            className="channel-toolbar-btn"
            onClick={handleAddColor}
            disabled={colors.length >= maxColors}
            title={`Agregar color (máx ${maxColors})`}
          >[ + COLOR ]</button>
          <button
            className="channel-toolbar-btn"
            onClick={handleRemoveColor}
            disabled={colors.length <= minColors}
            title={`Quitar color (mín ${minColors})`}
          >[ − COLOR ]</button>
          {typeof onExtractPalette === 'function' && (
            <button
              className="channel-toolbar-btn"
              onClick={() => onExtractPalette(paramKey)}
              title="Extraer paleta de la imagen/video actual"
              style={{ marginLeft: 'auto', color: 'var(--accent-green)' }}
            >↻ EXTRAER</button>
          )}
        </div>
      </div>
    );
  };

  // ── Render stepped slider for select-type params ──
  const renderSelectSlider = (paramKey, paramSpec) => {
    const currentValue = activeParams[paramKey] !== undefined ? activeParams[paramKey] : paramSpec.default;
    const options = paramSpec.options;
    const idx = options.indexOf(currentValue);
    const currentIdx = idx !== -1 ? idx : 0;

    return (
      <div key={paramKey} className="fader-group">
        <div className="fader-label-row">
          <span>{paramSpec.label.toUpperCase()}</span>
          <span className="fader-val">{currentValue}</span>
        </div>
        <div className="fader-track-container">
          <input
            type="range"
            className="fader-input"
            min={0}
            max={options.length - 1}
            step={1}
            value={currentIdx}
            onChange={(e) => {
              const newIdx = parseInt(e.target.value, 10);
              onParamChange(effect.id, paramKey, options[newIdx]);
            }}
          />
        </div>
        <div className="step-labels">
          {options.map((opt, i) => (
            <span
              key={i}
              className={`step-dot ${i === currentIdx ? 'step-active' : ''}`}
              onClick={() => onParamChange(effect.id, paramKey, opt)}
            >
              {opt}
            </span>
          ))}
        </div>
      </div>
    );
  };

  // ── Render a standard slider ──
  const renderSlider = (paramKey, paramSpec) => {
    const currentValue = activeParams[paramKey] !== undefined ? activeParams[paramKey] : paramSpec.default;

    return (
      <div key={paramKey} className="fader-group">
        <div className="fader-label-row">
          <span>{paramSpec.label.toUpperCase()}</span>
          <span className="fader-val">{currentValue}</span>
        </div>
        <div className="fader-track-container">
          <input
            type="range"
            className="fader-input"
            min={paramSpec.min}
            max={paramSpec.max}
            step={paramSpec.step || (paramSpec.type === 'int' ? 1 : 0.01)}
            value={currentValue}
            onChange={(e) => {
              const val = paramSpec.type === 'int' ? parseInt(e.target.value, 10) : parseFloat(e.target.value);
              onParamChange(effect.id, paramKey, val);
            }}
          />
        </div>
        <div className="fader-track-labels">
          <span>{paramSpec.min}</span>
          <span>|</span>
          <span>{paramSpec.max}</span>
        </div>
      </div>
    );
  };

  // ── Render each param ──
  const renderControl = (paramKey, paramSpec) => {
    switch (paramSpec.type) {
      case 'palette':
        return renderPaletteEditor(paramKey, paramSpec);

      case 'float':
      case 'int':
        return renderSlider(paramKey, paramSpec);

      case 'select':
        return renderSelectSlider(paramKey, paramSpec);

      case 'boolean':
        return (
          <div key={paramKey} className="fader-group" style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <span className="mono-label" style={{ color: 'var(--text-secondary)', fontSize: '0.6rem' }}>
              {paramSpec.label.toUpperCase()}
            </span>
            <button
              className={`heavy-btn ${currentValue ? 'active' : ''}`}
              style={{ width: '60px', padding: '4px 8px', fontSize: '0.6rem' }}
              onClick={() => onParamChange(effect.id, paramKey, !currentValue)}
            >
              {currentValue ? '[ ON ]' : '[ OFF ]'}
            </button>
          </div>
        );

      case 'color-pair':
        return (
          <div key={paramKey} className="fader-group">
            <span className="fader-label-row">{paramSpec.label.toUpperCase()}</span>
            <div className="palette-picker-container">
              <div className="color-input-wrapper">
                <input type="color" value={currentValue[0]}
                  onChange={(e) => onParamChange(effect.id, paramKey, [e.target.value, currentValue[1]])} />
                <span className="color-label-hex">{currentValue[0]}</span>
              </div>
              <div className="color-input-wrapper">
                <input type="color" value={currentValue[1]}
                  onChange={(e) => onParamChange(effect.id, paramKey, [currentValue[0], e.target.value])} />
                <span className="color-label-hex">{currentValue[1]}</span>
              </div>
            </div>
          </div>
        );

      case 'color':
        return (
          <div key={paramKey} className="fader-group">
            <span className="fader-label-row">{paramSpec.label.toUpperCase()}</span>
            <div className="color-input-wrapper" style={{ width: '100%' }}>
              <input type="color" value={currentValue}
                onChange={(e) => onParamChange(effect.id, paramKey, e.target.value)} />
              <span className="color-label-hex">{currentValue}</span>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      {Object.keys(effect.params).map((paramKey) => renderControl(paramKey, effect.params[paramKey]))}
    </div>
  );
};

export default Controls;
