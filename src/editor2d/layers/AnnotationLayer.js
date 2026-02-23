/**
 * AnnotationLayer — Renders dimension annotations and notes on the vectors canvas.
 */
import { Units } from '../../utils/Units.js';

export class AnnotationLayer {
  constructor(eventBus) {
    this.eventBus = eventBus;
    this.visible = true;
    this.dimColor = 'rgba(255, 200, 100, 0.8)';
    this.noteColor = 'rgba(200, 200, 255, 0.7)';
    this.selectedColor = '#e94560';
    this._floor = null;
    this._selectedId = null;
  }

  setFloor(floor) { this._floor = floor; }
  setSelected(id) { this._selectedId = id; }

  render(ctx, viewport) {
    if (!this.visible || !this._floor) return;

    for (const ann of this._floor.annotations) {
      const isSelected = ann.id === this._selectedId;
      this._renderAnnotation(ctx, viewport, ann, isSelected);
    }
  }

  _renderAnnotation(ctx, viewport, ann, isSelected) {
    if (ann.type === 'dimension') {
      this._renderDimension(ctx, viewport, ann, isSelected);
    } else if (ann.type === 'note') {
      this._renderNote(ctx, viewport, ann, isSelected);
    } else if (ann.type === 'elevation') {
      this._renderElevation(ctx, viewport, ann, isSelected);
    }
  }

  /**
   * Render a dimension annotation between two points.
   * Shows extension lines, dimension line with arrows, and text.
   */
  _renderDimension(ctx, viewport, ann, isSelected) {
    if (ann.points.length < 2) return;

    const p1 = ann.points[0];
    const p2 = ann.points[1];
    const s1 = viewport.worldToScreen(p1.x, p1.y);
    const s2 = viewport.worldToScreen(p2.x, p2.y);

    const color = isSelected ? this.selectedColor : this.dimColor;

    // Direction and normal
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < 0.001) return;

    const dirX = dx / dist;
    const dirY = dy / dist;
    const normX = -dirY;
    const normY = dirX;

    // Offset the dimension line away from the measured line
    const offsetDist = 15; // screen pixels
    const ox = normX * offsetDist;
    const oy = normY * offsetDist;

    ctx.save();
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = isSelected ? 1.5 : 1;

    // Extension lines
    ctx.beginPath();
    ctx.moveTo(s1.x, s1.y);
    ctx.lineTo(s1.x + ox * 1.3, s1.y + oy * 1.3);
    ctx.moveTo(s2.x, s2.y);
    ctx.lineTo(s2.x + ox * 1.3, s2.y + oy * 1.3);
    ctx.stroke();

    // Dimension line
    const d1x = s1.x + ox;
    const d1y = s1.y + oy;
    const d2x = s2.x + ox;
    const d2y = s2.y + oy;

    ctx.beginPath();
    ctx.moveTo(d1x, d1y);
    ctx.lineTo(d2x, d2y);
    ctx.stroke();

    // Arrowheads
    const arrowSize = 6;
    const adx = (s2.x - s1.x) / Math.sqrt((s2.x - s1.x) ** 2 + (s2.y - s1.y) ** 2);
    const ady = (s2.y - s1.y) / Math.sqrt((s2.x - s1.x) ** 2 + (s2.y - s1.y) ** 2);

    // Arrow at start (pointing outward)
    this._drawArrow(ctx, d1x, d1y, -adx, -ady, arrowSize);
    // Arrow at end (pointing outward)
    this._drawArrow(ctx, d2x, d2y, adx, ady, arrowSize);

    // Text
    const value = ann.value ?? dist;
    const label = Units.format(value, 'm', 2);
    const midX = (d1x + d2x) / 2;
    const midY = (d1y + d2y) / 2;

    // Rotate text to align with dimension line
    const textAngle = Math.atan2(s2.y - s1.y, s2.x - s1.x);
    // Flip if text would be upside down
    const flipAngle = (textAngle > Math.PI / 2 || textAngle < -Math.PI / 2) ? textAngle + Math.PI : textAngle;

    ctx.save();
    ctx.translate(midX, midY);
    ctx.rotate(flipAngle);
    ctx.font = `${isSelected ? 12 : 11}px -apple-system, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';

    // Background
    const metrics = ctx.measureText(label);
    const pad = 3;
    ctx.fillStyle = 'rgba(26, 26, 46, 0.85)';
    ctx.fillRect(-metrics.width / 2 - pad, -14 - pad, metrics.width + pad * 2, 14 + pad);

    ctx.fillStyle = color;
    ctx.fillText(label, 0, -4);
    ctx.restore();

    ctx.restore();
  }

  _drawArrow(ctx, x, y, dx, dy, size) {
    const px = -dy;
    const py = dx;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x - dx * size + px * size * 0.4, y - dy * size + py * size * 0.4);
    ctx.lineTo(x - dx * size - px * size * 0.4, y - dy * size - py * size * 0.4);
    ctx.closePath();
    ctx.fill();
  }

  /**
   * Render a note annotation.
   */
  _renderNote(ctx, viewport, ann, isSelected) {
    if (ann.points.length < 1) return;

    const p = ann.points[0];
    const sp = viewport.worldToScreen(p.x, p.y);
    const color = isSelected ? this.selectedColor : this.noteColor;

    ctx.save();

    // Marker dot
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(sp.x, sp.y, 4, 0, Math.PI * 2);
    ctx.fill();

    // Text
    if (ann.text) {
      ctx.font = '12px -apple-system, sans-serif';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'bottom';

      const metrics = ctx.measureText(ann.text);
      ctx.fillStyle = 'rgba(26, 26, 46, 0.85)';
      ctx.fillRect(sp.x + 8 - 2, sp.y - 16, metrics.width + 8, 18);

      ctx.fillStyle = color;
      ctx.fillText(ann.text, sp.x + 10, sp.y - 2);
    }

    ctx.restore();
  }

  /**
   * Render an elevation marker.
   */
  _renderElevation(ctx, viewport, ann, isSelected) {
    if (ann.points.length < 1) return;

    const p = ann.points[0];
    const sp = viewport.worldToScreen(p.x, p.y);
    const color = isSelected ? this.selectedColor : this.dimColor;
    const value = ann.value ?? 0;
    const label = `${value >= 0 ? '+' : ''}${value.toFixed(2)}`;

    ctx.save();

    // Triangle marker
    const size = 8;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(sp.x, sp.y);
    ctx.lineTo(sp.x - size, sp.y + size);
    ctx.lineTo(sp.x + size, sp.y + size);
    ctx.closePath();
    ctx.fill();

    // Text below
    ctx.font = '11px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillStyle = color;
    ctx.fillText(label, sp.x, sp.y + size + 4);

    ctx.restore();
  }
}
