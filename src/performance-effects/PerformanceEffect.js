/**
 * PerformanceEffect — base class for all performance effect modules.
 *
 * Each effect receives the clock state every frame and decides
 * internally when to trigger based on beat division and hold state.
 *
 * Subclasses override:
 *   - update(clockState)  — called every frame; check timing, set internal flags
 *   - apply(ctx, w, h)    — called when effect should paint on the 2D canvas
 */

const DIVISIONS = [0.25, 0.5, 1, 2, 4, 8];

export default class PerformanceEffect {
  constructor(id, label) {
    this.id = id;
    this.label = label;
    this.enabled = false;
    this.isHeld = false;
    this.amount = 0.5;
    this.division = 1;          // beats between triggers
    this._lastTriggerBeat = -1; // internal: last beat we fired on
    this._shouldTrigger = false; // set by update(), read by apply()
    this._holdTimer = 0;        // ms remaining for hold sustain
  }

  /** Called every frame from PerformanceStore.processFrame() */
  update(clockState) {
    this._shouldTrigger = false;
    if (!clockState.isPlaying && !this.isHeld) return;

    // Hold mode: keep triggering while held (decay over time)
    if (this.isHeld) {
      this._shouldTrigger = true;
      return;
    }

    // Beat-synced mode: check if we should fire on this beat
    const triggerOnBeat = Math.ceil(clockState.currentBeat / this.division);
    if (triggerOnBeat !== this._lastTriggerBeat) {
      this._shouldTrigger = true;
      this._lastTriggerBeat = triggerOnBeat;
    }
  }

  /** Override in subclasses — apply visual effect to canvas 2D context */
  apply(ctx, w, h) {
    // no-op by default
  }

  /** Called after apply() to run any post-frame cleanup */
  postFrame() {
    this._shouldTrigger = false;
  }

  reset() {
    this._lastTriggerBeat = -1;
    this._shouldTrigger = false;
    this.isHeld = false;
  }

  toJSON() {
    return {
      id: this.id,
      label: this.label,
      enabled: this.enabled,
      amount: this.amount,
      division: this.division,
    };
  }

  fromJSON(json) {
    if (json.enabled !== undefined) this.enabled = json.enabled;
    if (json.amount !== undefined) this.amount = json.amount;
    if (json.division !== undefined) this.division = json.division;
  }

  /** Beat division labels for the UI selector */
  static get DIVISIONS() { return DIVISIONS; }
}
