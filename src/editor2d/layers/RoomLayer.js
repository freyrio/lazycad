/**
 * RoomLayer — Renders room fills and labels on the vectors canvas.
 */
export class RoomLayer {
  constructor(eventBus) {
    this.eventBus = eventBus;
    this.visible = true;
    this.fillColor = 'rgba(255, 255, 255, 0.04)';
    this.strokeColor = 'rgba(255, 255, 255, 0.15)';
    this.selectedFill = 'rgba(233, 69, 96, 0.08)';
    this.selectedStroke = 'rgba(233, 69, 96, 0.4)';
    this.labelColor = 'rgba(255, 255, 255, 0.5)';
    this.labelSelectedColor = '#e94560';
    this._floor = null;
    this._selectedId = null;
  }

  setFloor(floor) { this._floor = floor; }
  setSelected(id) { this._selectedId = id; }

  render(ctx, viewport) {
    if (!this.visible || !this._floor) return;

    for (const room of this._floor.rooms) {
      const isSelected = room.id === this._selectedId;
      this._renderRoom(ctx, viewport, room, isSelected);
    }
  }

  _renderRoom(ctx, viewport, room, isSelected) {
    const polygon = room.polygon;
    if (polygon.length < 3) return;

    ctx.save();

    // Draw filled polygon
    ctx.beginPath();
    const first = viewport.worldToScreen(polygon[0].x, polygon[0].y);
    ctx.moveTo(first.x, first.y);
    for (let i = 1; i < polygon.length; i++) {
      const p = viewport.worldToScreen(polygon[i].x, polygon[i].y);
      ctx.lineTo(p.x, p.y);
    }
    ctx.closePath();

    ctx.fillStyle = isSelected ? this.selectedFill : this.fillColor;
    ctx.fill();
    ctx.strokeStyle = isSelected ? this.selectedStroke : this.strokeColor;
    ctx.lineWidth = isSelected ? 1.5 : 1;
    ctx.setLineDash([4, 4]);
    ctx.stroke();
    ctx.setLineDash([]);

    // Draw label at centroid
    const centroid = this._computeCentroid(polygon);
    const sc = viewport.worldToScreen(centroid.x, centroid.y);

    const label = room.label || 'Room';
    const area = room.area;
    const areaText = `${area.toFixed(1)} m²`;

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Room label
    ctx.font = `bold ${isSelected ? 14 : 13}px -apple-system, sans-serif`;
    ctx.fillStyle = isSelected ? this.labelSelectedColor : this.labelColor;
    ctx.fillText(label, sc.x, sc.y - 8);

    // Area
    ctx.font = `${isSelected ? 12 : 11}px -apple-system, sans-serif`;
    ctx.fillStyle = isSelected ? this.labelSelectedColor : 'rgba(255,255,255,0.35)';
    ctx.fillText(areaText, sc.x, sc.y + 8);

    ctx.restore();
  }

  _computeCentroid(polygon) {
    let cx = 0, cy = 0;
    let area = 0;
    const n = polygon.length;
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n;
      const f = polygon[i].x * polygon[j].y - polygon[j].x * polygon[i].y;
      cx += (polygon[i].x + polygon[j].x) * f;
      cy += (polygon[i].y + polygon[j].y) * f;
      area += f;
    }
    area /= 2;
    if (Math.abs(area) < 1e-10) {
      // Degenerate, use average
      cx = 0; cy = 0;
      for (const p of polygon) { cx += p.x; cy += p.y; }
      return { x: cx / n, y: cy / n };
    }
    const a6 = area * 6;
    return { x: cx / a6, y: cy / a6 };
  }
}
