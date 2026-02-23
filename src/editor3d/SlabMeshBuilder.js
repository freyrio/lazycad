/**
 * SlabMeshBuilder — Generate floor slab and room floor meshes.
 * Uses only basic Babylon primitives (CreateBox, CreateGround) to avoid
 * earcut dependency required by ExtrudePolygon.
 */
/* global BABYLON */

export class SlabMeshBuilder {
  constructor(scene, materials) {
    this._scene = scene;
    this._materials = materials;
  }

  /**
   * Build a floor slab from the bounding box of all walls on a floor.
   * @param {Floor} floor
   * @param {number} elevation - Base of slab
   * @param {number} thickness - Slab thickness
   * @returns {BABYLON.Mesh|null}
   */
  build(floor, elevation, thickness) {
    if (floor.walls.length === 0) return null;

    // Collect all wall endpoints for bounding area
    const allPoints = [];
    for (const wall of floor.walls) {
      for (const p of wall.points) {
        allPoints.push({ x: p.x, y: p.y });
      }
    }

    if (allPoints.length < 2) return null;

    // Build slab as bounding box of all wall points
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const p of allPoints) {
      minX = Math.min(minX, p.x);
      minY = Math.min(minY, p.y);
      maxX = Math.max(maxX, p.x);
      maxY = Math.max(maxY, p.y);
    }

    const margin = 0.5;
    const width = maxX - minX + margin * 2;
    const depth = maxY - minY + margin * 2;
    const cx = (minX + maxX) / 2;
    const cy = (minY + maxY) / 2;

    const slab = BABYLON.MeshBuilder.CreateBox('floor_slab', {
      width: width,
      height: thickness,
      depth: depth,
    }, this._scene);

    slab.position = new BABYLON.Vector3(cx, elevation + thickness / 2, cy);
    slab.material = this._materials.get('slab');
    slab.metadata = { type: 'slab' };
    return slab;
  }

  /**
   * Build a thin floor mesh for a room polygon.
   * Uses a bounding box approach to avoid earcut dependency.
   */
  buildRoomFloor(room, elevation, materials) {
    if (!room.polygon || room.polygon.length < 3) return null;

    // Compute bounding box of the room polygon
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const p of room.polygon) {
      minX = Math.min(minX, p.x);
      minY = Math.min(minY, p.y);
      maxX = Math.max(maxX, p.x);
      maxY = Math.max(maxY, p.y);
    }

    const width = maxX - minX;
    const depth = maxY - minY;
    if (width < 0.01 || depth < 0.01) return null;

    const cx = (minX + maxX) / 2;
    const cy = (minY + maxY) / 2;
    const floorThickness = 0.01;

    const mesh = BABYLON.MeshBuilder.CreateBox(
      `room_floor_${room.id}`,
      { width, height: floorThickness, depth },
      this._scene
    );

    mesh.position = new BABYLON.Vector3(cx, elevation + floorThickness / 2, cy);
    mesh.material = materials.getFloorMaterial(room.floorMaterial);
    mesh.metadata = { type: 'room_floor', roomId: room.id };
    return mesh;
  }
}
