import React from 'react';
import { AVAILABLE_EFFECTS } from '../effects';

const EffectSelector = ({ activeEffectId, effectsChain, onSelectEffect, onToggleEffect }) => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {AVAILABLE_EFFECTS.map((eff) => {
        const isSelected = eff.id === activeEffectId;
        const isEnabled = effectsChain[eff.id]?.enabled || false;
        
        return (
          <div 
            key={eff.id} 
            style={{ 
              display: 'flex', 
              gap: '6px',
              width: '100%'
            }}
          >
            {/* Selection button (to focus controls) */}
            <button
              className={`heavy-btn ${isSelected ? 'active' : ''}`}
              style={{
                flex: 1,
                justifyContent: 'space-between',
                textAlign: 'left',
                padding: '10px 12px'
              }}
              onClick={() => onSelectEffect(eff.id)}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className={`status-led ${isSelected ? 'orange' : ''}`} style={{ width: '6px', height: '6px' }} />
                <span>{eff.label.toUpperCase()}</span>
              </div>
              <span style={{ 
                fontFamily: 'var(--font-mono)', 
                fontSize: '0.55rem',
                color: 'var(--text-muted)',
                textTransform: 'uppercase'
              }}>
                {eff.category}
              </span>
            </button>
            
            {/* Enable/Bypass toggle switch */}
            <button
              className={`heavy-btn ${isEnabled ? 'active' : ''}`}
              style={{
                width: '80px',
                padding: '10px 4px',
                fontSize: '0.65rem',
                color: isEnabled ? 'var(--accent-green)' : 'var(--text-secondary)',
                borderColor: isEnabled ? 'var(--accent-green)' : 'var(--border-color)'
              }}
              onClick={() => onToggleEffect(eff.id)}
            >
              {isEnabled ? '[ ON ]' : '[ OFF ]'}
            </button>
          </div>
        );
      })}
    </div>
  );
};

export default EffectSelector;
