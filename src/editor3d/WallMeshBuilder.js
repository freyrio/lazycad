/**
 * WallMeshBuilder — Extrude 2D wall outlines into 3D meshes.
 */
/* global BABYLON */

export class WallMeshBuilder {
  constructor(scene, materials) {
    this._scene = scene;
    this._materials = materials;
  }

  /**
   * Build a 3D wall mesh from a Wall entity.
   * @param {Wall} wall
   * @param {number} height - Wall height in meters
   * @param {number} elevation - Base elevation in meters
   * @returns {BABYLON.Mesh|null}
   */
  build(wall, height, elevation) {
    const outline = wall.getOutlinePolygon();
    if (outline.length < 3) return null;

    // Build the extruded shape
    // Convert 2D outline points to Babylon Vector3 path (XZ plane, Y is up)
    const shape = outline.map(p => new BABYLON.Vector3(p.x, 0, p.y));

    // Create the mesh using ExtrudePolygon
    try {
      const mesh = BABYLON.MeshBuilder.ExtrudePolygon(
        `wall_${wall.id}`,
        {
          shape: shape,
          depth: height,
          sideOrientation: BABYLON.Mesh.DOUBLESIDE,
        },
        this._scene
      );

      // Position: ExtrudePolygon extrudes downward by default, so we place it at top and it goes down
      mesh.position.y = elevation + height;

      // Apply material based on wall material
      mesh.material = this._materials.get(wall.material || 'concrete');

      mesh.metadata = { type: 'wall', wallId: wall.id };
      return mesh;
    } catch (e) {
      // Fallback: build as a simple box per segment
      return this._buildFallback(wall, height, elevation);
    }
  }

  /**
   * Fallback: build wall as a series of boxes for each segment.
   */
  _buildFallback(wall, height, elevation) {
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

      box.position = new BABYLON.Vector3(midX, elevation + height / 2, midY);
      box.rotation.y = -angle;
      box.material = this._materials.get(wall.material || 'concrete');

      meshes.push(box);
    }

    if (meshes.length === 0) return null;

    if (meshes.length === 1) {
      meshes[0].metadata = { type: 'wall', wallId: wall.id };
      return meshes[0];
    }

    // Merge into single mesh
    const merged = BABYLON.Mesh.MergeMeshes(meshes, true, true, undefined, false, true);
    if (merged) {
      merged.name = `wall_${wall.id}`;
      merged.material = this._materials.get(wall.material || 'concrete');
      merged.metadata = { type: 'wall', wallId: wall.id };
    }
    return merged;
  }
}
