/**
 * PDFRenderer — Load PDF pages as bitmap images using pdf.js.
 * Requires pdfjsLib to be available (loaded from CDN).
 */
/* global pdfjsLib */

export class PDFRenderer {
  /**
   * Check if pdf.js is available.
   */
  static isAvailable() {
    return typeof pdfjsLib !== 'undefined';
  }

  /**
   * Load a PDF file and render a specific page as an image.
   * @param {File} file - The PDF file
   * @param {number} [pageNum=1] - Page number (1-indexed)
   * @param {number} [scale=2] - Render scale for quality
   * @returns {Promise<{image: HTMLImageElement, url: string, width: number, height: number, pageCount: number}>}
   */
  static async renderPage(file, pageNum = 1, scale = 2) {
    if (!PDFRenderer.isAvailable()) {
      throw new Error('PDF.js library not loaded');
    }

    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const page = await pdf.getPage(pageNum);

    const viewport = page.getViewport({ scale });
    const canvas = document.createElement('canvas');
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext('2d');

    await page.render({ canvasContext: ctx, viewport }).promise;

    // Convert canvas to image
    const dataUrl = canvas.toDataURL('image/png');
    const image = new Image();
    await new Promise((resolve, reject) => {
      image.onload = resolve;
      image.onerror = reject;
      image.src = dataUrl;
    });

    return {
      image,
      url: dataUrl,
      width: canvas.width,
      height: canvas.height,
      pageCount: pdf.numPages,
    };
  }

  /**
   * Get the number of pages in a PDF file.
   */
  static async getPageCount(file) {
    if (!PDFRenderer.isAvailable()) return 0;

    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    return pdf.numPages;
  }
}
