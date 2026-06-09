import React, { useState, useCallback, useRef, useEffect } from 'react';
import { usePerformance } from '../core/PerformanceContext';
import { DIVISION_OPTIONS } from '../performance-effects';

const PERFORMANCE_FX = [
  { id: 'strobe',    label: 'STROBE' },
  { id: 'beat-zoom', label: 'BEAT ZOOM' },
  { id: 'shake',     label: 'SHAKE' },
  { id: 'wobble',    label: 'WOBBLE' },
];

const PerformanceEffects = () => {
  const { clock, store, effects, bpm, currentBeat, phase, isPlaying, displayBpm } = usePerformance();
  const [bpmInput, setBpmInput] = useState(String(bpm));
  const bpmInputRef = useRef(null);

  // Sync BPM input (only when not focused)
  useEffect(() => {
    if (bpmInputRef.current !== document.activeElement) {
      setBpmInput(String(bpm));
    }
  }, [bpm]);

  const handleBpmChange = useCallback((e) => {
    setBpmInput(e.target.value.replace(/\D/g, ''));
  }, []);

  const handleBpmBlur = useCallback(() => {
    const num = parseInt(bpmInput, 10);
    if (!isNaN(num) && num >= 20 && num <= 300) clock.setBpm(num);
    setBpmInput(String(clock.bpm));
  }, [bpmInput, clock]);

  const handleBpmKeyDown = useCallback((e) => {
    if (e.key === 'Enter') bpmInputRef.current?.blur();
  }, []);

  const handleTap = useCallback(() => clock.tap(), [clock]);
  const handleTogglePlay = useCallback(() => clock.toggle(), [clock]);

  const beatPulse = isPlaying ? Math.max(0.3, 1 - phase) : 0.3;
  const phasePct = Math.round(phase * 100);

  return (
    <div className="ctrl-perf">
      {/* Header */}
      <div className="ctrl-perf-header">
        <div className="ctrl-perf-header-left">
          <span className="ctrl-perf-label">PERFORMANCE</span>
          <span className="ctrl-perf-badge">FX</span>
          <span className="ctrl-perf-led" data-color={isPlaying ? 'green' : 'off'} />
        </div>
        <div className="ctrl-perf-header-right">
          <span className="ctrl-perf-hint">capa post-procesamiento &bull; {displayBpm} BPM</span>
        </div>
      </div>

      <div className="ctrl-perf-slots">
        {/* ── BPM CLOCK SLOT (Ableton-style) ── */}
        <div className="ctrl-perf-slot ctrl-perf-slot-bpm" data-slot="bpm">
          <div className="ctrl-perf-slot-header">
            <span className="ctrl-perf-slot-led" data-color={isPlaying ? 'green' : 'off'} style={{ opacity: beatPulse }} />
            <span className="ctrl-perf-slot-label">TEMPO</span>
          </div>
          <div className="ctrl-perf-slot-body ctrl-bpm-body">
            {/* Large BPM display */}
            <div className="ctrl-bpm-display-row">
              <input ref={bpmInputRef} className="ctrl-bpm-input" type="text" inputMode="numeric"
                value={bpmInput} onChange={handleBpmChange} onBlur={handleBpmBlur}
                onKeyDown={handleBpmKeyDown} maxLength={3} />
              <span className="ctrl-bpm-unit">BPM</span>
            </div>
            {/* Controls row: TAP + START/STOP */}
            <div className="ctrl-bpm-ctrl-row">
              <button className="ctrl-bpm-btn ctrl-bpm-btn-tap" onClick={handleTap}>TAP</button>
              <button className={`ctrl-bpm-btn ${isPlaying ? 'ctrl-bpm-btn-stop' : 'ctrl-bpm-btn-start'}`}
                onClick={handleTogglePlay}>
                {isPlaying ? '■ STOP' : '▶ START'}
              </button>
            </div>
            {/* Beat indicator or start hint */}
            {isPlaying ? (
              <div className="ctrl-bpm-beat-indicator">
                <div className="ctrl-bpm-phase-bar">
                  <div className="ctrl-bpm-phase-fill" style={{ width: `${phasePct}%` }} />
                </div>
                <div className="ctrl-bpm-beat-num">{currentBeat}/4</div>
                <span className="ctrl-perf-slot-led" data-color="green" style={{ opacity: beatPulse }} />
              </div>
            ) : (
              <div className="ctrl-bpm-start-hint">
                ▶ PRESS START para activar FX
              </div>
            )}
          </div>
        </div>

        {/* ── PERFORMANCE FX SLOTS ── */}
        {PERFORMANCE_FX.map((fx) => {
          const eff = effects.find(e => e.id === fx.id);
          if (!eff) return null;

          return (
            <PerformanceSlot
              key={fx.id}
              effect={eff}
              store={store}
              isPlaying={isPlaying}
            />
          );
        })}
      </div>
    </div>
  );
};

/** ── Individual Performance FX Slot ── */
const PerformanceSlot = ({ effect, store, isPlaying }) => {
  const { enabled, isHeld, amount, division } = effect;
  const [amtInput, setAmtInput] = useState(String(Math.round(amount * 100)));

  // Sync amount display
  useEffect(() => {
    setAmtInput(String(Math.round(effect.amount * 100)));
  }, [effect.amount]);

  const toggleEnabled = useCallback(() => {
    store.toggle(effect.id);
    // Force re-render by updating state in the parent — context will propagate
  }, [store, effect]);

  const handleHoldDown = useCallback(() => {
    store.setHold(effect.id, true);
  }, [store, effect]);

  const handleHoldUp = useCallback(() => {
    store.setHold(effect.id, false);
  }, [store, effect]);

  const handleAmtChange = useCallback((e) => {
    const v = Math.max(0, Math.min(100, parseInt(e.target.value.replace(/\D/g, ''), 10) || 0));
    setAmtInput(String(v));
    store.setAmount(effect.id, v / 100);
  }, [store, effect]);

  const handleDivision = useCallback((divValue) => {
    store.setDivision(effect.id, divValue);
  }, [store, effect]);

  const active = enabled || isHeld;

  return (
    <div className={`ctrl-perf-slot ${active ? 'ctrl-perf-slot-on' : ''}`} data-slot={effect.id}>
      {/* Header: toggle + HOLD + label */}
      <div className="ctrl-perf-fx-header">
        <button
          className={`ctrl-perf-fx-toggle ${enabled ? 'toggle-on' : 'toggle-off'}`}
          onClick={toggleEnabled}
          title={enabled ? 'Desactivar' : 'Activar'}
        >
          <span className="ctrl-toggle-knob" />
        </button>

        <span className="ctrl-perf-slot-led" data-color={active ? 'orange' : 'off'}
          style={{ opacity: active ? 1 : 0.4 }} />

        <span className="ctrl-perf-fx-label">{effect.label}</span>

        <button
          className={`ctrl-perf-fx-hold ${isHeld ? 'held' : ''}`}
          onMouseDown={handleHoldDown}
          onMouseUp={handleHoldUp}
          onMouseLeave={handleHoldUp}
          onTouchStart={handleHoldDown}
          onTouchEnd={handleHoldUp}
          title="Mantener presionado"
        >
          HOLD
        </button>
      </div>

      {/* Body: amount slider + division selector */}
      <div className="ctrl-perf-fx-body">
        {/* Amount slider */}
        <div className="ctrl-perf-fx-amt-row">
          <span className="ctrl-perf-fx-amt-label">AMT</span>
          <div className="ctrl-perf-fx-amt-slider-wrap">
            <input
              type="range" className="ctrl-perf-fx-slider" min={0} max={100} step={1}
              value={amtInput}
              onChange={(e) => {
                const v = parseInt(e.target.value, 10);
                setAmtInput(String(v));
                store.setAmount(effect.id, v / 100);
              }}
            />
          </div>
          <span className="ctrl-perf-fx-amt-val">{amtInput}</span>
        </div>

        {/* Division selector */}
        <div className="ctrl-perf-fx-div-row">
          <span className="ctrl-perf-fx-div-label">DIV</span>
          <div className="ctrl-perf-fx-div-options">
            {DIVISION_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                className={`ctrl-perf-fx-div-btn ${division === opt.value ? 'active' : ''}`}
                onClick={() => handleDivision(opt.value)}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PerformanceEffects;
