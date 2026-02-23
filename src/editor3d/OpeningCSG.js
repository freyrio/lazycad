/**
 * OpeningCSG — Subtract door/window openings from wall meshes.
 * Uses Babylon.js CSG (Constructive Solid Geometry).
 */
/* global BABYLON */

export class OpeningCSG {
  constructor(scene, materials) {
    this._scene = scene;
    this._materials = materials;
  }

  /**
   * Subtract openings from a wall mesh.
   * @param {BABYLON.Mesh} wallMesh - The wall mesh to modify
   * @param {Wall} wall - The wall data
   * @param {Opening[]} openings - Openings on this wall
   * @param {number} wallHeight - Wall height in meters
   * @param {number} elevation - Base elevation
   * @returns {BABYLON.Mesh} - The wall mesh with openings cut out
   */
  subtractOpenings(wallMesh, wall, openings, wallHeight, elevation) {
    let currentCSG = BABYLON.CSG.FromMesh(wallMesh);
    const glassMeshes = [];

    for (const opening of openings) {
      const posData = wall.pointAtDistance(opening.position);
      if (!posData) continue;

      const center = posData.point;
      const dir = posData.direction;

      // Create the cutting box
      const cutWidth = opening.width;
      const cutHeight = opening.height;
      const cutDepth = wall.thickness * 1.5; // Ensure it goes through
      const sillHeight = opening.sillHeight || 0;

      const cutBox = BABYLON.MeshBuilder.CreateBox(
        `cut_${opening.id}`,
        { width: cutWidth, height: cutHeight, depth: cutDepth },
        this._scene
      );

      // Position and rotate the cutting box
      const angle = Math.atan2(dir.y, dir.x);
      cutBox.position = new BABYLON.Vector3(
        center.x,
        elevation + sillHeight + cutHeight / 2,
        center.y
      );
      cutBox.rotation.y = -angle;

      // Subtract
      const cutCSG = BABYLON.CSG.FromMesh(cutBox);
      currentCSG = currentCSG.subtract(cutCSG);

      // Create glass pane for windows
      if (opening.type === 'window') {
        const glass = BABYLON.MeshBuilder.CreatePlane(
          `glass_${opening.id}`,
          { width: cutWidth * 0.95, height: cutHeight * 0.95 },
          this._scene
        );
        glass.position = new BABYLON.Vector3(
          center.x,
          elevation + sillHeight + cutHeight / 2,
          center.y
        );
        glass.rotation.y = -angle + Math.PI / 2;
        glass.material = this._materials.get('glass');
        glassMeshes.push(glass);
      }

      // Clean up the cutting box
      cutBox.dispose();
    }

    // Convert CSG back to mesh
    const resultMesh = currentCSG.toMesh(
      wallMesh.name,
      wallMesh.material,
      this._scene,
      true
    );
    resultMesh.metadata = wallMesh.metadata;

    // Dispose original wall mesh
    wallMesh.dispose();

    // If there are glass panes, merge them as children
    for (const glass of glassMeshes) {
      glass.parent = resultMesh;
    }

    return resultMesh;
  }
}
