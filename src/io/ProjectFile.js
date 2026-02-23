/**
 * ProjectFile — Save/load complete project bundles (.bpf.json).
 * Handles export as JSON with embedded bitmap data, and import with
 * bitmap restoration.
 */
import { Blueprint } from '../core/Blueprint.js';
import { ImageLoader } from './ImageLoader.js';

export class ProjectFile {
  /**
   * Export the blueprint as a downloadable .bpf.json file.
   * Embeds bitmaps as base64 data URLs for portability.
   * @param {Blueprint} blueprint
   */
  static async exportProject(blueprint) {
    const data = blueprint.toJSON();

    // Embed bitmap data URLs for each floor
    for (let i = 0; i < data.floors.length; i++) {
      const floor = blueprint.floors[i];
      if (floor.bitmap && floor.bitmap.image) {
        try {
          const dataUrl = ProjectFile._imageToDataURL(floor.bitmap.image);
          data.floors[i].bitmap = {
            dataUrl,
            width: floor.bitmap.width,
            height: floor.bitmap.height,
          };
        } catch (e) {
          // Can't convert (CORS issues etc.) — skip bitmap
          data.floors[i].bitmap = null;
        }
      }
    }

    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `${blueprint.name || 'project'}.bpf.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  /**
   * Import a .bpf.json file and restore the blueprint with bitmaps.
   * @param {File} file
   * @returns {Promise<Blueprint>}
   */
  static async importProject(file) {
    const text = await file.text();
    const data = JSON.parse(text);
    const blueprint = Blueprint.fromJSON(data);

    // Restore bitmaps from embedded data URLs
    for (let i = 0; i < data.floors.length; i++) {
      const floorData = data.floors[i];
      if (floorData.bitmap && floorData.bitmap.dataUrl) {
        try {
          const bitmapData = await ImageLoader.fromDataURL(floorData.bitmap.dataUrl);
          blueprint.floors[i].bitmap = {
            image: bitmapData.image,
            url: floorData.bitmap.dataUrl,
            width: bitmapData.width,
            height: bitmapData.height,
          };
        } catch (e) {
          blueprint.floors[i].bitmap = null;
        }
      }
    }

    return blueprint;
  }

  /**
   * Convert an HTMLImageElement to a data URL via canvas.
   */
  static _imageToDataURL(img) {
    const canvas = document.createElement('canvas');
    canvas.width = img.naturalWidth || img.width;
    canvas.height = img.naturalHeight || img.height;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0);
    return canvas.toDataURL('image/png');
  }
}
