/**
 * OpeningLayer — Renders door/window/opening symbols on the vectors canvas.
 * Doors are shown as arcs (swing), windows as parallel lines, openings as gaps.
 */
export class OpeningLayer {
  constructor(eventBus) {
    this.eventBus = eventBus;
    this.visible = true;
    this.doorColor = '#81c784';
    this.windowColor = '#64b5f6';
    this.openingColor = '#ffb74d';
    this.selectedColor = '#e94560';
    this._floor = null;
    this._selectedId = null;
  }

  setFloor(floor) { this._floor = floor; }
  setSelected(id) { this._selectedId = id; }

  render(ctx, viewport) {
    if (!this.visible || !this._floor) return;

    for (const opening of this._floor.openings) {
      const wall = this._floor.getWall(opening.wallId);
      if (!wall) continue;
      const isSelected = opening.id === this._selectedId;
      this._renderOpening(ctx, viewport, opening, wall, isSelected);
    }
  }

  _renderOpening(ctx, viewport, opening, wall, isSelected) {
    // Get the position and direction along the wall centerline
    const posData = wall.pointAtDistance(opening.position);
    if (!posData) return;

    const center = posData.point;
    const dir = posData.direction;
    const normal = dir.perp();
    const halfWidth = opening.width / 2;
    const thickness = wall.thickness;

    // Start and end points of the opening on the centerline
    const startPt = center.sub(dir.mul(halfWidth));
    const endPt = center.add(dir.mul(halfWidth));

    ctx.save();

    const color = isSelected ? this.selectedColor :
      opening.type === 'door' ? this.doorColor :
      opening.type === 'window' ? this.windowColor :
      this.openingColor;

    if (opening.type === 'door') {
      this._renderDoor(ctx, viewport, startPt, endPt, center, dir, normal, thickness, opening, color, isSelected);
    } else if (opening.type === 'window') {
      this._renderWindow(ctx, viewport, startPt, endPt, normal, thickness, color, isSelected);
    } else {
      this._renderOpeningGap(ctx, viewport, startPt, endPt, normal, thickness, color, isSelected);
    }

    ctx.restore();
  }

  /**
   * Draw door symbol: gap in wall + swing arc.
   */
  _renderDoor(ctx, viewport, startPt, endPt, center, dir, normal, thickness, opening, color, isSelected) {
    const halfThick = thickness / 2;
    const scale = viewport.scale;

    // Draw gap (clear area on wall)
    this._drawGap(ctx, viewport, startPt, endPt, normal, halfThick, color);

    // Draw swing arc
    const swingWidth = opening.width;
    const arcCenter = opening.swing === 'right' ? endPt : startPt;
    const arcStart = opening.swing === 'right' ? startPt : endPt;
    const sc = viewport.worldToScreen(arcCenter.x, arcCenter.y);
    const sa = viewport.worldToScreen(arcStart.x, arcStart.y);
    const radius = swingWidth * scale;

    // Determine arc angles
    const toStart = arcStart.sub(arcCenter);
    const startAngle = Math.atan2(toStart.y, toStart.x);
    // Swing goes perpendicular to wall
    const swingEnd = arcCenter.add(normal.mul(swingWidth));
    const toEnd = swingEnd.sub(arcCenter);
    const endAngle = Math.atan2(toEnd.y, toEnd.x);

    ctx.beginPath();
    // Determine sweep direction
    const cross = dir.cross(normal);
    const ccw = cross < 0;
    ctx.arc(sc.x, sc.y, radius, startAngle, endAngle, ccw);
    ctx.strokeStyle = color;
    ctx.lineWidth = isSelected ? 2 : 1.5;
    ctx.setLineDash([]);
    ctx.stroke();

    // Draw the door leaf line from arc center to swing end
    const se = viewport.worldToScreen(swingEnd.x, swingEnd.y);
    ctx.beginPath();
    ctx.moveTo(sc.x, sc.y);
    ctx.lineTo(se.x, se.y);
    ctx.strokeStyle = color;
    ctx.lineWidth = isSelected ? 2.5 : 2;
    ctx.stroke();

    if (opening.swing === 'double') {
      // Draw second arc from other side
      const arcCenter2 = startPt;
      const swingEnd2 = arcCenter2.add(normal.mul(swingWidth));
      const sc2 = viewport.worldToScreen(arcCenter2.x, arcCenter2.y);
      const se2 = viewport.worldToScreen(swingEnd2.x, swingEnd2.y);
      const toEnd2 = endPt.sub(arcCenter2);
      const startAngle2 = Math.atan2(toEnd2.y, toEnd2.x);
      const toSwing2 = swingEnd2.sub(arcCenter2);
      const endAngle2 = Math.atan2(toSwing2.y, toSwing2.x);
      ctx.beginPath();
      ctx.arc(sc2.x, sc2.y, radius, startAngle2, endAngle2, !ccw);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(sc2.x, sc2.y);
      ctx.lineTo(se2.x, se2.y);
      ctx.lineWidth = isSelected ? 2.5 : 2;
      ctx.stroke();
    }
  }

  /**
   * Draw window symbol: parallel lines across the wall opening.
   */
  _renderWindow(ctx, viewport, startPt, endPt, normal, thickness, color, isSelected) {
    const halfThick = thickness / 2;
    const glassOffset = thickness * 0.15;

    // Draw gap
    this._drawGap(ctx, viewport, startPt, endPt, normal, halfThick, color);

    // Outer lines of window (sill/head lines parallel to wall)
    const s1a = viewport.worldToScreen(startPt.x + normal.x * halfThick, startPt.y + normal.y * halfThick);
    const s1b = viewport.worldToScreen(endPt.x + normal.x * halfThick, endPt.y + normal.y * halfThick);
    const s2a = viewport.worldToScreen(startPt.x - normal.x * halfThick, startPt.y - normal.y * halfThick);
    const s2b = viewport.worldToScreen(endPt.x - normal.x * halfThick, endPt.y - normal.y * halfThick);

    ctx.strokeStyle = color;
    ctx.lineWidth = isSelected ? 2 : 1.5;
    ctx.setLineDash([]);

    // Top frame line
    ctx.beginPath();
    ctx.moveTo(s1a.x, s1a.y);
    ctx.lineTo(s1b.x, s1b.y);
    ctx.stroke();

    // Bottom frame line
    ctx.beginPath();
    ctx.moveTo(s2a.x, s2a.y);
    ctx.lineTo(s2b.x, s2b.y);
    ctx.stroke();

    // Glass line (center line through window)
    const ga = viewport.worldToScreen(startPt.x, startPt.y);
    const gb = viewport.worldToScreen(endPt.x, endPt.y);
    ctx.lineWidth = isSelected ? 2.5 : 2;
    ctx.beginPath();
    ctx.moveTo(ga.x, ga.y);
    ctx.lineTo(gb.x, gb.y);
    ctx.stroke();
  }

  /**
   * Draw a plain opening gap.
   */
  _renderOpeningGap(ctx, viewport, startPt, endPt, normal, thickness, color, isSelected) {
    const halfThick = thickness / 2;
    this._drawGap(ctx, viewport, startPt, endPt, normal, halfThick, color);

    // Tick marks at the edges
    const ticks = [startPt, endPt];
    ctx.strokeStyle = color;
    ctx.lineWidth = isSelected ? 2 : 1.5;
    for (const pt of ticks) {
      const a = viewport.worldToScreen(pt.x + normal.x * halfThick, pt.y + normal.y * halfThick);
      const b = viewport.worldToScreen(pt.x - normal.x * halfThick, pt.y - normal.y * halfThick);
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
    }
  }

  /**
   * Draw the gap/clear area where an opening cuts through a wall.
   */
  _drawGap(ctx, viewport, startPt, endPt, normal, halfThick, color) {
    const margin = halfThick * 1.1;
    const a = startPt.sub(normal.mul(margin));
    const b = startPt.add(normal.mul(margin));
    const c = endPt.add(normal.mul(margin));
    const d = endPt.sub(normal.mul(margin));

    const sa = viewport.worldToScreen(a.x, a.y);
    const sb = viewport.worldToScreen(b.x, b.y);
    const sc = viewport.worldToScreen(c.x, c.y);
    const sd = viewport.worldToScreen(d.x, d.y);

    // Clear the wall in the opening area with background
    ctx.fillStyle = 'rgba(26, 26, 46, 0.9)';
    ctx.beginPath();
    ctx.moveTo(sa.x, sa.y);
    ctx.lineTo(sb.x, sb.y);
    ctx.lineTo(sc.x, sc.y);
    ctx.lineTo(sd.x, sd.y);
    ctx.closePath();
    ctx.fill();
  }
}
