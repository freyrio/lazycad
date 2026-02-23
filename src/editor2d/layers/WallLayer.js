/**
 * WallLayer — Renders walls with thickness on the vectors canvas.
 */
export class WallLayer {
  constructor(eventBus) {
    this.eventBus = eventBus;
    this.visible = true;
    this.wallColor = '#4fc3f7';
    this.wallFill = 'rgba(79, 195, 247, 0.15)';
    this.selectedColor = '#e94560';
    this.selectedFill = 'rgba(233, 69, 96, 0.2)';
    this.endpointRadius = 4; // screen pixels

    this._floor = null;
    this._selectedId = null;
  }

  /**
   * Set the floor to render.
   * @param {Floor} floor
   */
  setFloor(floor) {
    this._floor = floor;
  }

  /**
   * Set the selected wall ID for highlighting.
   */
  setSelected(wallId) {
    this._selectedId = wallId;
  }

  /**
   * Render all walls.
   * @param {CanvasRenderingContext2D} ctx
   * @param {Viewport2D} viewport
   */
  render(ctx, viewport) {
    if (!this.visible || !this._floor) return;

    const walls = this._floor.walls;
    const scale = viewport.scale;

    for (const wall of walls) {
      const isSelected = wall.id === this._selectedId;
      this._renderWall(ctx, viewport, wall, isSelected);
    }
  }

  /**
   * Render a single wall.
   */
  _renderWall(ctx, viewport, wall, isSelected) {
    const points = wall.points;
    if (points.length < 2) return;

    const scale = viewport.scale;
    const thicknessScreen = wall.thickness * scale;

    // Determine colors
    const strokeColor = isSelected ? this.selectedColor : this.wallColor;
    const fillColor = isSelected ? this.selectedFill : this.wallFill;

    ctx.save();

    // If wall is thick enough to show as filled polygon
    if (thicknessScreen > 3) {
      // Draw wall outline polygon
      const outline = wall.getOutlinePolygon();
      if (outline.length >= 3) {
        ctx.beginPath();
        const first = viewport.worldToScreen(outline[0].x, outline[0].y);
        ctx.moveTo(first.x, first.y);
        for (let i = 1; i < outline.length; i++) {
          const p = viewport.worldToScreen(outline[i].x, outline[i].y);
          ctx.lineTo(p.x, p.y);
        }
        ctx.closePath();

        ctx.fillStyle = fillColor;
        ctx.fill();
        ctx.strokeStyle = strokeColor;
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }
    } else {
      // Draw as a simple line when zoomed out
      ctx.beginPath();
      const first = viewport.worldToScreen(points[0].x, points[0].y);
      ctx.moveTo(first.x, first.y);
      for (let i = 1; i < points.length; i++) {
        const p = viewport.worldToScreen(points[i].x, points[i].y);
        ctx.lineTo(p.x, p.y);
      }
      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = Math.max(2, thicknessScreen);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.stroke();
    }

    // Draw endpoints
    if (isSelected || scale > 5) {
      ctx.fillStyle = strokeColor;
      for (const p of points) {
        const sp = viewport.worldToScreen(p.x, p.y);
        ctx.beginPath();
        ctx.arc(sp.x, sp.y, this.endpointRadius, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Draw centerline (dashed) when selected
    if (isSelected) {
      ctx.beginPath();
      ctx.setLineDash([4, 4]);
      const first = viewport.worldToScreen(points[0].x, points[0].y);
      ctx.moveTo(first.x, first.y);
      for (let i = 1; i < points.length; i++) {
        const p = viewport.worldToScreen(points[i].x, points[i].y);
        ctx.lineTo(p.x, p.y);
      }
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.setLineDash([]);
    }

    ctx.restore();
  }
}
