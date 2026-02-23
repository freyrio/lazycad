/**
 * CursorLayer — Crosshair, tool preview, snap indicators on the interaction canvas.
 */
import { Units } from '../../utils/Units.js';

export class CursorLayer {
  constructor(eventBus) {
    this.eventBus = eventBus;
    this.visible = true;

    // Current cursor position in world coords
    this.worldX = 0;
    this.worldY = 0;
    this.screenX = 0;
    this.screenY = 0;
    this.showCrosshair = true;

    // Snap indicator
    this.snapPoint = null;  // { x, y, type }
    this.snapColor = '#ffd700';

    // Preview line (for wall drawing)
    this.previewLine = null; // { from: {x,y}, to: {x,y} }
    this.previewColor = 'rgba(79, 195, 247, 0.6)';

    // Preview points (in-progress polyline)
    this.previewPoints = []; // [{x,y}, ...]

    // Measurement display
    this.measureText = null;
  }

  /**
   * Update cursor position.
   */
  setCursor(screenX, screenY, worldX, worldY) {
    this.screenX = screenX;
    this.screenY = screenY;
    this.worldX = worldX;
    this.worldY = worldY;
  }

  /**
   * Render cursor and tool preview.
   * @param {CanvasRenderingContext2D} ctx
   * @param {Viewport2D} viewport
   */
  render(ctx, viewport) {
    if (!this.visible) return;

    ctx.save();

    // Draw preview polyline points
    if (this.previewPoints.length > 0) {
      ctx.beginPath();
      const first = viewport.worldToScreen(this.previewPoints[0].x, this.previewPoints[0].y);
      ctx.moveTo(first.x, first.y);

      for (let i = 1; i < this.previewPoints.length; i++) {
        const p = viewport.worldToScreen(this.previewPoints[i].x, this.previewPoints[i].y);
        ctx.lineTo(p.x, p.y);
      }

      ctx.strokeStyle = this.previewColor;
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 4]);
      ctx.stroke();
      ctx.setLineDash([]);

      // Draw dots at each point
      ctx.fillStyle = this.previewColor;
      for (const p of this.previewPoints) {
        const sp = viewport.worldToScreen(p.x, p.y);
        ctx.beginPath();
        ctx.arc(sp.x, sp.y, 4, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Draw preview line from last point to cursor
    if (this.previewLine) {
      const from = viewport.worldToScreen(this.previewLine.from.x, this.previewLine.from.y);
      const to = viewport.worldToScreen(this.previewLine.to.x, this.previewLine.to.y);

      ctx.beginPath();
      ctx.moveTo(from.x, from.y);
      ctx.lineTo(to.x, to.y);
      ctx.strokeStyle = this.previewColor;
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 4]);
      ctx.stroke();
      ctx.setLineDash([]);

      // Length label
      const dx = this.previewLine.to.x - this.previewLine.from.x;
      const dy = this.previewLine.to.y - this.previewLine.from.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > 0.01) {
        const midX = (from.x + to.x) / 2;
        const midY = (from.y + to.y) / 2;
        const label = Units.format(dist, 'm', 2);

        ctx.font = '12px -apple-system, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';

        // Background
        const metrics = ctx.measureText(label);
        const pad = 4;
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(
          midX - metrics.width / 2 - pad,
          midY - 18 - pad,
          metrics.width + pad * 2,
          16 + pad
        );

        ctx.fillStyle = '#ffffff';
        ctx.fillText(label, midX, midY - 10);
      }
    }

    // Draw snap point indicator
    if (this.snapPoint) {
      const sp = viewport.worldToScreen(this.snapPoint.x, this.snapPoint.y);

      ctx.strokeStyle = this.snapColor;
      ctx.lineWidth = 2;

      // Diamond shape for snap
      const size = 8;
      ctx.beginPath();
      ctx.moveTo(sp.x, sp.y - size);
      ctx.lineTo(sp.x + size, sp.y);
      ctx.lineTo(sp.x, sp.y + size);
      ctx.lineTo(sp.x - size, sp.y);
      ctx.closePath();
      ctx.stroke();

      // Small label
      if (this.snapPoint.type) {
        ctx.font = '10px -apple-system, sans-serif';
        ctx.fillStyle = this.snapColor;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'bottom';
        ctx.fillText(this.snapPoint.type, sp.x + 12, sp.y - 4);
      }
    }

    // Draw crosshair
    if (this.showCrosshair && this.screenX > 0) {
      const x = Math.round(this.screenX) + 0.5;
      const y = Math.round(this.screenY) + 0.5;

      ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
      ctx.lineWidth = 1;

      // Horizontal line
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(viewport.width, y);
      ctx.stroke();

      // Vertical line
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, viewport.height);
      ctx.stroke();

      // Coordinate readout near cursor
      const coordText = `${this.worldX.toFixed(2)}, ${this.worldY.toFixed(2)}`;
      ctx.font = '11px monospace';
      ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillText(coordText, this.screenX + 16, this.screenY + 16);
    }

    ctx.restore();
  }
}
