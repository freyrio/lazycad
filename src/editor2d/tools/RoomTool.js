/**
 * RoomTool — Define room boundaries by tapping corners.
 * Click to add polygon points, double-click to close and create room.
 */
export class RoomTool {
  constructor(eventBus, context) {
    this.eventBus = eventBus;
    this.ctx = context;

    this._points = [];
    this._currentPos = null;
    this._isDrawing = false;

    this._boundTap = (e) => this._onTap(e);
    this._boundMove = (e) => this._onMove(e);
    this._boundDoubleTap = () => this._finishRoom();
    this._boundCancel = () => this._cancel();
  }

  activate() {
    this.eventBus.on('gesture:tap', this._boundTap);
    this.eventBus.on('input:move', this._boundMove);
    this.eventBus.on('gesture:doubletap', this._boundDoubleTap);
    this.eventBus.on('action:cancel', this._boundCancel);

    const viewport = document.getElementById('viewport-2d');
    if (viewport) viewport.classList.add('crosshair');
    this.ctx.cursorLayer.showCrosshair = true;
    this.eventBus.emit('toast', 'Room: click corners, double-click to close');
  }

  deactivate() {
    this._finishRoom();
    this.eventBus.off('gesture:tap', this._boundTap);
    this.eventBus.off('input:move', this._boundMove);
    this.eventBus.off('gesture:doubletap', this._boundDoubleTap);
    this.eventBus.off('action:cancel', this._boundCancel);

    const viewport = document.getElementById('viewport-2d');
    if (viewport) viewport.classList.remove('crosshair');
    this.ctx.cursorLayer.showCrosshair = false;
    this.ctx.cursorLayer.previewPoints = [];
    this.ctx.cursorLayer.previewLine = null;
  }

  _onMove(e) {
    const floor = this.ctx.blueprint.activeFloor;
    if (!floor) return;

    // Snap to endpoints
    const snapResult = this.ctx.snapEngine.snap(
      e.worldPosition.x, e.worldPosition.y,
      { viewport: this.ctx.viewport, floor, lastPoint: null }
    );

    if (snapResult) {
      this._currentPos = { x: snapResult.x, y: snapResult.y };
      this.ctx.cursorLayer.snapPoint = { x: snapResult.x, y: snapResult.y, type: snapResult.type };
    } else {
      this._currentPos = { x: e.worldPosition.x, y: e.worldPosition.y };
      this.ctx.cursorLayer.snapPoint = null;
    }

    this.ctx.cursorLayer.setCursor(e.position.x, e.position.y, this._currentPos.x, this._currentPos.y);

    if (this._points.length > 0) {
      this.ctx.cursorLayer.previewLine = {
        from: this._points[this._points.length - 1],
        to: this._currentPos,
      };
    }

    this.ctx.viewport.markDirty('interaction');
  }

  _onTap() {
    if (!this._currentPos) return;

    this._points.push({ x: this._currentPos.x, y: this._currentPos.y });
    this._isDrawing = true;
    this.ctx.cursorLayer.previewPoints = [...this._points];
    this.ctx.platform.haptic(10);
    this.ctx.viewport.markDirty('interaction');
  }

  _finishRoom() {
    if (this._points.length >= 3) {
      const floor = this.ctx.blueprint.activeFloor;
      if (floor) {
        const room = floor.addRoom('Room', [...this._points]);
        this.ctx.viewport.markDirty('vectors');
        this.eventBus.emit('room:created', { room });
        this.eventBus.emit('toast', `Room created (${room.area.toFixed(1)} m²)`);
      }
    }

    this._points = [];
    this._isDrawing = false;
    this.ctx.cursorLayer.previewPoints = [];
    this.ctx.cursorLayer.previewLine = null;
    this.ctx.viewport.markDirty('interaction');
  }

  _cancel() {
    if (this._points.length > 0) {
      this._points.pop();
      this.ctx.cursorLayer.previewPoints = [...this._points];
      if (this._points.length === 0) {
        this._isDrawing = false;
        this.ctx.cursorLayer.previewLine = null;
      }
    }
    this.ctx.viewport.markDirty('interaction');
  }
}
