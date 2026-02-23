/**
 * SnapLayer — Visual feedback for active snapping.
 * Drawn on the interaction canvas alongside the cursor layer.
 */
export class SnapLayer {
  constructor(eventBus) {
    this.eventBus = eventBus;
    this.visible = true;
    this.snapGuides = []; // Array of guide lines to draw
  }

  /**
   * Set current snap guides.
   * @param {Array<{type: string, from: {x,y}, to: {x,y}}>} guides
   */
  setGuides(guides) {
    this.snapGuides = guides;
  }

  clearGuides() {
    this.snapGuides = [];
  }

  /**
   * Render snap guide lines.
   * @param {CanvasRenderingContext2D} ctx
   * @param {Viewport2D} viewport
   */
  render(ctx, viewport) {
    if (!this.visible || this.snapGuides.length === 0) return;

    ctx.save();

    for (const guide of this.snapGuides) {
      const from = viewport.worldToScreen(guide.from.x, guide.from.y);
      const to = viewport.worldToScreen(guide.to.x, guide.to.y);

      ctx.beginPath();
      ctx.moveTo(from.x, from.y);
      ctx.lineTo(to.x, to.y);

      switch (guide.type) {
        case 'angle':
          ctx.strokeStyle = 'rgba(255, 215, 0, 0.4)';
          ctx.setLineDash([3, 6]);
          break;
        case 'grid':
          ctx.strokeStyle = 'rgba(100, 200, 255, 0.3)';
          ctx.setLineDash([2, 4]);
          break;
        case 'endpoint':
          ctx.strokeStyle = 'rgba(255, 100, 100, 0.5)';
          ctx.setLineDash([4, 4]);
          break;
        default:
          ctx.strokeStyle = 'rgba(255, 215, 0, 0.3)';
          ctx.setLineDash([3, 6]);
      }

      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.setLineDash([]);
    }

    ctx.restore();
  }
}
