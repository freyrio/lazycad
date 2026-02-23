/**
 * ImageLoader — Load PNG/JPG images as bitmaps for the viewport.
 */
export class ImageLoader {
  /**
   * Load an image from a File object.
   * @param {File} file
   * @returns {Promise<{image: HTMLImageElement, url: string, width: number, height: number}>}
   */
  static async fromFile(file) {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        resolve({
          image: img,
          url,
          width: img.naturalWidth,
          height: img.naturalHeight,
          fileName: file.name,
        });
      };
      img.onerror = () => reject(new Error(`Failed to load image: ${file.name}`));
      img.src = url;
    });
  }

  /**
   * Load an image from a URL.
   * @param {string} url
   * @returns {Promise<{image: HTMLImageElement, url: string, width: number, height: number}>}
   */
  static async fromURL(url) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        resolve({
          image: img,
          url,
          width: img.naturalWidth,
          height: img.naturalHeight,
        });
      };
      img.onerror = () => reject(new Error(`Failed to load image: ${url}`));
      img.src = url;
    });
  }

  /**
   * Load an image from a data URL (base64).
   * @param {string} dataUrl
   * @returns {Promise<{image: HTMLImageElement, url: string, width: number, height: number}>}
   */
  static async fromDataURL(dataUrl) {
    return ImageLoader.fromURL(dataUrl);
  }
}
