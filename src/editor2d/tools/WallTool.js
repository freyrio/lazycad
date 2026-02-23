/**
 * WallTool — Draw wall centerlines as click-click polylines.
 */
import { AddWallCommand } from '../../core/history/Command.js';

export class WallTool {
  /**
   * @param {EventBus} eventBus
   * @param {object} context - { blueprint, viewport, snapEngine, cursorLayer, history, platform }
   */
  constructor(eventBus, context) {
    this.eventBus = eventBus;
    this.ctx = context;

    // Drawing state
    this._points = [];          // accumulated wall points
    this._currentPos = null;    // current snapped cursor position
    this._isDrawing = false;

    // Wall properties (used for new walls)
    this.thickness = 0.20;      // default exterior wall
    this.material = 'concrete';
    this.isExterior = true;

    this._boundTap = (e) => this._onTap(e);
    this._boundMove = (e) => this._onMove(e);
    this._boundDoubleTap = (e) => this._onDoubleTap(e);
    this._boundCancel = () => this._cancel();
  }

  activate() {
    this.eventBus.on('gesture:tap', this._boundTap);
    this.eventBus.on('input:move', this._boundMove);
    this.eventBus.on('gesture:doubletap', this._boundDoubleTap);
    this.eventBus.on('action:cancel', this._boundCancel);

    // Set crosshair cursor
    const viewport = document.getElementById('viewport-2d');
    if (viewport) viewport.classList.add('crosshair');

    this.ctx.cursorLayer.showCrosshair = true;
  }

  deactivate() {
    this._finishWall();
    this.eventBus.off('gesture:tap', this._boundTap);
    this.eventBus.off('input:move', this._boundMove);
    this.eventBus.off('gesture:doubletap', this._boundDoubleTap);
    this.eventBus.off('action:cancel', this._boundCancel);

    const viewport = document.getElementById('viewport-2d');
    if (viewport) viewport.classList.remove('crosshair');

    this.ctx.cursorLayer.showCrosshair = false;
    this.ctx.cursorLayer.previewPoints = [];
    this.ctx.cursorLayer.previewLine = null;
    this.ctx.cursorLayer.snapPoint = null;
  }

  _onMove(e) {
    const floor = this.ctx.blueprint.activeFloor;
    if (!floor) return;

    // Apply snapping
    const lastPoint = this._points.length > 0 ? this._points[this._points.length - 1] : null;
    const snapResult = this.ctx.snapEngine.snap(
      e.worldPosition.x,
      e.worldPosition.y,
      {
        viewport: this.ctx.viewport,
        floor,
        lastPoint,
      }
    );

    if (snapResult) {
      this._currentPos = { x: snapResult.x, y: snapResult.y };
      this.ctx.cursorLayer.snapPoint = { x: snapResult.x, y: snapResult.y, type: snapResult.type };

      // Set snap guides
      if (snapResult.guides && this.ctx.snapLayer) {
        this.ctx.snapLayer.setGuides(snapResult.guides);
      }
    } else {
      this._currentPos = { x: e.worldPosition.x, y: e.worldPosition.y };
      this.ctx.cursorLayer.snapPoint = null;
      if (this.ctx.snapLayer) {
        this.ctx.snapLayer.clearGuides();
      }
    }

    // Update cursor
    this.ctx.cursorLayer.setCursor(e.position.x, e.position.y, this._currentPos.x, this._currentPos.y);

    // Update preview line
    if (this._points.length > 0) {
      this.ctx.cursorLayer.previewLine = {
        from: this._points[this._points.length - 1],
        to: this._currentPos,
      };
    }

    // Request redraw of interaction layer
    this.ctx.viewport.markDirty('interaction');
  }

  _onTap(e) {
    if (!this._currentPos) return;

    // Add point
    this._points.push({ x: this._currentPos.x, y: this._currentPos.y });
    this._isDrawing = true;

    // Update preview
    this.ctx.cursorLayer.previewPoints = [...this._points];

    // Haptic feedback
    this.ctx.platform.haptic(10);

    this.ctx.viewport.markDirty('interaction');
    this.eventBus.emit('walltool:point', { point: this._currentPos, count: this._points.length });
  }

  _onDoubleTap(e) {
    this._finishWall();
  }

  _finishWall() {
    if (this._points.length >= 2) {
      const floor = this.ctx.blueprint.activeFloor;
      if (floor) {
        const cmd = new AddWallCommand(floor, [...this._points], {
          thickness: this.thickness,
          material: this.material,
          isExterior: this.isExterior,
        });
        this.ctx.history.execute(cmd);
        this.ctx.viewport.markDirty('vectors');
        this.eventBus.emit('walltool:finish', { wall: cmd.wall });
      }
    }

    // Reset
    this._points = [];
    this._isDrawing = false;
    this.ctx.cursorLayer.previewPoints = [];
    this.ctx.cursorLayer.previewLine = null;
    this.ctx.cursorLayer.snapPoint = null;
    if (this.ctx.snapLayer) {
      this.ctx.snapLayer.clearGuides();
    }
    this.ctx.viewport.markDirty('interaction');
  }

  _cancel() {
    if (this._points.length > 0) {
      // Remove the last point if in progress
      this._points.pop();
      this.ctx.cursorLayer.previewPoints = [...this._points];
      if (this._points.length === 0) {
        this._isDrawing = false;
        this.ctx.cursorLayer.previewLine = null;
      }
    }
    this.ctx.viewport.markDirty('interaction');
  }

  get isDrawing() { return this._isDrawing; }
}
