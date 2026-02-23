/**
 * CalibrateTool — Two-point calibration with magnifier loupe.
 * User taps two points on the bitmap, enters real-world distance,
 * and the scale is computed. Also supports rotation correction.
 *
 * Steps:
 *   1. "Tap the first point" — show magnifier loupe
 *   2. "Tap the second point" — show magnifier loupe
 *   3. "Enter distance" — modal input for real-world dimension
 *   4. (optional) "Correct rotation?" — draw horizontal reference line
 */
export class CalibrateTool {
  constructor(eventBus, context) {
    this.eventBus = eventBus;
    this.ctx = context;

    // Calibration state
    this._step = 0;         // 0=idle, 1=first point, 2=second point, 3=input distance
    this._point1 = null;    // world coords {x,y}
    this._point2 = null;    // world coords {x,y}
    this._currentPos = null;
    this._isActive = false;

    // Magnifier config
    this._loupeRadius = 60;       // screen pixels
    this._loupeZoom = 3;          // magnification factor
    this._loupeOffset = { x: 0, y: -80 }; // offset from finger

    this._boundTap = (e) => this._onTap(e);
    this._boundMove = (e) => this._onMove(e);
    this._boundCancel = () => this._cancel();
  }

  activate() {
    this._step = 1;
    this._point1 = null;
    this._point2 = null;
    this._isActive = true;

    this.eventBus.on('gesture:tap', this._boundTap);
    this.eventBus.on('input:move', this._boundMove);
    this.eventBus.on('action:cancel', this._boundCancel);

    const viewport = document.getElementById('viewport-2d');
    if (viewport) viewport.classList.add('crosshair');

    this.ctx.cursorLayer.showCrosshair = true;
    this.eventBus.emit('toast', 'Calibrate: Tap the first point');
    this.eventBus.emit('calibrate:step', { step: 1, total: 3 });
  }

  deactivate() {
    this._isActive = false;
    this._step = 0;
    this._point1 = null;
    this._point2 = null;

    this.eventBus.off('gesture:tap', this._boundTap);
    this.eventBus.off('input:move', this._boundMove);
    this.eventBus.off('action:cancel', this._boundCancel);

    const viewport = document.getElementById('viewport-2d');
    if (viewport) viewport.classList.remove('crosshair');

    this.ctx.cursorLayer.showCrosshair = false;
    this.ctx.cursorLayer.previewPoints = [];
    this.ctx.cursorLayer.previewLine = null;

    // Clear loupe state
    this.ctx.cursorLayer.loupe = null;
    this.ctx.cursorLayer.calibrationPoints = [];
    this.ctx.viewport.markDirty('interaction');
  }

  _onMove(e) {
    this._currentPos = { x: e.worldPosition.x, y: e.worldPosition.y };

    this.ctx.cursorLayer.setCursor(e.position.x, e.position.y, e.worldPosition.x, e.worldPosition.y);

    // Update magnifier loupe
    this.ctx.cursorLayer.loupe = {
      screenX: e.position.x,
      screenY: e.position.y,
      worldX: e.worldPosition.x,
      worldY: e.worldPosition.y,
      radius: this._loupeRadius,
      zoom: this._loupeZoom,
      offsetX: this._loupeOffset.x,
      offsetY: this._loupeOffset.y,
    };

    // Preview line from point1 to cursor
    if (this._point1 && this._step === 2) {
      this.ctx.cursorLayer.previewLine = {
        from: this._point1,
        to: this._currentPos,
      };
    }

    this.ctx.viewport.markDirty('interaction');
  }

  _onTap(e) {
    if (!this._currentPos) return;

    if (this._step === 1) {
      // Place first point
      this._point1 = { x: this._currentPos.x, y: this._currentPos.y };
      this.ctx.cursorLayer.calibrationPoints = [this._point1];
      this._step = 2;
      this.ctx.platform.haptic(15);
      this.eventBus.emit('toast', 'Calibrate: Tap the second point');
      this.eventBus.emit('calibrate:step', { step: 2, total: 3 });
    } else if (this._step === 2) {
      // Place second point
      this._point2 = { x: this._currentPos.x, y: this._currentPos.y };
      this.ctx.cursorLayer.calibrationPoints = [this._point1, this._point2];
      this.ctx.cursorLayer.loupe = null; // hide loupe
      this._step = 3;
      this.ctx.platform.haptic(15);
      this.eventBus.emit('calibrate:step', { step: 3, total: 3 });
      this._showDistanceInput();
    }

    this.ctx.viewport.markDirty('interaction');
  }

  _showDistanceInput() {
    // Calculate pixel distance between the two points (in world coords, using current scale)
    const dx = this._point2.x - this._point1.x;
    const dy = this._point2.y - this._point1.y;
    const worldDist = Math.sqrt(dx * dx + dy * dy);

    // Emit event with the measurement — the dialog will handle the input
    this.eventBus.emit('calibrate:measure', {
      point1: this._point1,
      point2: this._point2,
      worldDistance: worldDist,
      pixelDistance: worldDist * this.ctx.blueprint.scale.pixelsPerMeter,
    });
  }

  /**
   * Called by the calibration dialog after user enters real distance.
   * @param {number} realMeters - The actual distance in meters
   */
  applyCalibration(realMeters) {
    if (!this._point1 || !this._point2 || realMeters <= 0) return;

    const dx = this._point2.x - this._point1.x;
    const dy = this._point2.y - this._point1.y;
    const currentWorldDist = Math.sqrt(dx * dx + dy * dy);

    // The current world distance is based on the current pixelsPerMeter.
    // We need to adjust so that the pixel distance maps to the real meters.
    const pixelDist = currentWorldDist * this.ctx.blueprint.scale.pixelsPerMeter;
    this.ctx.blueprint.calibrate(pixelDist, realMeters);

    // Store calibration points
    this.ctx.blueprint.scale.calibrationPoints = [
      { px: this._point1.x, py: this._point1.y, meters: realMeters },
      { px: this._point2.x, py: this._point2.y, meters: realMeters },
    ];

    const ppm = this.ctx.blueprint.scale.pixelsPerMeter;
    this.eventBus.emit('toast', `Calibrated: ${ppm.toFixed(1)} px/m`);
    this.eventBus.emit('calibrate:done', { pixelsPerMeter: ppm });
    this.eventBus.emit('viewport:redraw');

    // Reset tool
    this._step = 1;
    this._point1 = null;
    this._point2 = null;
    this.ctx.cursorLayer.calibrationPoints = [];
    this.ctx.cursorLayer.previewLine = null;
    this.ctx.viewport.markDirty('interaction');
  }

  /**
   * Apply rotation correction from a drawn reference line.
   * @param {{ from: {x,y}, to: {x,y} }} line - User-drawn horizontal reference
   */
  applyRotation(line) {
    const dx = line.to.x - line.from.x;
    const dy = line.to.y - line.from.y;
    const angle = Math.atan2(dy, dx);
    this.ctx.blueprint.scale.rotation = angle;
    this.eventBus.emit('toast', `Rotation: ${(angle * 180 / Math.PI).toFixed(1)}°`);
    this.eventBus.emit('calibrate:rotation', { radians: angle });
    this.eventBus.emit('viewport:redraw');
  }

  _cancel() {
    if (this._step === 2 && this._point1) {
      // Go back to step 1
      this._step = 1;
      this._point1 = null;
      this.ctx.cursorLayer.calibrationPoints = [];
      this.ctx.cursorLayer.previewLine = null;
      this.eventBus.emit('toast', 'Calibrate: Tap the first point');
      this.eventBus.emit('calibrate:step', { step: 1, total: 3 });
    } else {
      // Cancel calibration entirely — switch back to select
      this.eventBus.emit('tool:select');
    }
    this.ctx.viewport.markDirty('interaction');
  }

  get isCalibrating() { return this._isActive && this._step > 0; }
}
