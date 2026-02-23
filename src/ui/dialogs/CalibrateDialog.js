/**
 * CalibrateDialog — Modal for entering calibration values.
 * Supports two modes:
 *   1. Two-point: User picks two points, enters real distance
 *   2. Scale-factor: User selects scale ratio (1:50, 1:100, etc.) and paper size/DPI
 */
export class CalibrateDialog {
  /**
   * @param {HTMLElement} modalOverlay - #modal-overlay
   * @param {EventBus} eventBus
   * @param {object} context - { blueprint, platform }
   */
  constructor(modalOverlay, eventBus, context) {
    this.overlay = modalOverlay;
    this.eventBus = eventBus;
    this.ctx = context;
    this._calibrateTool = null;

    this.eventBus.on('calibrate:measure', (data) => this._showTwoPointInput(data));
    this.eventBus.on('action:calibrate-scale', () => this._showScaleFactorInput());
  }

  /**
   * Set reference to the CalibrateTool instance (for applyCalibration callback).
   */
  setCalibrateTool(tool) {
    this._calibrateTool = tool;
  }

  /**
   * Show the two-point distance input dialog.
   */
  _showTwoPointInput(data) {
    const currentDist = data.worldDistance;

    this.overlay.classList.remove('hidden');
    this.overlay.innerHTML = `
      <div class="modal calibrate-modal">
        <h2>Enter Real Distance</h2>
        <p class="calibrate-hint">
          The two points you selected span <strong>${currentDist.toFixed(2)}</strong>
          units at current scale.
        </p>
        <div class="calibrate-input-row">
          <input type="number" id="cal-distance" step="0.01" min="0.01"
                 placeholder="Distance" autofocus class="cal-input">
          <select id="cal-unit" class="cal-select">
            <option value="m">m</option>
            <option value="cm">cm</option>
            <option value="mm">mm</option>
          </select>
        </div>
        <div class="calibrate-presets">
          <span class="calibrate-presets-label">Common:</span>
          <button class="btn btn-ghost cal-preset" data-val="1" data-unit="m">1 m</button>
          <button class="btn btn-ghost cal-preset" data-val="2" data-unit="m">2 m</button>
          <button class="btn btn-ghost cal-preset" data-val="5" data-unit="m">5 m</button>
          <button class="btn btn-ghost cal-preset" data-val="10" data-unit="m">10 m</button>
        </div>
        <label class="calibrate-rotation-check">
          <input type="checkbox" id="cal-rotation"> Also correct rotation (draw horizontal reference)
        </label>
        <div class="modal-actions">
          <button class="btn btn-secondary" id="cal-cancel">Cancel</button>
          <button class="btn btn-primary" id="cal-apply">Apply</button>
        </div>
      </div>
    `;

    this._bindTwoPointEvents(data);
  }

  _bindTwoPointEvents(data) {
    const distInput = this.overlay.querySelector('#cal-distance');
    const unitSelect = this.overlay.querySelector('#cal-unit');
    const applyBtn = this.overlay.querySelector('#cal-apply');
    const cancelBtn = this.overlay.querySelector('#cal-cancel');
    const rotationCheck = this.overlay.querySelector('#cal-rotation');

    // Preset buttons
    this.overlay.querySelectorAll('.cal-preset').forEach(btn => {
      btn.addEventListener('click', () => {
        distInput.value = btn.dataset.val;
        unitSelect.value = btn.dataset.unit;
        distInput.focus();
      });
    });

    // Apply
    applyBtn.addEventListener('click', () => {
      let distance = parseFloat(distInput.value);
      if (isNaN(distance) || distance <= 0) {
        distInput.classList.add('input-error');
        return;
      }

      // Convert to meters
      const unit = unitSelect.value;
      if (unit === 'cm') distance /= 100;
      else if (unit === 'mm') distance /= 1000;

      this._close();

      if (this._calibrateTool) {
        this._calibrateTool.applyCalibration(distance);
      }

      // If rotation correction requested, start it
      if (rotationCheck.checked) {
        this.eventBus.emit('toast', 'Draw a line along a known horizontal direction');
        this.eventBus.emit('calibrate:start-rotation');
      }
    });

    // Cancel
    cancelBtn.addEventListener('click', () => {
      this._close();
      this.eventBus.emit('tool:select');
    });

    // Enter to apply
    distInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') applyBtn.click();
      if (e.key === 'Escape') cancelBtn.click();
    });

    // Focus input after a small delay (modal animation)
    setTimeout(() => distInput.focus(), 100);
  }

  /**
   * Show scale-factor calibration dialog.
   */
  _showScaleFactorInput() {
    this.overlay.classList.remove('hidden');
    this.overlay.innerHTML = `
      <div class="modal calibrate-modal">
        <h2>Scale Factor Calibration</h2>
        <p class="calibrate-hint">
          Set the scale from the blueprint's printed scale and scan resolution.
        </p>
        <div class="property-group">
          <div class="property-row">
            <label>Scale</label>
            <select id="cal-scale-ratio" class="cal-select">
              <option value="20">1:20</option>
              <option value="50">1:50</option>
              <option value="100" selected>1:100</option>
              <option value="200">1:200</option>
              <option value="500">1:500</option>
            </select>
          </div>
          <div class="property-row">
            <label>Paper Size</label>
            <select id="cal-paper" class="cal-select">
              <option value="a1">A1 (594x841 mm)</option>
              <option value="a2">A2 (420x594 mm)</option>
              <option value="a3" selected>A3 (297x420 mm)</option>
              <option value="a4">A4 (210x297 mm)</option>
              <option value="custom">Custom DPI</option>
            </select>
          </div>
          <div class="property-row" id="cal-dpi-row">
            <label>Scan DPI</label>
            <input type="number" id="cal-dpi" value="300" min="72" max="1200" class="cal-input">
          </div>
        </div>
        <div class="calibrate-result" id="cal-result">
          <span class="calibrate-result-label">Resulting scale:</span>
          <span class="calibrate-result-value" id="cal-result-val">—</span>
        </div>
        <div class="modal-actions">
          <button class="btn btn-secondary" id="cal-sf-cancel">Cancel</button>
          <button class="btn btn-primary" id="cal-sf-apply">Apply</button>
        </div>
      </div>
    `;

    this._bindScaleFactorEvents();
  }

  _bindScaleFactorEvents() {
    const ratioSelect = this.overlay.querySelector('#cal-scale-ratio');
    const paperSelect = this.overlay.querySelector('#cal-paper');
    const dpiInput = this.overlay.querySelector('#cal-dpi');
    const dpiRow = this.overlay.querySelector('#cal-dpi-row');
    const resultVal = this.overlay.querySelector('#cal-result-val');
    const applyBtn = this.overlay.querySelector('#cal-sf-apply');
    const cancelBtn = this.overlay.querySelector('#cal-sf-cancel');

    // Auto-estimate DPI from bitmap size and paper
    const paperDimensions = {
      a1: { w: 594, h: 841 },
      a2: { w: 420, h: 594 },
      a3: { w: 297, h: 420 },
      a4: { w: 210, h: 297 },
    };

    const updateResult = () => {
      const ratio = parseInt(ratioSelect.value);
      const dpi = parseInt(dpiInput.value) || 300;
      const ppm = (dpi / 25.4) * (ratio / 1000) * 1000;
      // Simpler: at 1:N, 1m real = N/1000 m on paper = N mm on paper
      // pixels per meter = (dpi / 25.4) * N
      const pixelsPerMeter = (dpi / 25.4) * ratio;
      resultVal.textContent = `${pixelsPerMeter.toFixed(1)} px/m`;
      return pixelsPerMeter;
    };

    const estimateDPI = () => {
      const paper = paperSelect.value;
      if (paper === 'custom') return;

      const floor = this.ctx.blueprint.activeFloor;
      if (floor?.bitmap) {
        const dims = paperDimensions[paper];
        // Estimate DPI from the longer dimension
        const imgLong = Math.max(floor.bitmap.width, floor.bitmap.height);
        const paperLong = Math.max(dims.w, dims.h); // mm
        const estimatedDPI = Math.round(imgLong / (paperLong / 25.4));
        dpiInput.value = estimatedDPI;
      }
      updateResult();
    };

    ratioSelect.addEventListener('change', updateResult);
    dpiInput.addEventListener('input', updateResult);
    paperSelect.addEventListener('change', () => {
      dpiRow.style.display = paperSelect.value === 'custom' ? 'flex' : 'flex';
      estimateDPI();
    });

    applyBtn.addEventListener('click', () => {
      const ratio = parseInt(ratioSelect.value);
      const dpi = parseInt(dpiInput.value) || 300;
      this.ctx.blueprint.calibrateFromScale(ratio, dpi);
      const ppm = this.ctx.blueprint.scale.pixelsPerMeter;
      this._close();
      this.eventBus.emit('toast', `Scale set: 1:${ratio} @ ${dpi} DPI (${ppm.toFixed(1)} px/m)`);
      this.eventBus.emit('calibrate:done', { pixelsPerMeter: ppm });
      this.eventBus.emit('viewport:redraw');
    });

    cancelBtn.addEventListener('click', () => this._close());

    // Init
    estimateDPI();
    updateResult();
  }

  _close() {
    this.overlay.classList.add('hidden');
    this.overlay.innerHTML = '';
  }
}
