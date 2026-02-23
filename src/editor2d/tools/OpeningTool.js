/**
 * OpeningTool — Place doors, windows, or openings on walls.
 * User taps on a wall to place an opening at that position.
 */
export class OpeningTool {
  constructor(eventBus, context) {
    this.eventBus = eventBus;
    this.ctx = context;

    this._openingType = 'door'; // 'door' | 'window' | 'opening'
    this._hoveredWall = null;
    this._hoveredPos = null;    // position along wall centerline

    // Opening presets
    this.presets = {
      door: [
        { label: 'Standard', width: 0.9, height: 2.1, sillHeight: 0, swing: 'left' },
        { label: 'Double',   width: 1.8, height: 2.1, sillHeight: 0, swing: 'double' },
        { label: 'Sliding',  width: 1.5, height: 2.1, sillHeight: 0, swing: 'sliding' },
      ],
      window: [
        { label: 'Standard', width: 1.2, height: 1.2, sillHeight: 0.9, swing: null },
        { label: 'Small',    width: 0.6, height: 0.6, sillHeight: 1.2, swing: null },
        { label: 'Large',    width: 1.8, height: 1.5, sillHeight: 0.6, swing: null },
      ],
      opening: [
        { label: 'Standard', width: 0.9, height: 2.1, sillHeight: 0, swing: null },
        { label: 'Wide',     width: 1.5, height: 2.4, sillHeight: 0, swing: null },
      ],
    };
    this._activePresetIndex = 0;

    this._boundTap = (e) => this._onTap(e);
    this._boundMove = (e) => this._onMove(e);
  }

  get activePreset() {
    const list = this.presets[this._openingType];
    return list[this._activePresetIndex] || list[0];
  }

  setOpeningType(type) {
    if (['door', 'window', 'opening'].includes(type)) {
      this._openingType = type;
      this._activePresetIndex = 0;
      this.eventBus.emit('openingtool:type', { type });
    }
  }

  cyclePreset() {
    const list = this.presets[this._openingType];
    this._activePresetIndex = (this._activePresetIndex + 1) % list.length;
    const p = this.activePreset;
    this.eventBus.emit('toast', `${this._openingType}: ${p.label} (${p.width}m x ${p.height}m)`);
  }

  activate() {
    this.eventBus.on('gesture:tap', this._boundTap);
    this.eventBus.on('input:move', this._boundMove);

    const viewport = document.getElementById('viewport-2d');
    if (viewport) viewport.classList.add('crosshair');
    this.ctx.cursorLayer.showCrosshair = true;

    this.eventBus.emit('toast', `Place ${this._openingType}: tap on a wall`);
  }

  deactivate() {
    this.eventBus.off('gesture:tap', this._boundTap);
    this.eventBus.off('input:move', this._boundMove);

    const viewport = document.getElementById('viewport-2d');
    if (viewport) viewport.classList.remove('crosshair');
    this.ctx.cursorLayer.showCrosshair = false;
    this.ctx.cursorLayer.openingPreview = null;
    this._hoveredWall = null;
    this.ctx.viewport.markDirty('interaction');
  }

  _onMove(e) {
    const floor = this.ctx.blueprint.activeFloor;
    if (!floor) return;

    this.ctx.cursorLayer.setCursor(e.position.x, e.position.y, e.worldPosition.x, e.worldPosition.y);

    // Find nearest wall
    const hitMargin = 10 / this.ctx.viewport.scale;
    let bestWall = null;
    let bestDist = hitMargin;
    let bestResult = null;

    for (const wall of floor.walls) {
      const result = wall.distanceToPoint(e.worldPosition.x, e.worldPosition.y);
      if (result.distance < bestDist) {
        bestDist = result.distance;
        bestWall = wall;
        bestResult = result;
      }
    }

    if (bestWall) {
      this._hoveredWall = bestWall;
      // Compute position along wall centerline
      const pts = bestWall.getPoints();
      let distAlong = 0;
      for (let i = 0; i < bestResult.segmentIndex; i++) {
        distAlong += pts[i].distanceTo(pts[i + 1]);
      }
      distAlong += pts[bestResult.segmentIndex].distanceTo(bestResult.closestPoint);
      this._hoveredPos = distAlong;

      // Show preview
      this.ctx.cursorLayer.openingPreview = {
        wall: bestWall,
        position: distAlong,
        type: this._openingType,
        width: this.activePreset.width,
      };
    } else {
      this._hoveredWall = null;
      this._hoveredPos = null;
      this.ctx.cursorLayer.openingPreview = null;
    }

    this.ctx.viewport.markDirty('interaction');
  }

  _onTap(e) {
    if (!this._hoveredWall || this._hoveredPos === null) {
      this.eventBus.emit('toast', 'Tap on a wall to place an opening');
      return;
    }

    const floor = this.ctx.blueprint.activeFloor;
    if (!floor) return;

    const preset = this.activePreset;
    const opening = floor.addOpening(
      this._hoveredWall.id,
      this._openingType,
      this._hoveredPos,
      {
        width: preset.width,
        height: preset.height,
        sillHeight: preset.sillHeight,
        swing: preset.swing,
      }
    );

    this.ctx.platform.haptic(15);
    this.ctx.viewport.markDirty('vectors');
    this.eventBus.emit('opening:placed', { opening });
    this.eventBus.emit('toast', `${this._openingType} placed (${preset.width}m)`);
  }
}
