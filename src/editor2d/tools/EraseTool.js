/**
 * EraseTool — Delete elements by tapping on them.
 */
export class EraseTool {
  /**
   * @param {EventBus} eventBus
   * @param {object} context - { blueprint, viewport, cursorLayer, history, platform }
   */
  constructor(eventBus, context) {
    this.eventBus = eventBus;
    this.ctx = context;

    this._boundTap = (e) => this._onTap(e);
    this._boundMove = (e) => this._onMove(e);
  }

  activate() {
    this.eventBus.on('gesture:tap', this._boundTap);
    this.eventBus.on('input:move', this._boundMove);

    this.ctx.cursorLayer.showCrosshair = true;

    const viewport = document.getElementById('viewport-2d');
    if (viewport) viewport.style.cursor = 'crosshair';
  }

  deactivate() {
    this.eventBus.off('gesture:tap', this._boundTap);
    this.eventBus.off('input:move', this._boundMove);

    this.ctx.cursorLayer.showCrosshair = false;

    const viewport = document.getElementById('viewport-2d');
    if (viewport) viewport.style.cursor = '';
  }

  _onMove(e) {
    this.ctx.cursorLayer.setCursor(e.position.x, e.position.y, e.worldPosition.x, e.worldPosition.y);
    this.ctx.viewport.markDirty('interaction');
  }

  _onTap(e) {
    const floor = this.ctx.blueprint.activeFloor;
    if (!floor) return;

    const hitMargin = 0.05 + (10 / this.ctx.viewport.scale);

    // Test walls
    for (const wall of floor.walls) {
      if (wall.hitTest(e.worldPosition.x, e.worldPosition.y, hitMargin)) {
        floor.removeWall(wall.id);
        this.ctx.viewport.markDirty('vectors');
        this.ctx.platform.haptic(15);
        this.eventBus.emit('element:deleted', { id: wall.id, type: 'wall' });
        return;
      }
    }
  }
}
