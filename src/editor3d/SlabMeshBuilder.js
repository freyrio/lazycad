/**
 * SlabMeshBuilder — Generate floor slab and room floor meshes.
 */
/* global BABYLON */

export class SlabMeshBuilder {
  constructor(scene, materials) {
    this._scene = scene;
    this._materials = materials;
  }

  /**
   * Build a floor slab from the convex hull of all walls on a floor.
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

    if (allPoints.length < 3) return null;

    // Compute convex hull for slab boundary
    const hull = this._convexHull(allPoints);
    if (hull.length < 3) return null;

    // Expand hull slightly (0.5m margin)
    const expandedHull = this._expandPolygon(hull, 0.5);

    // Create extruded polygon
    const shape = expandedHull.map(p => new BABYLON.Vector3(p.x, 0, p.y));

    try {
      const slab = BABYLON.MeshBuilder.ExtrudePolygon(
        'floor_slab',
        {
          shape: shape,
          depth: thickness,
          sideOrientation: BABYLON.Mesh.DOUBLESIDE,
        },
        this._scene
      );

      slab.position.y = elevation + thickness;
      slab.material = this._materials.get('slab');
      slab.metadata = { type: 'slab' };
      return slab;
    } catch (e) {
      // Fallback: simple box
      return this._buildFallbackSlab(allPoints, elevation, thickness);
    }
  }

  /**
   * Fallback: build slab as a bounding box.
   */
  _buildFallbackSlab(points, elevation, thickness) {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const p of points) {
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
   */
  buildRoomFloor(room, elevation, materials) {
    if (room.polygon.length < 3) return null;

    const shape = room.polygon.map(p => new BABYLON.Vector3(p.x, 0, p.y));
    const floorThickness = 0.01; // Very thin

    try {
      const mesh = BABYLON.MeshBuilder.ExtrudePolygon(
        `room_floor_${room.id}`,
        {
          shape: shape,
          depth: floorThickness,
          sideOrientation: BABYLON.Mesh.DOUBLESIDE,
        },
        this._scene
      );

      mesh.position.y = elevation + floorThickness;
      mesh.material = materials.getFloorMaterial(room.floorMaterial);
      mesh.metadata = { type: 'room_floor', roomId: room.id };
      return mesh;
    } catch (e) {
      return null;
    }
  }

  /**
   * Compute convex hull using Graham scan.
   */
  _convexHull(points) {
    if (points.length < 3) return [...points];

    // Find bottom-most point (and leftmost if tie)
    let pivot = points[0];
    for (const p of points) {
      if (p.y < pivot.y || (p.y === pivot.y && p.x < pivot.x)) {
        pivot = p;
      }
    }

    // Sort by polar angle
    const sorted = points
      .filter(p => p !== pivot)
      .sort((a, b) => {
        const angleA = Math.atan2(a.y - pivot.y, a.x - pivot.x);
        const angleB = Math.atan2(b.y - pivot.y, b.x - pivot.x);
        if (Math.abs(angleA - angleB) < 1e-10) {
          const distA = (a.x - pivot.x) ** 2 + (a.y - pivot.y) ** 2;
          const distB = (b.x - pivot.x) ** 2 + (b.y - pivot.y) ** 2;
          return distA - distB;
        }
        return angleA - angleB;
      });

    const hull = [pivot];
    for (const p of sorted) {
      while (hull.length >= 2) {
        const a = hull[hull.length - 2];
        const b = hull[hull.length - 1];
        const cross = (b.x - a.x) * (p.y - a.y) - (b.y - a.y) * (p.x - a.x);
        if (cross <= 0) {
          hull.pop();
        } else {
          break;
        }
      }
      hull.push(p);
    }

    return hull;
  }

  /**
   * Expand a polygon outward by a margin.
   */
  _expandPolygon(polygon, margin) {
    const centroid = { x: 0, y: 0 };
    for (const p of polygon) {
      centroid.x += p.x;
      centroid.y += p.y;
    }
    centroid.x /= polygon.length;
    centroid.y /= polygon.length;

    return polygon.map(p => {
      const dx = p.x - centroid.x;
      const dy = p.y - centroid.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 0.001) return { ...p };
      const factor = (dist + margin) / dist;
      return {
        x: centroid.x + dx * factor,
        y: centroid.y + dy * factor,
      };
    });
  }
}
