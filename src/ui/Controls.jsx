import React from 'react';

const Controls = ({ activeEffect, activeParams, onParamChange, isEnabled, onEnableEffect }) => {
  if (!activeEffect || !activeEffect.params) {
    return (
      <div style={{
        fontFamily: 'var(--font-mono)',
        fontSize: '0.8rem',
        color: 'var(--text-muted)',
        textAlign: 'center',
        padding: '20px 0'
      }}>
        [ Sin parámetros ajustables ]
      </div>
    );
  }

  // UX Safeguard: If the focused channel is bypassed, show a clear activation banner
  if (!isEnabled) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px 20px',
        border: '2px dashed var(--border-color)',
        borderRadius: '2px',
        backgroundColor: 'var(--bg-input)',
        fontFamily: 'var(--font-mono)',
        textAlign: 'center',
        gap: '20px',
        minHeight: '200px'
      }}>
        <div style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', letterSpacing: '0.05em' }}>
          [ CANAL "{activeEffect.label.toUpperCase()}" EN BYPASS ]
        </div>
        <button 
          className="heavy-btn active"
          style={{ width: '100%', padding: '12px', color: 'var(--accent-orange)' }}
          onClick={onEnableEffect}
        >
          [ ENCEDER CANAL ]
        </button>
      </div>
    );
  }

  const renderControl = (paramKey, paramSpec) => {
    const currentValue = activeParams[paramKey] !== undefined ? activeParams[paramKey] : paramSpec.default;

    switch (paramSpec.type) {
      case 'float':
      case 'int':
        return (
          <div key={paramKey} className="fader-group" style={{ marginBottom: '24px' }}>
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
                  onParamChange(paramKey, val);
                }}
              />
            </div>
            {/* VJ Console Level scale tick marks */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontFamily: 'var(--font-mono)',
              fontSize: '0.55rem',
              color: 'var(--text-muted)',
              marginTop: '4px',
              padding: '0 6px',
              pointerEvents: 'none',
              letterSpacing: '0.05em'
            }}>
              <span>0%</span>
              <span>|</span>
              <span>|</span>
              <span>50%</span>
              <span>|</span>
              <span>|</span>
              <span>100%</span>
            </div>
          </div>
        );

      case 'select':
        return (
          <div key={paramKey} style={{ marginBottom: '20px' }}>
            <label className="fader-label-row" style={{ display: 'block', marginBottom: '8px' }}>
              {paramSpec.label}
            </label>
            <select
              className="analog-select"
              value={currentValue}
              onChange={(e) => {
                const val = isNaN(e.target.value) ? e.target.value : Number(e.target.value);
                onParamChange(paramKey, val);
              }}
            >
              {paramSpec.options.map((opt) => (
                <option key={opt} value={opt}>
                  {opt} {paramSpec.label === 'Tamaño Matriz' ? '×' + opt : ''}
                </option>
              ))}
            </select>
          </div>
        );

      case 'boolean':
        return (
          <div key={paramKey} style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span className="mono-label" style={{ color: 'var(--text-secondary)' }}>{paramSpec.label}</span>
            <button
              className={`heavy-btn ${currentValue ? 'active' : ''}`}
              style={{ width: '80px', padding: '6px 12px', fontSize: '0.75rem' }}
              onClick={() => onParamChange(paramKey, !currentValue)}
            >
              {currentValue ? '[ ON ]' : '[ OFF ]'}
            </button>
          </div>
        );

      case 'color-pair':
        return (
          <div key={paramKey} style={{ marginBottom: '20px' }}>
            <label className="fader-label-row" style={{ display: 'block', marginBottom: '8px' }}>
              {paramSpec.label}
            </label>
            <div className="palette-picker-container">
              <div className="color-input-wrapper">
                <input
                  type="color"
                  value={currentValue[0]}
                  onChange={(e) => {
                    const newPalette = [e.target.value, currentValue[1]];
                    onParamChange(paramKey, newPalette);
                  }}
                />
                <span className="color-label-hex">{currentValue[0]}</span>
              </div>
              <div className="color-input-wrapper">
                <input
                  type="color"
                  value={currentValue[1]}
                  onChange={(e) => {
                    const newPalette = [currentValue[0], e.target.value];
                    onParamChange(paramKey, newPalette);
                  }}
                />
                <span className="color-label-hex">{currentValue[1]}</span>
              </div>
            </div>
          </div>
        );

      case 'color':
        return (
          <div key={paramKey} style={{ marginBottom: '20px' }}>
            <label className="fader-label-row" style={{ display: 'block', marginBottom: '8px' }}>
              {paramSpec.label}
            </label>
            <div className="color-input-wrapper" style={{ width: '100%' }}>
              <input
                type="color"
                value={currentValue}
                onChange={(e) => onParamChange(paramKey, e.target.value)}
              />
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
      {Object.keys(activeEffect.params).map((paramKey) =>
        renderControl(paramKey, activeEffect.params[paramKey])
      )}
    </div>
  );
};

export default Controls;
