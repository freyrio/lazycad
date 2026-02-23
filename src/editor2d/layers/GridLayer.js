/**
 * GridLayer — Background grid that adapts to zoom level.
 */
export class GridLayer {
  constructor(eventBus) {
    this.eventBus = eventBus;
    this.visible = true;
    this.gridColor = 'rgba(255, 255, 255, 0.06)';
    this.majorGridColor = 'rgba(255, 255, 255, 0.12)';
    this.originColor = 'rgba(233, 69, 96, 0.3)';
  }

  /**
   * Calculate an appropriate grid spacing based on zoom level.
   * Returns spacing in world units.
   */
  _getGridSpacing(scale) {
    // Target ~50-100px between grid lines on screen
    const targetScreenSpacing = 60;
    const worldSpacing = targetScreenSpacing / scale;

    // Snap to nice round numbers
    const niceSteps = [0.01, 0.02, 0.05, 0.1, 0.2, 0.5, 1, 2, 5, 10, 20, 50, 100, 200, 500, 1000];
    for (const step of niceSteps) {
      if (step >= worldSpacing) return step;
    }
    return niceSteps[niceSteps.length - 1];
  }

  /**
   * Render the grid.
   * @param {CanvasRenderingContext2D} ctx
   * @param {Viewport2D} viewport
   */
  render(ctx, viewport) {
    if (!this.visible) return;

    const bounds = viewport.getVisibleBounds();
    const scale = viewport.scale;
    const gridSpacing = this._getGridSpacing(scale);
    const majorEvery = 5; // every 5th line is a major line

    // Compute the range of grid lines to draw
    const startX = Math.floor(bounds.minX / gridSpacing) * gridSpacing;
    const endX = Math.ceil(bounds.maxX / gridSpacing) * gridSpacing;
    const startY = Math.floor(bounds.minY / gridSpacing) * gridSpacing;
    const endY = Math.ceil(bounds.maxY / gridSpacing) * gridSpacing;

    ctx.save();

    // Draw minor grid lines
    ctx.strokeStyle = this.gridColor;
    ctx.lineWidth = 1;
    ctx.beginPath();

    for (let x = startX; x <= endX; x += gridSpacing) {
      const idx = Math.round(x / gridSpacing);
      if (idx % majorEvery === 0) continue; // skip major lines
      const sx = viewport.worldToScreen(x, 0).x;
      ctx.moveTo(Math.round(sx) + 0.5, 0);
      ctx.lineTo(Math.round(sx) + 0.5, viewport.height);
    }

    for (let y = startY; y <= endY; y += gridSpacing) {
      const idy = Math.round(y / gridSpacing);
      if (idy % majorEvery === 0) continue;
      const sy = viewport.worldToScreen(0, y).y;
      ctx.moveTo(0, Math.round(sy) + 0.5);
      ctx.lineTo(viewport.width, Math.round(sy) + 0.5);
    }
    ctx.stroke();

    // Draw major grid lines
    ctx.strokeStyle = this.majorGridColor;
    ctx.lineWidth = 1;
    ctx.beginPath();

    for (let x = startX; x <= endX; x += gridSpacing) {
      const idx = Math.round(x / gridSpacing);
      if (idx % majorEvery !== 0) continue;
      const sx = viewport.worldToScreen(x, 0).x;
      ctx.moveTo(Math.round(sx) + 0.5, 0);
      ctx.lineTo(Math.round(sx) + 0.5, viewport.height);
    }

    for (let y = startY; y <= endY; y += gridSpacing) {
      const idy = Math.round(y / gridSpacing);
      if (idy % majorEvery !== 0) continue;
      const sy = viewport.worldToScreen(0, y).y;
      ctx.moveTo(0, Math.round(sy) + 0.5);
      ctx.lineTo(viewport.width, Math.round(sy) + 0.5);
    }
    ctx.stroke();

    // Draw origin axes
    const ox = viewport.worldToScreen(0, 0);
    ctx.strokeStyle = this.originColor;
    ctx.lineWidth = 1.5;

    // X axis (horizontal)
    ctx.beginPath();
    ctx.moveTo(0, Math.round(ox.y) + 0.5);
    ctx.lineTo(viewport.width, Math.round(ox.y) + 0.5);
    ctx.stroke();

    // Y axis (vertical)
    ctx.beginPath();
    ctx.moveTo(Math.round(ox.x) + 0.5, 0);
    ctx.lineTo(Math.round(ox.x) + 0.5, viewport.height);
    ctx.stroke();

    // Draw grid spacing label
    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.font = '11px -apple-system, sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'bottom';

    let label;
    if (gridSpacing >= 1) {
      label = `${gridSpacing}m`;
    } else if (gridSpacing >= 0.01) {
      label = `${(gridSpacing * 100).toFixed(0)}cm`;
    } else {
      label = `${(gridSpacing * 1000).toFixed(0)}mm`;
    }
    ctx.fillText(`Grid: ${label}`, 8, viewport.height - 8);

    ctx.restore();
  }

  /** Get the current grid spacing for snapping */
  getGridSpacing(scale) {
    return this._getGridSpacing(scale);
  }
}
