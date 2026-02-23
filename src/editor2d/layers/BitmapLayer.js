/**
 * BitmapLayer — Renders the scanned blueprint image on the bitmap canvas.
 */
export class BitmapLayer {
  constructor(eventBus) {
    this.eventBus = eventBus;
    this.image = null;
    this.opacity = 0.6;
    this.visible = true;
  }

  /**
   * Set the bitmap image to display.
   * @param {{ image: HTMLImageElement, width: number, height: number }} bitmapData
   */
  setImage(bitmapData) {
    this.image = bitmapData;
    this.eventBus.emit('layer:bitmap:changed');
  }

  /**
   * Clear the bitmap.
   */
  clearImage() {
    this.image = null;
    this.eventBus.emit('layer:bitmap:changed');
  }

  /**
   * Render the bitmap.
   * @param {CanvasRenderingContext2D} ctx
   * @param {Viewport2D} viewport
   */
  render(ctx, viewport) {
    if (!this.visible || !this.image) return;

    ctx.save();
    ctx.globalAlpha = this.opacity;

    // Apply world transform — the bitmap is drawn in world coordinates
    // where 1 unit = 1 pixel of the image (before scale calibration)
    viewport.applyWorldTransform(ctx);

    ctx.drawImage(this.image.image, 0, 0, this.image.width, this.image.height);

    ctx.restore();
  }

  /**
   * Get the bounds of the loaded bitmap in world coordinates.
   */
  getBounds() {
    if (!this.image) return null;
    return {
      minX: 0,
      minY: 0,
      maxX: this.image.width,
      maxY: this.image.height,
    };
  }
}
