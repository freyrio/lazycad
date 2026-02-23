/**
 * OpeningCSG — Visual opening representation on wall meshes.
 * Since CSG is not in the base Babylon CDN, we create opening visuals
 * as separate meshes (glass panes for windows, frame outlines for doors)
 * rather than boolean-subtracting from walls.
 */
/* global BABYLON */

export class OpeningCSG {
  constructor(scene, materials) {
    this._scene = scene;
    this._materials = materials;
  }

  /**
   * Create visual representations for openings on a wall.
   * Returns the original wall mesh plus additional opening visuals as children.
   * @param {BABYLON.Mesh} wallMesh - The wall mesh (unchanged)
   * @param {Wall} wall - The wall data
   * @param {Opening[]} openings - Openings on this wall
   * @param {number} wallHeight - Wall height in meters
   * @param {number} elevation - Base elevation
   * @returns {BABYLON.Mesh} - The wall mesh with opening children
   */
  subtractOpenings(wallMesh, wall, openings, wallHeight, elevation) {
    for (const opening of openings) {
      const posData = wall.pointAtDistance(opening.position);
      if (!posData) continue;

      const center = posData.point;
      const dir = posData.direction;
      const angle = Math.atan2(dir.y, dir.x);
      const sillHeight = opening.sillHeight || 0;

      if (opening.type === 'window') {
        // Glass pane
        const glass = BABYLON.MeshBuilder.CreatePlane(
          `glass_${opening.id}`,
          { width: opening.width * 0.95, height: opening.height * 0.95 },
          this._scene
        );
        glass.position = new BABYLON.Vector3(
          center.x,
          elevation + sillHeight + opening.height / 2,
          center.y
        );
        glass.rotation.y = -angle + Math.PI / 2;
        glass.material = this._materials.get('glass');
        glass.parent = wallMesh;

        // Window frame (thin box around the glass)
        const frame = BABYLON.MeshBuilder.CreateBox(
          `frame_${opening.id}`,
          {
            width: opening.width,
            height: opening.height,
            depth: wall.thickness * 0.3,
          },
          this._scene
        );
        frame.position = new BABYLON.Vector3(
          center.x,
          elevation + sillHeight + opening.height / 2,
          center.y
        );
        frame.rotation.y = -angle;
        frame.material = this._materials.get('glass');
        frame.parent = wallMesh;
      } else if (opening.type === 'door') {
        // Door panel (a thin box)
        const door = BABYLON.MeshBuilder.CreateBox(
          `door_${opening.id}`,
          {
            width: opening.width * 0.95,
            height: opening.height * 0.95,
            depth: 0.04,
          },
          this._scene
        );
        door.position = new BABYLON.Vector3(
          center.x,
          elevation + opening.height / 2,
          center.y
        );
        door.rotation.y = -angle;
        door.material = this._materials.get('doorframe');
        door.parent = wallMesh;
      }
    }

    return wallMesh;
  }
}
