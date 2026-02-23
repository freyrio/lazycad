/**
 * CursorLayer — Crosshair, tool preview, snap indicators, magnifier loupe
 * on the interaction canvas.
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

    // Calibration
    this.calibrationPoints = []; // [{x,y}, ...] placed calibration markers
    this.loupe = null; // { screenX, screenY, worldX, worldY, radius, zoom, offsetX, offsetY }
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

    // Draw calibration markers
    if (this.calibrationPoints.length > 0) {
      for (let i = 0; i < this.calibrationPoints.length; i++) {
        const cp = this.calibrationPoints[i];
        const sp = viewport.worldToScreen(cp.x, cp.y);
        const r = 8;

        // Crosshair marker
        ctx.strokeStyle = '#e94560';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(sp.x - r, sp.y);
        ctx.lineTo(sp.x + r, sp.y);
        ctx.moveTo(sp.x, sp.y - r);
        ctx.lineTo(sp.x, sp.y + r);
        ctx.stroke();

        // Circle
        ctx.beginPath();
        ctx.arc(sp.x, sp.y, r, 0, Math.PI * 2);
        ctx.stroke();

        // Label
        ctx.font = '11px -apple-system, sans-serif';
        ctx.fillStyle = '#e94560';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'bottom';
        ctx.fillText(`P${i + 1}`, sp.x + r + 4, sp.y - 4);
      }

      // Line between calibration points
      if (this.calibrationPoints.length === 2) {
        const p1 = viewport.worldToScreen(this.calibrationPoints[0].x, this.calibrationPoints[0].y);
        const p2 = viewport.worldToScreen(this.calibrationPoints[1].x, this.calibrationPoints[1].y);
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.strokeStyle = '#e94560';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([6, 4]);
        ctx.stroke();
        ctx.setLineDash([]);
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

    // Draw magnifier loupe
    if (this.loupe) {
      this._renderLoupe(ctx, viewport);
    }

    ctx.restore();
  }

  /**
   * Render the magnifier loupe above the user's finger/cursor.
   */
  _renderLoupe(ctx, viewport) {
    const l = this.loupe;
    const r = l.radius;

    // Position loupe above the cursor (offset to not cover finger)
    let lx = l.screenX + l.offsetX;
    let ly = l.screenY + l.offsetY;

    // Clamp to viewport bounds
    lx = Math.max(r + 4, Math.min(viewport.width - r - 4, lx));
    ly = Math.max(r + 4, Math.min(viewport.height - r - 4, ly));

    ctx.save();

    // Clip to circle
    ctx.beginPath();
    ctx.arc(lx, ly, r, 0, Math.PI * 2);
    ctx.clip();

    // Dark background
    ctx.fillStyle = 'rgba(26, 26, 46, 0.95)';
    ctx.fillRect(lx - r, ly - r, r * 2, r * 2);

    // Draw magnified view: map the world area around the cursor
    // We want to show the viewport content at higher zoom around cursor position
    const zoomScale = viewport.scale * l.zoom;
    ctx.save();
    ctx.translate(lx, ly);
    ctx.scale(l.zoom, l.zoom);
    ctx.translate(-l.screenX, -l.screenY);

    // Draw a mini grid for reference
    const gridSpacing = 10 / zoomScale; // adaptive grid
    const visR = r / l.zoom;
    const worldCX = l.worldX;
    const worldCY = l.worldY;
    const startX = Math.floor((worldCX - visR / viewport.scale) / gridSpacing) * gridSpacing;
    const endX = Math.ceil((worldCX + visR / viewport.scale) / gridSpacing) * gridSpacing;
    const startY = Math.floor((worldCY - visR / viewport.scale) / gridSpacing) * gridSpacing;
    const endY = Math.ceil((worldCY + visR / viewport.scale) / gridSpacing) * gridSpacing;

    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.lineWidth = 0.5 / l.zoom;
    for (let x = startX; x <= endX; x += gridSpacing) {
      const sx = viewport.worldToScreen(x, 0);
      ctx.beginPath();
      ctx.moveTo(sx.x, ly / l.zoom + (l.screenY - ly) / l.zoom - r / l.zoom);
      ctx.lineTo(sx.x, ly / l.zoom + (l.screenY - ly) / l.zoom + r / l.zoom);
      ctx.stroke();
    }
    for (let y = startY; y <= endY; y += gridSpacing) {
      const sy = viewport.worldToScreen(0, y);
      ctx.beginPath();
      ctx.moveTo(lx / l.zoom + (l.screenX - lx) / l.zoom - r / l.zoom, sy.y);
      ctx.lineTo(lx / l.zoom + (l.screenX - lx) / l.zoom + r / l.zoom, sy.y);
      ctx.stroke();
    }

    ctx.restore();

    // Crosshair in the center of loupe
    ctx.strokeStyle = '#e94560';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(lx - 12, ly);
    ctx.lineTo(lx - 4, ly);
    ctx.moveTo(lx + 4, ly);
    ctx.lineTo(lx + 12, ly);
    ctx.moveTo(lx, ly - 12);
    ctx.lineTo(lx, ly - 4);
    ctx.moveTo(lx, ly + 4);
    ctx.lineTo(lx, ly + 12);
    ctx.stroke();

    // Border
    ctx.beginPath();
    ctx.arc(lx, ly, r, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(233, 69, 96, 0.8)';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Outer glow
    ctx.beginPath();
    ctx.arc(lx, ly, r + 1, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(233, 69, 96, 0.3)';
    ctx.lineWidth = 3;
    ctx.stroke();

    ctx.restore();
  }
}
