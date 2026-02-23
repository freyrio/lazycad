/**
 * SelectTool — Select, move, and inspect elements.
 */
export class SelectTool {
  /**
   * @param {EventBus} eventBus
   * @param {object} context - { blueprint, viewport, cursorLayer, history, platform }
   */
  constructor(eventBus, context) {
    this.eventBus = eventBus;
    this.ctx = context;

    this._selectedId = null;
    this._selectedType = null;
    this._isDragging = false;
    this._dragStart = null;
    this._dragOffset = null;
    this._hitMargin = 0.05; // world units extra margin for hit testing

    this._boundTap = (e) => this._onTap(e);
    this._boundDragStart = (e) => this._onDragStart(e);
    this._boundDrag = (e) => this._onDrag(e);
    this._boundDragEnd = (e) => this._onDragEnd(e);
    this._boundMove = (e) => this._onMove(e);
    this._boundDelete = () => this._deleteSelected();
  }

  activate() {
    this.eventBus.on('gesture:tap', this._boundTap);
    this.eventBus.on('gesture:dragstart', this._boundDragStart);
    this.eventBus.on('gesture:drag', this._boundDrag);
    this.eventBus.on('gesture:dragend', this._boundDragEnd);
    this.eventBus.on('input:move', this._boundMove);
    this.eventBus.on('action:delete', this._boundDelete);

    this.ctx.cursorLayer.showCrosshair = false;
  }

  deactivate() {
    this.deselect();
    this.eventBus.off('gesture:tap', this._boundTap);
    this.eventBus.off('gesture:dragstart', this._boundDragStart);
    this.eventBus.off('gesture:drag', this._boundDrag);
    this.eventBus.off('gesture:dragend', this._boundDragEnd);
    this.eventBus.off('input:move', this._boundMove);
    this.eventBus.off('action:delete', this._boundDelete);
  }

  _onMove(e) {
    this.ctx.cursorLayer.setCursor(e.position.x, e.position.y, e.worldPosition.x, e.worldPosition.y);
    this.ctx.viewport.markDirty('interaction');
  }

  _onTap(e) {
    const floor = this.ctx.blueprint.activeFloor;
    if (!floor) return;

    const hitMargin = this._hitMargin + (10 / this.ctx.viewport.scale);
    const hit = this._hitTest(floor, e.worldPosition.x, e.worldPosition.y, hitMargin);

    if (hit) {
      this.select(hit.id, hit.type);
    } else {
      this.deselect();
    }
  }

  _onDragStart(e) {
    if (e.button === 1 || e.modifiers.ctrl || e.modifiers.alt) {
      // Middle click or modifier: pan instead
      this._isDragging = false;
      this._isPanning = true;
      this._panStart = { x: e.position.x, y: e.position.y };
      this._panStartOffset = { x: this.ctx.viewport.offsetX, y: this.ctx.viewport.offsetY };
      return;
    }

    // Check if dragging a selected element
    if (this._selectedId) {
      this._isDragging = true;
      this._dragStart = { x: e.worldPosition.x, y: e.worldPosition.y };
    }
  }

  _onDrag(e) {
    if (this._isPanning) {
      const dx = e.position.x - this._panStart.x;
      const dy = e.position.y - this._panStart.y;
      this.ctx.viewport.setTransform(
        this.ctx.viewport.scale,
        this._panStartOffset.x + dx,
        this._panStartOffset.y + dy
      );
      return;
    }

    // Element dragging would go here (Phase 2+)
  }

  _onDragEnd(e) {
    this._isDragging = false;
    this._isPanning = false;
  }

  /**
   * Hit-test all elements on the active floor.
   */
  _hitTest(floor, wx, wy, margin) {
    // Test walls
    for (const wall of floor.walls) {
      if (wall.hitTest(wx, wy, margin)) {
        return { id: wall.id, type: 'wall', element: wall };
      }
    }
    return null;
  }

  /**
   * Select an element.
   */
  select(id, type) {
    this._selectedId = id;
    this._selectedType = type;
    this.eventBus.emit('selection:changed', { id, type });

    // Update wall layer selection
    if (this.ctx.wallLayer) {
      this.ctx.wallLayer.setSelected(type === 'wall' ? id : null);
      this.ctx.viewport.markDirty('vectors');
    }
  }

  /**
   * Clear selection.
   */
  deselect() {
    if (this._selectedId) {
      this._selectedId = null;
      this._selectedType = null;
      this.eventBus.emit('selection:changed', { id: null, type: null });

      if (this.ctx.wallLayer) {
        this.ctx.wallLayer.setSelected(null);
        this.ctx.viewport.markDirty('vectors');
      }
    }
  }

  /**
   * Delete the currently selected element.
   */
  _deleteSelected() {
    if (!this._selectedId) return;

    const floor = this.ctx.blueprint.activeFloor;
    if (!floor) return;

    if (this._selectedType === 'wall') {
      floor.removeWall(this._selectedId);
    }

    this.deselect();
    this.ctx.viewport.markDirty('vectors');
    this.eventBus.emit('element:deleted');
  }

  get selectedId() { return this._selectedId; }
  get selectedType() { return this._selectedType; }
}
