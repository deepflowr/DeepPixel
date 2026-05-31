import React, { useCallback, useRef } from 'react';
import Controls from './Controls';

/**
 * EffectSelector — accordion-style channel strip mixer.
 * Supports:
 *   - HTML5 Drag-and-drop reordering
 *   - Expand All / Collapse All toggle
 *   - Inline parameter controls per channel
 *   - ON/OFF bypass per channel
 */
import { PRESET_PALETTES } from '../effects/palettes';

const EffectSelector = ({
  effectsChain,
  effectOrder,
  expandedEffects,
  onToggleEffect,
  onToggleExpand,
  onMoveEffect,
  onParamChange,
  onExtractPalette,
  getEffectById,
  onCollapseAll,
  onExpandAll,
  globalPalette,
  useGlobalPalette,
  onGlobalPaletteChange
}) => {
  const dragItem = useRef(null);
  const dragOverItem = useRef(null);

  // ── Drag and Drop Handlers ──
  const handleDragStart = useCallback((e, index) => {
    dragItem.current = index;
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', index.toString());
    // Add a slight delay for visual feedback
    e.currentTarget.classList.add('channel-dragging');
  }, []);

  const handleDragOver = useCallback((e, index) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    dragOverItem.current = index;
    // Visual feedback on the drop target
    const channels = e.currentTarget.closest('.channel-strip-list');
    if (channels) {
      channels.querySelectorAll('.channel-strip').forEach((el, i) => {
        el.classList.toggle('channel-drop-target', i === index);
      });
    }
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.currentTarget.classList.remove('channel-drop-target');
  }, []);

  const handleDrop = useCallback((e, dropIndex) => {
    e.preventDefault();
    const dragIndex = dragItem.current;
    if (dragIndex === null || dragIndex === undefined) return;
    if (dragIndex === dropIndex) return;

    const effectId = effectOrder[dragIndex];
    const direction = dragIndex < dropIndex ? 'down' : 'up';

    // Move step by step to the target position
    let steps = Math.abs(dropIndex - dragIndex);
    for (let i = 0; i < steps; i++) {
      onMoveEffect(effectId, direction);
    }

    // Cleanup visual states
    dragItem.current = null;
    dragOverItem.current = null;
    document.querySelectorAll('.channel-dragging, .channel-drop-target').forEach(el => {
      el.classList.remove('channel-dragging', 'channel-drop-target');
    });
  }, [effectOrder, onMoveEffect]);

  const handleDragEnd = useCallback(() => {
    dragItem.current = null;
    dragOverItem.current = null;
    document.querySelectorAll('.channel-dragging, .channel-drop-target').forEach(el => {
      el.classList.remove('channel-dragging', 'channel-drop-target');
    });
  }, []);

  // Check if all effects are expanded
  const allExpanded = effectOrder.every(id => expandedEffects[id]);
  const allCollapsed = effectOrder.every(id => !expandedEffects[id]);

  // ── Global Palette Section ──
  const renderGlobalPaletteEditor = () => {
    if (!useGlobalPalette || !globalPalette) return null;
    const colors = globalPalette;

    const handleColorChange = (index, newHex) => {
      const next = [...colors];
      next[index] = newHex;
      onGlobalPaletteChange(next);
    };

    const handleAddColor = () => {
      if (colors.length >= 8) return;
      onGlobalPaletteChange([...colors, '#808080']);
    };

    const handleRemoveColor = () => {
      if (colors.length <= 2) return;
      onGlobalPaletteChange(colors.slice(0, -1));
    };

    const handlePresetSelect = (presetColors) => {
      onGlobalPaletteChange([...presetColors]);
    };

    const currentSerialized = JSON.stringify(colors);
    const activePresetId = PRESET_PALETTES.find(p =>
      p.colors.length === colors.length &&
      p.colors.every((c, i) => c.toLowerCase() === colors[i]?.toLowerCase())
    )?.id || null;

    return (
      <div className="global-palette-panel">
        <div className="global-palette-header">
          <span className="global-palette-label">PALETA GLOBAL</span>
          <span className="global-palette-count">{colors.length} colores</span>
        </div>

        {/* Presets strip */}
        <div className="palette-preset-strip">
          {PRESET_PALETTES.slice(0, 8).map(preset => (
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

        {/* Color swatches */}
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
                <span className="palette-color-swatch" style={{ backgroundColor: hexColor }} />
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

        {/* Actions */}
        <div className="palette-actions">
          <button className="channel-toolbar-btn" onClick={handleAddColor} disabled={colors.length >= 8}>
            [ + COLOR ]
          </button>
          <button className="channel-toolbar-btn" onClick={handleRemoveColor} disabled={colors.length <= 2}>
            [ − COLOR ]
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="channel-strip-list">
      {/* Global palette section at top */}
      {renderGlobalPaletteEditor()}

      {/* Collapse/Expand All toolbar */}
      <div className="channel-strip-toolbar">
        <button
          className="channel-toolbar-btn"
          onClick={onExpandAll}
          disabled={allExpanded}
          title="Expandir todos los canales"
        >
          [ + TODOS ]
        </button>
        <button
          className="channel-toolbar-btn"
          onClick={onCollapseAll}
          disabled={allCollapsed}
          title="Colapsar todos los canales"
        >
          [ − TODOS ]
        </button>
        <span className="channel-toolbar-count">
          {effectOrder.filter(id => effectsChain[id]?.enabled).length}/{effectOrder.length} ACTIVOS
        </span>
      </div>

      {effectOrder.map((effectId, index) => {
        const effect = getEffectById(effectId);
        if (!effect) return null;

        const isEnabled = effectsChain[effectId]?.enabled || false;
        const isExpanded = expandedEffects[effectId] || false;
        const activeParams = effectsChain[effectId]?.activeParams || {};

        return (
          <div
            key={effectId}
            className={`channel-strip ${isEnabled ? 'channel-enabled' : 'channel-bypassed'} ${isExpanded ? 'channel-expanded' : ''}`}
            draggable={false}
            onDragOver={(e) => handleDragOver(e, index)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, index)}
          >
            {/* Channel Header Bar — draggable handle */}
            <div
              className="channel-header"
              draggable={true}
              onDragStart={(e) => handleDragStart(e, index)}
              onDragEnd={handleDragEnd}
            >
              {/* Drag handle */}
              <span className="channel-drag-handle" title="Arrastrar para reordenar">⠿</span>

              {/* Order number */}
              <span className="channel-order">#{index + 1}</span>

              {/* Bypass indicator LED */}
              <span className={`status-led channel-led ${isEnabled ? 'green' : 'red'}`} />

              {/* Name */}
              <span className={`channel-name ${isEnabled ? '' : 'channel-name-bypassed'}`}>
                {effect.label.toUpperCase()}
              </span>

              {/* Spacer */}
              <span style={{ flex: 1 }} />

              {/* Expand/Collapse */}
              <button
                className="channel-toggle-expand"
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleExpand(effectId);
                }}
                title={isExpanded ? 'Colapsar' : 'Expandir'}
              >
                {isExpanded ? '[ − ]' : '[ + ]'}
              </button>

              {/* ON/OFF */}
              <button
                className={`channel-toggle ${isEnabled ? 'channel-toggle-on' : 'channel-toggle-off'}`}
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleEffect(effectId);
                }}
                title={isEnabled ? 'Bypass' : 'Activar'}
              >
                {isEnabled ? '[ ON ]' : '[ OFF ]'}
              </button>
            </div>

            {/* Channel Controls (expandable) */}
            {isExpanded && (
              <div className="channel-controls">
                <Controls
                  effect={effect}
                  activeParams={activeParams}
                  onParamChange={onParamChange}
                  onExtractPalette={typeof onExtractPalette === 'function'
                    ? (paramKey) => onExtractPalette(effectId, paramKey)
                    : undefined
                  }
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default EffectSelector;
