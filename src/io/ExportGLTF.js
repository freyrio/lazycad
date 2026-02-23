/**
 * ExportGLTF — Export 3D model as glTF/GLB using Babylon.js serializer.
 * Requires babylonjs-serializers CDN to be loaded.
 */
/* global BABYLON */

export class ExportGLTF {
  /**
   * Export the current 3D scene as a GLB binary file.
   * @param {BABYLON.Scene} scene
   * @param {string} fileName
   * @returns {Promise<void>}
   */
  static async exportGLB(scene, fileName = 'model') {
    if (typeof BABYLON === 'undefined' || !BABYLON.GLTF2Export) {
      throw new Error('glTF exporter not loaded. Ensure babylonjs-serializers is included.');
    }

    const result = await BABYLON.GLTF2Export.GLBAsync(scene, fileName, {
      shouldExportNode: (node) => {
        // Export all meshes, skip internal cameras/lights
        return node instanceof BABYLON.AbstractMesh;
      },
    });

    // Trigger download
    result.downloadFiles();
  }

  /**
   * Export as glTF (separate .gltf + .bin files).
   */
  static async exportGLTF(scene, fileName = 'model') {
    if (typeof BABYLON === 'undefined' || !BABYLON.GLTF2Export) {
      throw new Error('glTF exporter not loaded. Ensure babylonjs-serializers is included.');
    }

    const result = await BABYLON.GLTF2Export.GLTFAsync(scene, fileName, {
      shouldExportNode: (node) => {
        return node instanceof BABYLON.AbstractMesh;
      },
    });

    result.downloadFiles();
  }

  /**
   * Check if the glTF exporter is available.
   */
  static isAvailable() {
    return typeof BABYLON !== 'undefined' && typeof BABYLON.GLTF2Export !== 'undefined';
  }
}
