/**
 * WallMeshBuilder — Build 3D wall meshes using only basic Babylon primitives.
 * Avoids ExtrudePolygon (requires earcut) — builds walls as boxes per segment.
 */
/* global BABYLON */

export class WallMeshBuilder {
  constructor(scene, materials) {
    this._scene = scene;
    this._materials = materials;
  }

  /**
   * Build a 3D wall mesh from a Wall entity.
   * Uses one box per wall segment, positioned and rotated to match.
   * @param {Wall} wall
   * @param {number} height - Wall height in meters
   * @param {number} elevation - Base elevation in meters
   * @returns {BABYLON.Mesh|null}
   */
  build(wall, height, elevation) {
    const points = wall.points;
    if (points.length < 2) return null;

    const meshes = [];
    for (let i = 0; i < points.length - 1; i++) {
      const p1 = points[i];
      const p2 = points[i + 1];
      const dx = p2.x - p1.x;
      const dy = p2.y - p1.y;
      const length = Math.sqrt(dx * dx + dy * dy);
      if (length < 0.001) continue;

      const angle = Math.atan2(dy, dx);
      const midX = (p1.x + p2.x) / 2;
      const midY = (p1.y + p2.y) / 2;

      const box = BABYLON.MeshBuilder.CreateBox(
        `wall_seg_${wall.id}_${i}`,
        {
          width: length,
          height: height,
          depth: wall.thickness,
        },
        this._scene
      );

      // Y is up in Babylon. 2D x maps to 3D x, 2D y maps to 3D z.
      box.position = new BABYLON.Vector3(midX, elevation + height / 2, midY);
      box.rotation.y = -angle;
      box.material = this._materials.get(wall.material || 'concrete');

      meshes.push(box);
    }

    if (meshes.length === 0) return null;

    if (meshes.length === 1) {
      meshes[0].name = `wall_${wall.id}`;
      meshes[0].metadata = { type: 'wall', wallId: wall.id };
      return meshes[0];
    }

    // Merge segments into a single mesh
    const merged = BABYLON.Mesh.MergeMeshes(meshes, true, true, undefined, false, true);
    if (merged) {
      merged.name = `wall_${wall.id}`;
      merged.material = this._materials.get(wall.material || 'concrete');
      merged.metadata = { type: 'wall', wallId: wall.id };
    }
    return merged;
  }
}
