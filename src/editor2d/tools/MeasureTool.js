/**
 * MeasureTool — Measure distances between two points.
 */
import { Units } from '../../utils/Units.js';

export class MeasureTool {
  constructor(eventBus, context) {
    this.eventBus = eventBus;
    this.ctx = context;

    this._startPoint = null;
    this._endPoint = null;

    this._boundTap = (e) => this._onTap(e);
    this._boundMove = (e) => this._onMove(e);
    this._boundCancel = () => this._cancel();
  }

  activate() {
    this.eventBus.on('gesture:tap', this._boundTap);
    this.eventBus.on('input:move', this._boundMove);
    this.eventBus.on('action:cancel', this._boundCancel);

    this.ctx.cursorLayer.showCrosshair = true;

    const viewport = document.getElementById('viewport-2d');
    if (viewport) viewport.classList.add('crosshair');
  }

  deactivate() {
    this._cancel();
    this.eventBus.off('gesture:tap', this._boundTap);
    this.eventBus.off('input:move', this._boundMove);
    this.eventBus.off('action:cancel', this._boundCancel);

    const viewport = document.getElementById('viewport-2d');
    if (viewport) viewport.classList.remove('crosshair');

    this.ctx.cursorLayer.showCrosshair = false;
  }

  _onMove(e) {
    const floor = this.ctx.blueprint.activeFloor;
    const snapResult = this.ctx.snapEngine.snap(
      e.worldPosition.x,
      e.worldPosition.y,
      {
        viewport: this.ctx.viewport,
        floor,
        lastPoint: this._startPoint,
      }
    );

    const pos = snapResult || { x: e.worldPosition.x, y: e.worldPosition.y };

    this.ctx.cursorLayer.setCursor(e.position.x, e.position.y, pos.x, pos.y);
    this.ctx.cursorLayer.snapPoint = snapResult ? { x: pos.x, y: pos.y, type: snapResult.type } : null;

    if (this._startPoint) {
      this.ctx.cursorLayer.previewLine = {
        from: this._startPoint,
        to: pos,
      };
    }

    this.ctx.viewport.markDirty('interaction');
  }

  _onTap(e) {
    const floor = this.ctx.blueprint.activeFloor;
    const snapResult = this.ctx.snapEngine.snap(
      e.worldPosition.x,
      e.worldPosition.y,
      {
        viewport: this.ctx.viewport,
        floor,
        lastPoint: this._startPoint,
      }
    );

    const pos = snapResult || { x: e.worldPosition.x, y: e.worldPosition.y };

    if (!this._startPoint) {
      this._startPoint = { x: pos.x, y: pos.y };
      this.ctx.platform.haptic(10);
    } else {
      this._endPoint = { x: pos.x, y: pos.y };
      const dx = this._endPoint.x - this._startPoint.x;
      const dy = this._endPoint.y - this._startPoint.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      this.eventBus.emit('measure:result', {
        distance: dist,
        formatted: Units.format(dist),
        from: this._startPoint,
        to: this._endPoint,
      });

      // Reset for next measurement
      this._startPoint = null;
      this._endPoint = null;
      this.ctx.cursorLayer.previewLine = null;
      this.ctx.cursorLayer.previewPoints = [];
      this.ctx.platform.haptic(15);
    }

    this.ctx.viewport.markDirty('interaction');
  }

  _cancel() {
    this._startPoint = null;
    this._endPoint = null;
    this.ctx.cursorLayer.previewLine = null;
    this.ctx.cursorLayer.previewPoints = [];
    this.ctx.cursorLayer.snapPoint = null;
    this.ctx.viewport.markDirty('interaction');
  }
}
