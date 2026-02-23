/**
 * Screenshot — Capture 2D or 3D viewport as PNG image.
 */

export class Screenshot {
  /**
   * Capture the 2D viewport by compositing all canvas layers.
   * @param {HTMLElement} viewportContainer - #viewport-2d
   * @param {string} [fileName]
   */
  static capture2D(viewportContainer, fileName = 'floorplan.png') {
    const canvases = viewportContainer.querySelectorAll('canvas');
    if (canvases.length === 0) return;

    // Use the first canvas dimensions as reference
    const w = canvases[0].width;
    const h = canvases[0].height;

    const compositeCanvas = document.createElement('canvas');
    compositeCanvas.width = w;
    compositeCanvas.height = h;
    const ctx = compositeCanvas.getContext('2d');

    // White background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, w, h);

    // Composite all layers (bitmap, grid, vectors, interaction)
    for (const canvas of canvases) {
      ctx.drawImage(canvas, 0, 0);
    }

    // Download
    compositeCanvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      a.click();
      URL.revokeObjectURL(url);
    }, 'image/png');
  }

  /**
   * Capture the 3D viewport from a Babylon canvas.
   * @param {HTMLCanvasElement} canvas - #canvas-3d
   * @param {string} [fileName]
   */
  static capture3D(canvas, fileName = 'render.png') {
    canvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      a.click();
      URL.revokeObjectURL(url);
    }, 'image/png');
  }
}
